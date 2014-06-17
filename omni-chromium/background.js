// Copyright or something.
'use strict';

function getSearcher(query) {
  // TODO: rev:12345, etc.
  var config = [
    ['a', AuthorSearcher],
    ['author', AuthorSearcher],
    ['b', CrbugSearcher],
    ['bug', CrbugSearcher],
    ['cs', CodesearchSearcher],
    ['r', CrrevSearcher],
    ['rev', CrrevSearcher],
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
