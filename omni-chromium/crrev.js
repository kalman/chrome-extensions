// Copyright or something.
'use strict';

function CrrevSearcher(query) {
  Searcher.call(this, query);
}
inherits(CrrevSearcher, Searcher);

CrrevSearcher.prototype.getSuggestionsURL = function() {
  return [
    'https://src.chromium.org/viewvc/chrome?revision=',
    encodeURI(this.query),
    '&view=revision'
  ].join('');
};

CrrevSearcher.prototype.getSuggestions = function(response) {
  var dom = new DOMParser().parseFromString(response, 'text/html');

  var authorElem = dom.querySelector('tr:nth-child(2) td');
  if (!authorElem) {
    return [];
  }

  var descriptionElem = dom.querySelector('tr:nth-child(5) td');
  if (!descriptionElem) {
    return [];
  }

  var author = authorElem.textContent;
  var description = descriptionElem.textContent.split('\n')[0];
  if (description.length > 72) {
    description = description.slice(0, 71) + '\u2026';
  }

  return [{
    content: this.getSuggestionsURL(),
    description: [
      '<match>', description, '</match> ',
      '<dim>', author, '</dim>'
    ].join('')
  }];
};

CrrevSearcher.prototype.getSearchURL = function() {
  return this.getSuggestionsURL();
};
