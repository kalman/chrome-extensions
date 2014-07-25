// More copyright.

var PersistentString = (function() {

/**
 * An persistent string stored somewhere in storage.
 *
 * This implementation uses chrome.storage.sync with a partitioning mechanism
 * to get around per-key quota restrictions.
 *
 * @constructor
 * @param {string} prefix
 *     The key prefix to save values to. This should be unique per
 *     PersistentString instance and should not contain non-alphanumeric
 *     characters.
 * @param {number} numBuckets
 *     The number of buckets to partition this persistent string into. The more
 *     buckets the longer a string can be stored, but potentially the less
 *     efficient.
 *
 *     Note: take care to update this in a backwards-compatible way. It's ok
 *     for the buckets to change in size but only to get greater. If it shrinks
 *     there will be data loss.
 * @param {function(*):string}
 *     A function to run on any data loaded from storage, if any. This is
 *     indended to be used for data migration where some keys might have an
 *     invalid format (like an object) and need to have their string value
 *     extracted.
 */
function PersistentString(prefix, numBuckets, loadHook) {
  this.prefix_ = prefix;
  this.numBuckets_ = numBuckets;
  this.loadHook_ = loadHook;
}

/**
 * Sets the value that this PersistentString backs.
 *
 * @param {string} value
 *     The new value.
 * @return {Promise<>}
 *     A Promise to the set operation completing.
 */
PersistentString.prototype.set = function(value) {
  var bucketSize = Math.ceil(value.length / this.numBuckets_);
  var buckets = {};
  var addBucket = function(key) {
    buckets[key] = value.slice(0, bucketSize);
    value = value.slice(bucketSize);
  };
  addBucket(this.prefix_);
  for (var i = 0; i < this.numBuckets_ - 1; i++) {
    addBucket(this.prefix_ + '.' + i);
  }
  return chrome.storage.sync.set(buckets);
};

/**
 * Gets the value that this PersistentString backs.
 *
 * @return {Promise<string>}
 *     a Promise to the value that this PersistentString backs.
 */
PersistentString.prototype.get = function() {
  var bucketKeys = [this.prefix_];
  for (var i = 0; i < this.numBuckets_ - 1; i++) {
    bucketKeys.push(this.prefix_ + '.' + i);
  }
  return new Promise(function(resolve, reject) {
    chrome.storage.sync.get(bucketKeys).then(function(storage) {
      var bucketValues = [];
      bucketKeys.forEach(function(key) {
        var value = storage[key];
        bucketValues.push(this.loadHook_ ? this.loadHook_(value) : value);
      }.bind(this));
      resolve(bucketValues.join(''));
    }.bind(this), reject);
  }.bind(this));
};

return PersistentString;
}());
