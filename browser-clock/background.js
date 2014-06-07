'use strict';

function getHoursImageData(hours) {
  function create(size) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('width', size);
    canvas.setAttribute('height', size);
    var context = canvas.getContext('2d');
    context.font = 'bold ' + (size * 0.67) + 'px ' +
                   '\'Segoe UI\', ' +       // Windows
                   '\'Noto Sans UI\', ' +   // ChromeOS
                   '\'Ubuntu\', ' +         // Ubuntu
                   '\'Lucida Grande\', ' +  // OSX
                   'Tahoma, ' +             // Windows#2
                   'sans-serif';            // Other
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(hours, size/2, size/3);
    return context.getImageData(0, 0, size, size);
  }
  return {19: create(19), 38: create(38)};
}

function formatMinutes(date) {
  var minutes = String(date.getMinutes());
  if (minutes.length == 1)
    minutes = '0' + minutes;
  return minutes;
}

function quantizeMinutes(date) {
  var msSinceEpoch = date.getTime();
  var seconds = date.getSeconds();
  var floor = new Date(msSinceEpoch - seconds * 1000);
  var ceil = new Date(msSinceEpoch + (60 - seconds) * 1000);
  return {
    floor: floor,
    round: seconds < 30 ? floor : ceil,
    ceil: ceil
  };
}

function update() {
  chrome.storage.sync.get('is24Hour', function(settings) {
    var now = new Date();
    var quantized = quantizeMinutes(now).floor;
    var nearestMinute = formatMinutes(quantized);
    var nearestHour = quantized.getHours();
    var isPM = nearestHour >= 12;
    if (!settings.is24Hour && nearestHour > 12) {
      nearestHour %= 12;
    }
    chrome.browserAction.setBadgeBackgroundColor({color: '#000'});
    chrome.browserAction.setBadgeText({text: nearestMinute});
    chrome.browserAction.setIcon({imageData: getHoursImageData(nearestHour)});
    // Hack to get a sensibly formatted full time, because generally speaking
    // that's a real pain in JS without a library. However, toDateString()
    // gives a nice enough date like "Sat Jun 07 2014", we just need to attach
    // the time (depending on 24 preference) to the end.
    var title = [now.toDateString(), ', ', nearestHour + ':' + nearestMinute];
    if (!settings.is24Hour) {
      title.push(isPM ? ' PM' : ' AM');
    }
    chrome.browserAction.setTitle({title: title.join('')});
  });
}

chrome.runtime.onInstalled.addListener(function() {
  update();

  // Set up an alarm to fire on the soonest minute mark > 60 seconds in the
  // future (that's the finest granulatity that the alarms API supports), then
  // every minute after that.
  chrome.alarms.create({
    when: quantizeMinutes(new Date()).ceil.getTime() + (60 * 1000),
    periodInMinutes: 1
  });
});

chrome.alarms.onAlarm.addListener(update);
chrome.browserAction.onClicked.addListener(update);
chrome.runtime.onStartup.addListener(update);
chrome.storage.onChanged.addListener(update);
