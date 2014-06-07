'use strict';

var is24Hour = document.querySelector('input[name=is24Hour]');

chrome.storage.sync.get('is24Hour', function(settings) {
  is24Hour.checked = !!settings.is24Hour;
  document.querySelector('#loading').setAttribute('done', 'true');
});

chrome.storage.onChanged.addListener(function(changes) {
  if (changes.is24Hour) {
    is24Hour.checked = !!changes.is24Hour.newValue;
  }
});

is24Hour.onchange = function() {
  chrome.storage.sync.set({is24Hour: is24Hour.checked});
};
