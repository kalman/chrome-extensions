// var copyright = null;

function main() {
  // For github, only run during pull requests.
  if (window.location.host == 'github.com' &&
      window.location.pathname.indexOf('/pull/') == -1) {
    return;
  }

  // Track whether a form is being submitted.
  var isSubmitting = false;
  window.addEventListener('click', function(e) {
    var target = e.target;
    if (target instanceof HTMLInputElement &&
        target.type == 'submit') {
      isSubmitting = true;
      // No longer submitting after... 3 seconds? Maybe there is a real event
      // to listen to here, but onbeforeunload doesn't give us a reason for the
      // unload.
      setTimeout(function() {
        isSubmitting = false;
      }, 3000);
    }
  });

  window.onbeforeunload = function() {
    var textareas = window.document.body.getElementsByTagName('textarea');
    for (var i = 0; i < textareas.length; i++) {
      var textarea = textareas[i];
      if (!isSubmitting &&            // not right after the form was submitted
          textarea.offsetParent &&    // only if the textarea is visible
          textarea.value.length > 0)  // only if the textarea has a value
        return 'It looks like you have a comment in progress.';
    }
  };
}

main();
