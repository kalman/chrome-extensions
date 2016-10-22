// Copyright ../LICENSE

const formSelector = [
  '.js-previewable-comment-form',
  '.js-suggester-container',
  '.new-discussion-timeline',
  '.previewable-comment-form',
].join(', ');

const disableSelector = [
  'a.tabnav-extra',
  'button.preview-tab',
  'button.write-tab',
  'input.manual-file-chooser',
].join(', ');

function fix(candidate) {
  for (const form of document.querySelectorAll(formSelector)) {
    for (const disable of form.querySelectorAll(disableSelector)) {
      disable.setAttribute('tabindex', '-1');
    }
  }
}

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const added of mutation.addedNodes) {
      fix(added);
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

document.body.onunload = () => {
  observer.unobserve();
  observer = null;
};

fix(document.body);
