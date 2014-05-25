// More copyright.

(function() {

var SNIPPETS_URL = 'https://$(SNIPPETS_URL)';
var SAVE_FREQUENCY_MS = 3000;

// A Promise to the latest call to a storage operation, so that they can be
// easily run in serial and not stomp on each other.
var pendingStorageOp = Promise.resolve();

// The snippets currently being saved. Take this into account during load()
// because there might be a storage operation currently in progress, in which
// case take the latest value rather than the one in storage. This prevents
// pop-in of the current snippets value.
var pendingSnippets = null;

window.load = function load() {
  if (pendingSnippets !== null) {
    return Promise.resolve(pendingSnippets);
  }
  return new Promise(function(resolve, reject) {
    pendingStorageOp = pendingStorageOp.then(function() {
      return chrome.storage.sync.get('snippets');
    }, reject).then(function(result) {
      resolve(result.snippets || '');
    }, reject);
  });
};

// The popup saves the snippets on each keystroke, and the background page is
// responsible for buffering these keystrokes.
window.save = function save(newSnippets, onError) {
  if (newSnippets === null)
    throw new Error('save() was passed null snippets');
  if (pendingSnippets != null) {
    pendingSnippets = newSnippets;
    return;
  }
  pendingSnippets = newSnippets;
  setTimeout(function() {
    if (pendingSnippets === null) {
      if (onError) onError('Trying to save null snippets');
      return;
    }
    pendingStorageOp = pendingStorageOp.then(function() {
      try {
        return chrome.storage.sync.set({snippets: pendingSnippets});
      } finally {
        pendingSnippets = null;
      }
    }, function(error) {
      if (onError) onError(error.message);
    });
  }, SAVE_FREQUENCY_MS);
};

function waitUntilLoadComplete(tab) {
  return new Promise(function(resolve, reject) {
    if (tab.status == 'complete') {
      resolve(tab);
      return;
    }
    function updatedListener(id, info) {
      if (id == tab.id && info.status == 'complete') {
        chrome.tabs.onUpdated.removeListener(updatedListener);
        chrome.tabs.onRemoved.removeListener(removedListener);
        resolve(tab);
      }
    }
    function removedListener(id) {
      if (id == tab.id) {
        chrome.tabs.onUpdated.removeListener(updatedListener);
        chrome.tabs.onRemoved.removeListener(removedListener);
        reject('tab was closed');
      }
    }
    chrome.tabs.onUpdated.addListener(updatedListener);
    chrome.tabs.onRemoved.addListener(removedListener);
  });
}

function paste(tabId) {
  return chrome.tabs.executeScript(tabId, {file: 'paste.js'});
}

window.submit = function submit() {
  chrome.permissions.request({origins: [SNIPPETS_URL + '/*']}).then(function() {
    return chrome.tabs.query({url: SNIPPETS_URL + '/*'});
  }).then(function(tabs) {
    if (tabs.length > 0) {
      // There was already a tab with the snippets open. Focus and inject.
      chrome.tabs.update(tabs[0].id, {active: true}).then(function() {
        paste(tabs[0].id);
      });
    } else {
      // There was no tab with the snippets open. Create and inject.
      chrome.tabs.create({url: SNIPPETS_URL}).then(function(tab) {
        return waitUntilLoadComplete(tab);
      }).then(function(tab) {
        paste(tab.id);
      });
    }
  });
};

}());
