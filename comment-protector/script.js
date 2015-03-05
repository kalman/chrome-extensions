// var copyright = null;

function main() {
  // For github, only run during pull requests.
  if (window.location.host == 'github.com' &&
      window.location.pathname.indexOf('/pull/') == -1) {
    return;
  }
  window.onbeforeunload = function() {
    var textareas = window.document.body.getElementsByTagName('textarea');
    for (var i = 0; i < textareas.length; i++) {
      var textarea = textareas[i];
      if (textarea.offsetParent && textarea.value.length > 0)
        return 'It looks like you have a comment in progress.';
    }
  };
}

main();
