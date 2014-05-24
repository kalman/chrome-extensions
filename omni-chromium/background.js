// Copyright or something.

function codesearchQuery(query) {
  return [
    'https://code.google.com/p/chromium/codesearch#search/',
    '&q=', encodeURI(query),
    '&sq=package:chromium&type=cs'
  ].join('');
}

function codesearchSuggestQuery(query) {
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
}

var currentXhr = null;

chrome.omnibox.onInputChanged.addListener(function(query, suggest) {
  if (currentXhr) {
    currentXhr.abort();
    currentXhr = null;
  }

  currentXhr = new XMLHttpRequest();
  currentXhr.open('GET', codesearchSuggestQuery(query), true);

  currentXhr.onload = function() {
    var suggestions = null;
    try {
      var response = JSON.parse(currentXhr.responseText);
      suggestions = response.suggest_response[0].suggestion;
      if (suggestions == null) {
        // No suggestions.
        return;
      }
    } catch (e) {
      console.error('Invalid response: ' + currentXhr.responseText);
      return;
    }

    suggestions.sort(function(s1, s2) {
      return s1.score < s2.score;
    });

    suggest(suggestions.map(function(suggest) {
      // Construct the link that has been suggested.
      var href = [
        'https://code.google.com/p/chromium/codesearch#',
        suggest.goto_package_id, '/', suggest.goto_path, '&',
        'q=', query, '&',
        'sq=package:chromium&',
        'goto_line' in suggest ? ('l=' + suggest.goto_line) : '',
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
          'goto_line' in suggest ? (':' + suggest.goto_line) : '',
          '</url>'
        ].join('')
      };
    }));
  };

  currentXhr.send();
});

chrome.omnibox.onInputEntered.addListener(function(query, disposition) {
  // It might be an absolute URL if it came from a suggest. Otherwise, treat
  // it as a codesearch query.
  var https = 'https:';
  if (query.slice(0, https.length) != https)
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
