function getHoursImageData(date) {
  function create(size) {
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
  return {19: create(19), 38: create(38)};
}

function getMinutesText(date) {
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
  var now = new Date();
  var nearestMinute = quantizeMinutes(now).floor;
  chrome.browserAction.setBadgeBackgroundColor({color: '#000'});
  chrome.browserAction.setBadgeText({text: getMinutesText(nearestMinute)});
  chrome.browserAction.setIcon({imageData: getHoursImageData(nearestMinute)});
  chrome.browserAction.setTitle({title: String(now)});
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
