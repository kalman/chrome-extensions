// Yep copyright.

(function() {

// Resize everything to fit snugly inside the popup.
(function() {
  var popup = document.documentElement;
  var body = document.body;
  var snippetsElem = document.getElementById('snippets');
  var footer = document.getElementById('footer');

  // The popup height/width needs to take into account the padding that is
  // already applied to the popup. Hack: 10,000px is our arbitrary width/height.
  var padding = popup.offsetHeight - 10000;
  var popupHeight = popup.clientHeight - padding;
  // Yes, -padding even though the padding is based off height (and probably
  // 16px). The width-padding is 8px which is slightly too short. Maybe the
  // height needs to be multiplied by 2 for some reason. In any case, 16 works.
  // height needs to be multiplied by 2. For some reason.
  var popupWidth = popup.clientWidth - padding;

  body.style.height = popupHeight + 'px';
  body.style.width = popupWidth + 'px';
  snippetsElem.style.height = (popupHeight - footer.clientHeight) + 'px';
  snippetsElem.style.width = popupWidth + 'px';
}());

function showError(err) {
  document.getElementById('errorLog').innerText = err;
  document.getElementById('errorContainer').removeAttribute('hidden');
  document.getElementById('snippets').disabled = true;
  // Report needs to use the tabs API directy since mailto: links don't appear
  // to work from <a> within popups.
  var report = document.getElementById('report');
  report.addEventListener('click', function(e) {
    chrome.tabs.create({url: report.getAttribute('href')});
    e.preventDefault();
  });
}

// TODO: Promise-idiom to not require making this a global variable.
var backgroundPage = null;

chrome.runtime.getBackgroundPage().then(function(bg) {
  backgroundPage = bg;
  return backgroundPage.load();
}, function(error) {
  showError(error + '\nwhile loading background page.');
}).then(function(snippets) {
  // Shift+Enter closes popup.
  document.body.addEventListener('keydown', function(event) {
    if (event.keyCode == 13 && event.shiftKey) {
      event.preventDefault();
      window.close();
    }
  }, true);

  // Clicking on the "$(SNIPPETS_URL)" link opens it and starts the
  // process of pasting in our snippets.
  document.getElementById('go').addEventListener('click', function(e) {
    e.preventDefault();
    backgroundPage.submit();
    window.close();
  });

  // Show a random tip.
  var tips = [
    '<em>Shift + Enter</em> closes this popup',
    'Snippets are saved as you type',
  ];
  var tipIndex = Math.floor(Math.random() * tips.length);
  document.getElementById('tip').innerHTML = ('Tip: ' + tips[tipIndex] + '.');

  // Snippets are ready. Start writing.
  var snippetsElem = document.getElementById('snippets');
  snippetsElem.style.height = 
  snippetsElem.placeholder = 'Start writing!';
  snippetsElem.focus();
  snippetsElem.value = snippets;
  snippetsElem.disabled = false;
  // Why. does. this. not. work.
  snippetsElem.selectionStart = snippetsElem.selectionEnd = snippets.length;
  snippetsElem.addEventListener('keyup', function() {
    backgroundPage.save(snippetsElem.value || '', showError);
  });
}, function(error) {
  showError(error + '\nwhile loading snippets.');
});

}());
