// Copyright or something.
'use strict';

function startsWith(str, start) {
  return str.slice(0, start.length) == start;
};

/**
 * Suggestions should implement this interface.
 */
function Suggestions() {
}

Suggestions.prototype.getURL = function() {
  throw new Error('Not implemented');
};

Suggestions.prototype.getSuggestions = function(query, response) {
  throw new Error('Not implemented');
};

Suggestions.prototype.shouldThrottle = function() {
  return false;
};

/**
 * Suggestions for codesearch.
 */
function CodesearchSuggestions() {
  this.__proto__.__proto__ = Suggestions.prototype;
}

CodesearchSuggestions.prototype.getURL = function(query) {
  return [
    'https://code.google.com/p/cs/codesearch/codesearch/json?',
    'suggest_request=b&',
    'query=', encodeURI(query), '+package%3Achromium&',
    'query_cursor_position=' + query.length, '&',
    'suggest_request=e'
    // Note: when invoking from cs.chromium.org there is also a "sid"
    // parameter, but I don't know how to generate it, nor does it appear
    // to matter if it's left out.
  ].join('');
};

CodesearchSuggestions.prototype.getSuggestions = function(query, response) {
  var suggestions = null;
  try {
    var response = JSON.parse(currentXhr.responseText);
    suggestions = response.suggest_response[0].suggestion;
    if (suggestions == null) {
      // No suggestions.
      return [];
    }
  } catch (e) {
    console.error('Invalid response: ' + currentXhr.responseText);
    return [];
  }

  suggestions.sort(function(s1, s2) {
    return s1.score < s2.score;
  });

  return suggestions.map(function(suggest) {
    var has_line = suggest.goto_line && suggest.goto_line > 1;

    // Construct the link that has been suggested.
    var href = [
      'https://code.google.com/p/chromium/codesearch#',
      suggest.goto_package_id, '/', suggest.goto_path, '&',
      'q=', encodeURI(query), '&',
      'sq=package:chromium&',
      has_line ? ('l=' + suggest.goto_line) : '',
    ].join('');

    // Simpler to always have a match_start/match_end.
    if (!('match_start' in suggest))
      suggest.match_start = 0;
    if (!('match_end' in suggest))
      suggest.match_end = suggest.title.length;

    return {
      content: href,
      description: [
        // Title, with the matching text in bold.
        suggest.title.slice(0, suggest.match_start),
        '<match>',
        suggest.title.slice(suggest.match_start, suggest.match_end),
        '</match>',
        suggest.title.slice(suggest.match_end),
        // Path for the query, complete with :42 for line 42, if applicable.
        // The "url" is a bit of a lie, but it looks nice.
        ' <url>',
        suggest.goto_path,
        has_line ? (':' + suggest.goto_line) : '',
        '</url>'
      ].join('')
    };
  });
};

/**
 * Suggestions for crbugs.
 */
function CrbugSuggestions() {
  this.__proto__.__proto__ = Suggestions.prototype;
}

CrbugSuggestions.prototype.getURL = function(query) {
  // The query separates spaces with +, but encodes each component.
  var encodedQuery = [];
  query.split(' ').forEach(function(component) {
    encodedQuery.push(encodeURI(component));
  });
  return [
    'https://code.google.com/p/chromium/issues/list?',
    'q=is:starred+', encodedQuery.join('+'), '&',
    'sort=-id&',
    'colspec=ID%20Pri%20M%20Iteration%20ReleaseBlock%20Cr%20Status%20Owner%20',
    'Summary%20OS%20Modified'
  ].join('');
};

