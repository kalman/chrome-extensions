// Another copyright.

(function() {

chrome.storage.sync.get('snippets', function(storage) {
  if (!storage.snippets) {
    console.warn('No snippets to inject');
    return;
  }

  var textareas = document.getElementsByTagName('textarea');
  if (textareas.length > 0) {
    promptAndInject(textareas[0], storage.snippets);
  } else {
    var observer = new MutationObserver(function(mutations) {
      if (textareas.length > 0) {
        promptAndInject(textareas[0], storage.snippets);
        observer.disconnect();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
});

function promptAndInject(textarea, snippets) {
  var parent = textarea.parentElement;
  var parentPosition = parent.style.position;

  // Hack: already injected.
  if (parentPosition == 'relative')
    return;

  parent.style.position = 'relative';

  function createInterstitial(styles) {
    var interstitial = document.createElement('div');
    interstitial.setAttribute('style', [
      'position: absolute',
      'top: ' + textarea.offsetTop,
      'left: ' + textarea.offsetLeft,
      'width: ' + textarea.offsetWidth,
      'height: ' + textarea.offsetHeight
    ].concat(styles || []).join('; '));
    return interstitial;
  }

  var interstitial = parent.appendChild(createInterstitial([
    'background-color: #ddd',
    'opacity: 0.5'
  ]));

  var buttonHolder = parent.appendChild(createInterstitial([
    'display: flex',
    'align-items: center',
    'justify-content: center',
  ]));

  buttonHolder.addEventListener('keydown', function(event) {
    if (event.keyCode == 27) {
      event.preventDefault();
      close();
    }
  });

  var paste = buttonHolder.appendChild(document.createElement('button'));
  paste.textContent = 'Paste';
  paste.addEventListener('click', function() {
    textarea.value = snippets;
    // Hack: trigger snippets saving.
    textarea.dispatchEvent(new CustomEvent('change'));
    // Hack: focus the submit button before closing.
    var submit = document.querySelector('[aria-text=Submit]');
    if (submit) submit.focus();
    close();
  });
  paste.focus();

  var cancel = buttonHolder.appendChild(document.createElement('button'));
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', function() {
    close();
  });

  function close() {
    parent.style.position = parentPosition;
    parent.removeChild(interstitial);
    parent.removeChild(buttonHolder);
  }
}

}());
