// Yep copyright.

(function() {

function scrollSelectionIntoView(elem) {
  var countLines = function(str) {
    var newlineMatches = str.match(/\n/g);
    return (newlineMatches ? newlineMatches.length : 0) + 1;
  };
  var lineHeight = elem.scrollHeight / countLines(elem.value);
  var cursorTop =
      countLines(elem.value.slice(0, elem.selectionStart)) * lineHeight;
  elem.scrollTop = cursorTop - (elem.offsetHeight / 2);
}

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

function onError(err) {
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

// TODO: Promise-idiom to not require making these global variables.
var backgroundPage = null;
var activeTab = null;

chrome.runtime.getBackgroundPage().then(function(bg) {
  backgroundPage = bg;
  return chrome.tabs.query({active: true, currentWindow: true});
}, function(error) {
  onError(error + '\nwhile loading background page.');
}).then(function(tabs) {
  if (tabs.length > 0) {
    activeTab = tabs[0];
  }
  return backgroundPage.load();
}).then(function(snippets) {
  // In a previous version of this extension the snippets were just a string
  // (the text), then they came to include the cursor position as well.
  if (typeof snippets == 'string') {
    snippets = {
      selectionStart: 0,
      selectionEnd: 0,
      value: snippets
    };
  }

  document.body.addEventListener('keydown', function(event) {
    // Shift+Enter closes popup.
    if (event.keyCode == 13 && event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      window.close();
    }
    // Ctrl+Shift+L inserts the current URL at the cursor position.
    if (event.keyCode == 76 && event.ctrlKey && activeTab) {
      event.preventDefault();
      event.stopPropagation();
      var url = activeTab.url;
      // Rewrite the URL to something friendlier if possible.
      // TODO(kalman): Make this configurable in an options page.
      // TODO(kalman): Work with gitiles.
      var rewrites = [
        [/codereview\.chromium\.org\/([0-9]+)/, 'crrev.com/$1'],
        [/code\.google\.com\/.*[?&]id=([0-9]+)/, 'crbug.com/$1'],
        [/src\.chromium\.org\/.*[?&]revision=([0-9]+)/, 'crrev.com/$1'],
        // Only the first 8 characters of the git hash.
        [/chromium.googlesource.com\/chromium\/src\/\+\/(.{8})/, 'crrev.com/$1'],
      ];
      for (var i = 0; i < rewrites.length; i++) {
        var exec = rewrites[i][0].exec(url)
        if (exec) {
          url = rewrites[i][1].replace('$1', exec[1]);
          break;
        }
      };
      document.execCommand('insertText', false, url);
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
    '<em>Ctrl + Shift + L</em> inserts the current URL at the cursor position',
    '<em>Shift + Enter</em> closes this popup',
    'Snippets are saved as you type',
  ];
  var tipIndex = Math.floor(Math.random() * tips.length);
  document.getElementById('tip').innerHTML = ('Tip: ' + tips[tipIndex] + '.');

  // Snippets are ready. Start writing.
  var snippetsElem = document.getElementById('snippets');
  snippetsElem.disabled = false;
  snippetsElem.placeholder = 'Start writing!';
  snippetsElem.focus();
  snippetsElem.value = snippets.value;
  snippetsElem.selectionStart = snippets.selectionStart;
  snippetsElem.selectionEnd = snippets.selectionEnd;
  scrollSelectionIntoView(snippetsElem);
  function save() {
    backgroundPage.save({
      selectionStart: snippetsElem.selectionStart,
      selectionEnd: snippetsElem.selectionEnd,
      value: snippetsElem.value || '',
    }, onError);
  }
  snippetsElem.addEventListener('keyup', save);
  snippetsElem.addEventListener('mouseup', save);
}, function(error) {
  onError(error + '\nwhile loading snippets.');
});

}());
