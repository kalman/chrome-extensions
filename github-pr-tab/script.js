// const copyright = null;

function fix(comment) {
  for (const dragDrop of comment.querySelectorAll('input.manual-file-chooser')) {
    dragDrop.setAttribute('tabindex', '-1');
  }
  for (const mdLink of comment.querySelectorAll('a.tabnav-extra')) {
    mdLink.setAttribute('tabindex', '-1');
  }
}

const observer = new MutationObserver(mutations => {
  mutations.forEach((mutation, i) => {
    for (const added of mutation.addedNodes) {
      if (added.classList.contains('inline-comments')) {
        fix(added);
      }
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

for (const comment of document.body.querySelectorAll('.inline-comments')) {
  fix(comment);
}