CrbugSuggestions.prototype.getSuggestions = function(query, response) {
  // I would use DOMParser here but it crashes on this input for some reason.
  var dom = document.createElement('div');
  dom.innerHTML = response;

  var suggestions = []
  Array.prototype.forEach.call(
      dom.querySelectorAll('#resultstable tr:not(#headingrow)'),
      function(row) {
    // Bug# is column 0.
    var idElem = row.getElementsByClassName('col_0')[0];
    if (!idElem) return;
    var id = idElem.textContent.trim();

    // Owner is colum 7.
    var ownerElem = row.getElementsByClassName('col_7')[0];
    if (!ownerElem) return;
    var owner = ownerElem.textContent.trim();

    // The summary is column 8, except there are two column 8s and it's
    // the second of those.
    var summaryElem = row.getElementsByClassName('col_8')[1];
    if (!summaryElem) return;
    var summary = summaryElem.textContent.trim();

    suggestions.push({
      content: 'https://code.google.com/p/chromium/issues/detail?id=' + id,
      description: [
        '<match>', summary, '</match> ',
        '<dim>(', owner, ')</dim> ',
        '<url>crbug.com/', id, '</url>'
      ].join('')
    });
  });
  return suggestions;
};

CrbugSuggestions.prototype.shouldThrottle = function() {
  // Otherwise crbug will show captchas.
  return true;
};

/**
 * Suggestions for authors.
 */
function AuthorSuggestions() {
  this.__proto__.__proto__ = Suggestions.prototype;
}

AuthorSuggestions.prototype.getURL = function(query) {
  return 'https://code.google.com/p/chromium/feeds/issueOptions';
};

AuthorSuggestions.prototype.getSuggestions = function(query, response) {
  // |response| has the XSSI protection. Strip it.
  response = response.slice(response.indexOf('{'));

  var issueOptions = JSON.parse(response);
  if (!issueOptions)
    return [];

  var members = issueOptions.members;
  if (!members)
    return [];

  var suggestions = [];
  for (var i = 0; i < members.length; i++) {
    var member = members[i].name;
    var memberIndex = member.indexOf(query);
    if (memberIndex === 0) {
      suggestions.push({
        content: [
          'https://git.chromium.org/gitweb/?',
          'p=chromium.git&a=search&h=HEAD&st=author&s=',
          member
        ].join(''),
        description: [
          member.slice(0, memberIndex),
          '<match>', member.slice(memberIndex, query.length), '</match>',
          member.slice(memberIndex + query.length)
        ].join('')
      });
    }
  }
  return suggestions;
};

function codesearchQuery(query) {
  return [
    'https://code.google.com/p/chromium/codesearch#search/',
    '&q=', encodeURI(query),
    '&sq=package:chromium&type=cs'
  ].join('');
}

var currentXhr = null;
var throttleTimeout = undefined;

chrome.omnibox.onInputChanged.addListener(function(query, suggest) {
  var suggestions = new CodesearchSuggestions();

  // TODO: implement response caching if appropriate.
  // TODO: rev:12345, etc.
  var config = [
    ['author', AuthorSuggestions],
    ['bug', CrbugSuggestions],
  ];
  for (var i = 0; i < config.length; i++) {
    var key = config[i][0];
    if (startsWith(query, key + ':')) {
      query = query.slice(key.length + 1).trim();
      suggestions = new config[i][1];
      break;
    }
  }

  if (!query)
    return;

  var runQuery = function() {
    if (currentXhr)
      currentXhr.abort();
    currentXhr = new XMLHttpRequest();
    currentXhr.open('GET', suggestions.getURL(query), true);
    currentXhr.onload = function() {
      suggest(suggestions.getSuggestions(query, currentXhr.responseText));
      currentXhr = null;
    };
    currentXhr.send();
  };

  if (suggestions.shouldThrottle()) {
    // I guess that throttling == only searching if idle for > 1s.
    if (typeof(throttleTimeout) != 'undefined')
      clearTimeout(throttleTimeout);
    throttleTimeout = setTimeout(runQuery, 1000);
  } else {
    runQuery();
  }
});

chrome.omnibox.onInputEntered.addListener(function(query, disposition) {
  // It might be an absolute URL if it came from a suggest. Otherwise, treat
  // it as a codesearch query.
  if (!startsWith(query, 'https:'))
    query = codesearchQuery(query);

  var tabsFunction = chrome.tabs.create;
  var tabsOptions = {
    url: query
  };

  // Find the tabs API configuration depending on the disposition.
  switch (disposition) {
    case 'currentTab':
      tabsFunction = chrome.tabs.update;
    case 'newBackgroundTab':
      tabsOptions.active = false;
  }

  tabsFunction(tabsOptions);
});
