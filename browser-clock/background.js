function getHoursImageData(date) {
  var size = 19 * window.devicePixelRatio;
  var canvas = document.createElement('canvas');
  canvas.textContent = date.getHours() + ':' + getMinutesText(date);
  canvas.setAttribute('width', size);
  canvas.setAttribute('height', size);
  var context = canvas.getContext('2d');
  context.font = 'bold ' + (size * 0.67) + 'px \'Lucida Grande\'';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(date.getHours(), size/2, size/3);
  return context.getImageData(0, 0, size, size);
}

function getMinutesText(date) {
  var minutes = String(date.getMinutes());
  if (minutes.length == 1)
    minutes = '0' + minutes;
  return minutes;
}

function update() {
  var now = new Date();
  var seconds = now.getSeconds(), time = now.getTime();
  var nearestMinute = new Date(seconds < 30 ? time - seconds * 1000 :
                                              time + (60 - seconds) * 1000);
  chrome.browserAction.setIcon({imageData: getHoursImageData(nearestMinute)});
  chrome.browserAction.setBadgeText({text: getMinutesText(nearestMinute)});
  chrome.browserAction.setTitle({title: String(now)});
}

chrome.runtime.onInstalled.addListener(function() {
  chrome.browserAction.setBadgeBackgroundColor({color: '#000'});
  update();
});
chrome.runtime.onStartup.addListener(update);
chrome.alarms.onAlarm.addListener(update);

// It's impossible for this to be any more accurate than a minute, so any
// calculation more complex than this is pointless.
chrome.alarms.create({delayInMinutes: 1});
