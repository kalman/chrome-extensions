// A copyright.

(function() {

// Wraps most async app/extension APIs in a Promise. Allows you to write:
//
// chrome.storage.sync.get('foo', function(storage) {
//   chrome.tabs.create(function(tab) {
//     ...
//   });
// });
//
// as
//
// chrome.storage.sync.get('foo').then(function(storage) {
//   return chrome.tabs.create();
// }).then(function() {
//   ...
// });
//
// which composes well in many cases.
//
// Functions which return objects with async methods, like chrome.app.window,
// are not supported.

function findFunctions(obj, callback) {
  Object.getOwnPropertyNames(obj).forEach(function(pName) {
    var p = obj[pName];
    if (typeof p === 'function') {
      callback(obj, pName, p);
    } else if (typeof p === 'object') {
      findFunctions(p, callback);
    }
  });
}

Object.getOwnPropertyNames(window.chrome).forEach(function(apiName) {
  var api = window.chrome[apiName];
  if (typeof api !== 'object')
    return;

  findFunctions(api, function(owner, fnName, fn) {
    owner[fnName] = function() {
      var lastArgument = arguments[arguments.length - 1];
      // If |lastArgument| is a function then the caller isn't expecting to
      // be returned a Promise so don't bother.
      if (typeof lastArgument === 'function')
        return fn.apply(this, arguments);

      // Otherwise, the caller is expecting a Promise *or* it's a synchronous
      // function. Kind of annoying because we need to call the function with
      // the right arguments, which means a try/catch... which means
      // potentially screwing up the caller's devtools which may be looking
      // out for exceptions. Anyhow, whatever.
      var args = Array.prototype.slice.call(arguments);
      try {
        var resolve = null, reject = null;
        args.push(function() {
          if (chrome.runtime.lastError) {
            reject.call(this, chrome.runtime.lastError);
            return;
          }
          resolve.apply(this, arguments);
        }.bind(this));
        var result = fn.apply(this, args);
        // Function call didn't throw an error, so this was an async function.
        // Return a Promise backed by the callback added above to |args|.
        return new Promise(function(resolve_, reject_) {
          resolve = resolve_, reject = reject_;
        });
      } catch (e) {
        // Function call threw an error, so this was a sync function.
        // Try again with the original arguments.
        return fn.apply(this, arguments);
      }
    };
  });
});

}());
