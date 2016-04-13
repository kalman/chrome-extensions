function contains(str, snip) {
  return str.indexOf(snip) !== -1;
}

function endsWith(str, suff) {
  return str.slice(str.length - suff.length, str.length) === suff;
}

[].forEach.call(document.querySelectorAll('.file.js-details-container'), function(file) {
  var header = file.querySelector('.file-header');
  var path = header.dataset.path;
  if (endsWith(path, '.noms.go') ||
      endsWith(path, '.noms.js') ||
      (endsWith(path, '.go') && contains(path, 'sha1_')) ||
      (endsWith(path, '.js') && contains(path, 'sha1_'))) {
    header.style.borderBottom = 'none';
    for (var sib = header.nextElementSibling; sib; sib = sib.nextElementSibling) {
      sib.style.display = 'none';
    }
  }
});
