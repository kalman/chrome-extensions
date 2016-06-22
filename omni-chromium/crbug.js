// Copyright or something.
'use strict';

function CrbugSearcher(query) {
  Searcher.call(this, query);
}
inherits(CrbugSearcher, Searcher);

CrbugSearcher.mainProject_ = "chromium";

CrbugSearcher.projects_ = [
  CrbugSearcher.mainProject_, "v8", "skia", "webrtc", "pdfium", "angleproject"];

CrbugSearcher.prototype.getSuggestionsURL = function() {
  return this.isBugQuery_() ? this.getBugURL_() : this.getIssueListURL_();
};

CrbugSearcher.prototype.getSuggestions = function(response) {
  var dom = new DOMParser().parseFromString(response, 'text/html');

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

  var suggestions = [];
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
  return !!CrbugSearcher.parseBugNumberQuery_(this.query);
};

CrbugSearcher.prototype.getBugURL_ = function() {
  return CrbugSearcher.getCodeGoogleComIssue_(this.query);
};

CrbugSearcher.parseBugNumberQuery_ = function (originalQuery) {
  var query, parsedQuery, project = CrbugSearcher.mainProject_;
  function isBugNumber(bugNumberQuery) {
   return !isNaN(Number.parseInt(bugNumberQuery));
  }

  query = originalQuery;
  if (isBugNumber(query)) {
    return {project: project, issueNumber: query};
  }

  parsedQuery = originalQuery.split(":");
  project = parsedQuery[0];
  query = parsedQuery[1];

  if (CrbugSearcher.projects_.indexOf(project) !== -1 && isBugNumber(query)) {
    return {project: project, issueNumber: query};
  }

  return;
};

CrbugSearcher.getCodeGoogleComIssue_ = function(query) {
  var parsedQuery = CrbugSearcher.parseBugNumberQuery_(query);
  return 'https://bugs.chromium.org/p/' + parsedQuery.project +
		'/issues/detail?id=' + parsedQuery.issueNumber;
};

CrbugSearcher.prototype.getIssueListURL_ = function() {
  // The query separates spaces with +, but encodes each component.
  var encodedQuery = [];
  this.query.split(' ').forEach(function(component) {
    encodedQuery.push(encodeURI(component));
  });
  return [
    'https://bugs.chromium.org/p/' + CrbugSearcher.mainProject_ + '/issues/list?',
    'q=commentby:me+', encodedQuery.join('+'), '&',
    'sort=-id&',
    'colspec=ID%20Pri%20M%20Iteration%20ReleaseBlock%20Cr%20Status%20Owner%20',
    'Summary%20OS%20Modified'
  ].join('');
};
