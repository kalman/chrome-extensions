// Copyright or something.

function startsWith(str, start) {
  return str.slice(0, start.length) == start;
};

/**
 * Suggestions should implement this interface.
 */
function Suggestions() {
}

Suggestions.prototype.getURL = function() {
  throw new Error();
};

Suggestions.prototype.getSuggestions = function(query, response) {
  throw new Error();
};

/**
 * Suggestions for codesearch.
 */
function CodesearchSuggestions() {
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
      'q=', query, '&',
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
}

CrbugSuggestions.prototype.getURL = function(query) {
  return [
    'https://code.google.com/p/chromium/issues/peek?',
    'id=', query
  ].join('');
};

CrbugSuggestions.prototype.getSuggestions = function(query, response) {
  var dom = new DOMParser().parseFromString(response, 'text/html');
  var titleElem = dom.querySelector('#issuesummary');
  if (!titleElem) {
    // No title element --> not a valid bug.
    return [];
  }
  var title = titleElem.textContent;

  var reporter = '(none)';
  var userElem = dom.querySelector('.author .userlink');
  if (userElem) {
    reporter = userElem.textContent;
  }

  return [{
    content: 'https://code.google.com/p/chromium/issues/detail?id=' + query,
    description: [
      '<match>', title, '</match> ',
      '<dim>[', reporter, ']</dim> ',
      '<url>crbug.com/', query, '</url>'
    ].join('')
  }];
};

/**
 * Suggestions for authors.
 */
function AuthorSuggestions() {
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

chrome.omnibox.onInputChanged.addListener(function(query, suggest) {
  if (currentXhr) {
    currentXhr.abort();
    currentXhr = null;
  }
  currentXhr = new XMLHttpRequest();

  // TODO: implement response caching if appropriate.
  // TODO: rev:12345, author:kalman, etc.
  var suggestions = {
    'author': AuthorSuggestions,
    'bug': CrbugSuggestions,
  };

  suggestObj = new CodesearchSuggestions();

  var suggestionKeys = Object.getOwnPropertyNames(suggestions);
  for (var i = 0; i < suggestionKeys.length; i++) {
    var key = suggestionKeys[i];
    if (startsWith(query, key + ':')) {
      query = query.slice(key.length + 1).trim();
      suggestObj = new suggestions[key];
      break;
    }
  }

  currentXhr.open('GET', suggestObj.getURL(query), true);
  currentXhr.onload = function() {
    suggest(suggestObj.getSuggestions(query, currentXhr.responseText));
  };
  currentXhr.send();
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
