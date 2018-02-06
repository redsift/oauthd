var Q, colors, sugar;

Q = require('q');

colors = require('colors');

sugar = require('sugar');

module.exports = function(env) {
  var exec;
  exec = env.exec;
  return function(plugin_name) {
    var defer;
    defer = Q.defer();
    env.plugins.git(plugin_name, true).then(function(plugin_git) {
      return plugin_git.isValidRepository().then(function(valid) {
        var current_v, cv_info, latest_v, update;
        if (!valid) {
          return defer.reject(new Error('No git remote for plugin ' + plugin_name));
        } else {
          current_v = void 0;
          cv_info = void 0;
          latest_v = void 0;
          update = false;
          return plugin_git.getCurrentVersion().then(function(v) {
            return plugin_git.getVersionMask().then(function(mask) {
              current_v = v.version;
              cv_info = v;
              if (plugin_git.isNumericalMask(mask)) {
                return plugin_git.getLatestVersion(mask).then(function(latest_v) {
                  var target_version;
                  target_version = latest_v;
                  return plugin_git.checkout(target_version).then(function() {
                    return defer.resolve(target_version);
                  }).fail(function(e) {
                    return defer.reject(new Error('No target version found for mask \'' + mask + '\''));
                  });
                });
              } else {
                return plugin_git.checkout(mask).then(function() {
                  return defer.resolve(mask);
                }).fail(function(e) {
                  return defer.reject(new Error('Target version ' + mask + ' does not exist'));
                });
              }
            });
          }).fail(function(e) {
            return defer.reject(e);
          });
        }
      });
    }).fail(function(err) {
      return defer.reject(err);
    });
    return defer.promise;
  };
};
