// Copyright or something.
'use strict';

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
