chrome.browserAction.onClicked.addListener(function(t) {
   chrome.tabs.executeScript(t.id, {file: "cs.js"}) ;
});
