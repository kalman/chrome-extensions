function endsWith(str, suff) {
  return str.slice(str.length - suff.length, str.length) === suff;
}

[].forEach.call(document.querySelectorAll(".file.js-details-container"), function(file) {
  var header = file.querySelector('.file-header');
  var path = header.dataset.path;
  if (endsWith(path, '.noms.go') || (endsWith(path, '.go') && path.indexOf('sha1_') !== -1)) {
    for (var sib = header.nextElementSibling; sib; sib = sib.nextElementSibling) {
      sib.style.display = 'none';
    }
  }
});
