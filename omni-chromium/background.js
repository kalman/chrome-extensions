// Copyright or something.
'use strict';

function inherits(childCtor, parentCtor) {
  function tempCtor() {}
  tempCtor.prototype = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
}

function startsWith(str, start) {
  return str.slice(0, start.length) == start;
}

function Searcher(query) {
  this.query = query;
}

Searcher.prototype.getSuggestionsURL = function() {
  throw new Error('Not implemented');
};

Searcher.prototype.getSuggestions = function(content) {
  throw new Error('Not implemented');
};

Searcher.prototype.getSearchURL = function() {
  throw new Error('Not implemented');
};

Searcher.prototype.shouldThrottle = function() {
  return false;
};

function CodesearchSearcher(query) {
  Searcher.call(this, query);
}
inherits(CodesearchSearcher, Searcher);

CodesearchSearcher.prototype.getSuggestionsURL = function() {
  return [
    'https://code.google.com/p/cs/codesearch/codesearch/json?',
    'suggest_request=b&',
    'query=', encodeURI(this.query), '+package%3Achromium&',
    'query_cursor_position=' + this.query.length, '&',
    'suggest_request=e'
    // Note: when invoking from cs.chromium.org there is also a "sid"
    // parameter, but I don't know how to generate it, nor does it appear
    // to matter if it's left out.
  ].join('');
};

CodesearchSearcher.prototype.getSuggestions = function(response) {
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

  window.cs = suggestions.map(function(suggest) {
    var has_line = suggest.goto_line && suggest.goto_line > 1;

    // Construct the link that has been suggested.
    var href = [
      'https://code.google.com/p/chromium/codesearch#',
      suggest.goto_package_id, '/', suggest.goto_path, '&',
      'q=', encodeURI(this.query), '&',
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
  }.bind(this));
  return window.cs;
};

CodesearchSearcher.prototype.getSearchURL = function() {
  return [
    'https://code.google.com/p/chromium/codesearch#search/',
    '&q=', encodeURI(this.query),
    '&sq=package:chromium&type=cs'
  ].join('');
};

function CrbugSearcher(query) {
  Searcher.call(this, query);
}
inherits(CrbugSearcher, Searcher);

CrbugSearcher.prototype.getSuggestionsURL = function() {
  return this.isBugQuery_() ? this.getBugURL_() : this.getIssueListURL_();
};

CrbugSearcher.prototype.getSuggestions = function(response) {
  // I would use DOMParser here but it crashes on this input for some reason.
  var dom = document.createElement('div');
  dom.innerHTML = response;

  function getBugDescription(summary, owner, id) {
    var description = '<match>' + summary + '</match> ';
    if (owner) {
      description += '<dim>' + owner + '</dim> ';
    }
    return description + '<url>crbug.com/' + id + '</url>';
  }

  if (this.isBugQuery_()) {
    var summaryElem = dom.querySelector('#issueheader span.h3');
    if (!summaryElem)
      return [];
    var ownerElem = dom.querySelector('#issuemeta tr:nth-child(2) a.userlink');
    var owner = ownerElem ? ownerElem.textContent : '--';
    return [{
      content: this.getBugURL_(),
      description: getBugDescription(summaryElem.textContent, owner, this.query)
    }];
  }

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
      content: CrbugSearcher.getCodeGoogleComIssue_(id),
      description: getBugDescription(summary, owner, id)
    });
  }.bind(this));
  return suggestions;
};

CrbugSearcher.prototype.shouldThrottle = function() {
  // Otherwise crbug will show captchas.
  return true;
};

CrbugSearcher.prototype.getSearchURL = function() {
  return this.isBugQuery_() ? this.getBugURL_() : this.getIssueListURL_();
};

CrbugSearcher.prototype.isBugQuery_ = function() {
  return !isNaN(Number.parseInt(this.query));
};

CrbugSearcher.prototype.getBugURL_ = function() {
  return CrbugSearcher.getCodeGoogleComIssue_(this.query);
};

CrbugSearcher.getCodeGoogleComIssue_ = function(issueNumber) {
  return 'https://code.google.com/p/chromium/issues/detail?id=' + issueNumber;
};

CrbugSearcher.prototype.getIssueListURL_ = function() {
  // The query separates spaces with +, but encodes each component.
  var encodedQuery = [];
  this.query.split(' ').forEach(function(component) {
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

function AuthorSearcher(query) {
  Searcher.call(this, query);
}
inherits(AuthorSearcher, Searcher);

AuthorSearcher.prototype.getSuggestionsURL = function() {
  return 'https://code.google.com/p/chromium/feeds/issueOptions';
};

AuthorSearcher.prototype.getSuggestions = function(response) {
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
    var memberIndex = member.indexOf(this.query);
    if (memberIndex === 0) {
      suggestions.push({
        content: AuthorSearcher.getGitChromiumOrgAuthorSearch_(member),
        description: [
          member.slice(0, memberIndex),
          '<match>', member.slice(memberIndex, this.query.length), '</match>',
          member.slice(memberIndex + this.query.length)
        ].join('')
      });
    }
  }
  return suggestions;
};

AuthorSearcher.prototype.getSearchURL = function() {
  return AuthorSearcher.getGitChromiumOrgAuthorSearch_(this.query);
};

AuthorSearcher.getGitChromiumOrgAuthorSearch_ = function(author) {
  return [
    'https://git.chromium.org/gitweb/?',
    'p=chromium.git&a=search&h=HEAD&st=author&s=',
    encodeURI(author)
  ].join('');
};

function getSearcher(query) {
  // TODO: rev:12345, etc.
  var config = [
    ['author', AuthorSearcher],
    ['bug', CrbugSearcher],
    ['cs', CodesearchSearcher],
  ];
  for (var i = 0; i < config.length; i++) {
    var keyword = config[i][0] + ':';
    if (startsWith(query, keyword)) {
      return new config[i][1](query.slice(keyword.length).trim());
    }
  }
  return new CodesearchSearcher(query);
}

var currentXhr = null;
var throttleTimeout = undefined;

chrome.omnibox.onInputChanged.addListener(function(query_, suggest) {
  var searcher = getSearcher(query_);
  if (!searcher.query) {
    suggest([]);
    return;
  }

  var runQuery = function() {
    // TODO: Implement response caching if appropriate?
    if (currentXhr)
      currentXhr.abort();
    currentXhr = new XMLHttpRequest();
    currentXhr.open('GET', searcher.getSuggestionsURL(), true);
    currentXhr.onload = function() {
      suggest(searcher.getSuggestions(currentXhr.responseText));
      currentXhr = null;
    };
    currentXhr.send();
  };

  if (searcher.shouldThrottle()) {
    // I guess that throttling == only searching if idle for > 1s.
    if (typeof(throttleTimeout) != 'undefined')
      clearTimeout(throttleTimeout);
    throttleTimeout = setTimeout(runQuery, 1000);
  } else {
    runQuery();
  }
});

chrome.omnibox.onInputEntered.addListener(function(query, disposition) {
  // If it's not an absolute URL (which may come from the user accepting a
  // suggestion) then use the searcher.
  if (!startsWith(query, 'http:') && !startsWith(query, 'https:')) {
    var searcher = getSearcher(query);
    query = searcher.getSearchURL();
  }

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
