// let copyright = null;

function isGitHub() {
  return window.location.host === 'github.com';
}

function addCommentProtector() {
  // For github, only run during pull requests.
  if (isGitHub() && window.location.pathname.indexOf('/pull/') === -1) {
    return;
  }

  // Track whether a form is being submitted.
  let isSubmitting = false;
  window.addEventListener('click', e => {
    let target = e.target;
    if (target instanceof HTMLInputElement && target.type == 'submit') {
      isSubmitting = true;
      // No longer submitting after... 3 seconds? Maybe there is a real event
      // to listen to here, but onbeforeunload doesn't give us a reason for the
      // unload.
      setTimeout(function() {
        isSubmitting = false;
      }, 3000);
    }
  });

  window.onbeforeunload = () => {
    let textareas = window.document.body.getElementsByTagName('textarea');
    for (let i = 0; i < textareas.length; i++) {
      let textarea = textareas[i];
      if (!isSubmitting &&            // not right after the form was submitted
          textarea.offsetParent &&    // only if the textarea is visible
          textarea.value.length > 0)  // only if the textarea has a value
        return 'It looks like you have a comment in progress.';
    }
  };
}

function addNextGitHubComment() {
  let comments = document.querySelectorAll('.line-comments');
  if (comments.length === 0) {
    return;
  }

  document.body.addEventListener('keydown', e => {
    // Don't go to next comment if user is typing.
    if (document.activeElement !== document.body) {
      return;
    }

    // Ignore if there are any modifiers.
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }

    if (e.key === 'n' || e.key === 'j') {
      setOffset(1);
    } else if (e.key === 'p' || e.key === 'k') {
      setOffset(-1);
    }
    e.preventDefault();
    e.stopPropagation();
  });

  let hlComment;

  let wrap = i => {
    if (i < 0) {
      return i + comments.length;
    }
    if (i >= comments.length) {
      return i - comments.length;
    }
    return i;
  };

  let setOffset = offset => {
    let firstVisible = i => {
      for (let j = i, first = true; i != j || first; j = wrap(j + offset)) {
        first = false;
        let next = comments[j];
        if (next && next.offsetParent) {
          hlComment = next;
          break;
        }
      }
    };

    if (hlComment) {
      hlComment.style.boxShadow = '';
      for (let i = 0, first = true; i !== 0 || first; i = wrap(i + offset)) {
        first = false;
        if (comments[i] === hlComment) {
          firstVisible(i + offset);
          break;
        }
      }
    } else {
      firstVisible(0);
    }

    if (hlComment) {
      hlComment.style.boxShadow = 'inset 0 0 10px #183691';
      hlComment.scrollIntoView();
      document.body.scrollTop -= 200;
    }
  };
}

addCommentProtector();
if (isGitHub()) {
  addNextGitHubComment();
}
