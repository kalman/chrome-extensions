// Copyright or something.
(function() {
'use strict';

var CONFIG = [
  [['a', 'author'], AuthorSearcher, 'Commits by author'],
  [['b', 'bug'], CrbugSearcher, 'Your bugs or a bug ID, or project:bug ID (v8:898)', 'search "commentby:me"'],
  [['c', 'cs'], CodesearchSearcher, 'Chromium code', 'this is the default'],
  [['r', 'rev'], CrrevSearcher, 'Chromium revision'],
];

function describeKeywords(keywords) {
  return keywords.map(function(kw) {
    return '<url>' + kw + ':</url>'
  }).join(' or ');
}

function getSearcher(query) {
  for (var i = 0; i < CONFIG.length; i++) {
    var keywords = CONFIG[i][0];
    for (var j = 0; j < keywords.length; j++) {
      var keyword = keywords[j] + ':';
      if (startsWith(query, keyword)) {
        return new CONFIG[i][1](query.slice(keyword.length).trim());
      }
    }
  }
  return new CodesearchSearcher(query);
}

var currentXhr = null;
var throttleTimeout = undefined;

chrome.omnibox.onInputChanged.addListener(function(query, suggest) {
  if (startsWith(query, '?') || query == '') {
    suggest(CONFIG.map(function(it) {
      var desc = describeKeywords(it[0]) + ' - <match>' + it[2] + '</match>';
      if (it[3]) {
        desc += ' <dim>(' + it[3] + ')</dim>';
      }
      return {
        content: it[0][0] + ': ',
        description: desc
      }
    }));
    return;
  }

  var searcher = getSearcher(query);
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
  if (!startsWith(query, 'http:', 'https:')) {
    // If it's not an absolute URL (which may come from the user accepting a
    // suggestion) then use the searcher.
    query = getSearcher(query).getSearchURL();
  }

  var tabsFunction = chrome.tabs.create;
  var tabsOptions = {
    active: true,
    url: query
  };

  // Find the tabs API configuration depending on the disposition.
  switch (disposition) {
    case 'currentTab':
      tabsFunction = chrome.tabs.update;
      break;
    case 'newBackgroundTab':
      tabsOptions.active = false;
      break;
    case 'newForegroundTab':
      // Default configuration.
      break;
  }

  tabsFunction(tabsOptions);
});

var commands = CONFIG.map(function(it) {
  return describeKeywords(it[0]);
});
chrome.omnibox.setDefaultSuggestion({
  description: 'Commands: <url>?</url>, ' + commands.join(', ')
});

}());
