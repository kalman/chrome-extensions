// Copyright or something.
'use strict';

function inherits(childCtor, parentCtor) {
  function tempCtor() {}
  tempCtor.prototype = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
}

function startsWith(str /* varargs */) {
  for (var i = 1; i < arguments.length; i++) {
    if (str.slice(0, arguments[i].length) == arguments[i]) {
      return true;
    }
  }
  return false;
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
