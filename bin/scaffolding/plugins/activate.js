var Q, jf;

jf = require('jsonfile');

Q = require('q');

module.exports = function(env) {
  var exec;
  exec = env.exec;
  return function(plugin) {
    var defer;
    defer = Q.defer();
    env.plugins.pluginsList.updateEntry(plugin, {
      active: true
    }).then(function() {
      return defer.resolve();
    }).fail(function(e) {
      return defer.reject(e);
    });
    return defer.promise;
  };
};
