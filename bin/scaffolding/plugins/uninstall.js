var Q, fs, jf, rimraf;

fs = require('fs');

rimraf = require('rimraf');

jf = require('jsonfile');

Q = require('q');

module.exports = function(env) {
  return function(plugin_name) {
    var defer, e, error, folder_name;
    defer = Q.defer();
    if (plugin_name === "") {
      env.debug('Please provide a plugin name to uninstall.');
      defer.reject();
      return defer.promise;
    }
    try {
      folder_name = process.cwd() + "/plugins/" + plugin_name;
      fs.exists(folder_name, function(exists) {
        if (exists) {
          rimraf(folder_name, function(err) {
            if (err) {
              return defer.reject(err);
            }
            return env.debug("Successfully removed plugin '" + plugin_name.yellow + "' folder.");
          });
        }
        return env.plugins.pluginsList.removeEntry(plugin_name).then(function() {
          env.debug("Successfully removed plugin '" + plugin_name.yellow + "' from the plugins list.");
          return defer.resolve();
        }).fail(function(e) {
          return defer.reject(e);
        });
      });
    } catch (error) {
      e = error;
      env.debug('An error occured: ' + e.message);
    }
    return defer.promise;
  };
};
