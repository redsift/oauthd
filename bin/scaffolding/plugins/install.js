var Q, cloned_nb, colors, fs, rimraf;

fs = require('fs');

rimraf = require('rimraf');

Q = require('q');

colors = require('colors');

cloned_nb = 0;

module.exports = function(env) {
  var exec;
  exec = env.exec;
  return function(install_data, update_list) {
    var gitClone, launchInstall, moveClonedToPlugins, updatePluginsList;
    if (update_list == null) {
      update_list = true;
    }
    launchInstall = function(install_data) {
      var defer, temp_location, temp_pluginname, tempfolder_nb, url, version_mask;
      defer = Q.defer();
      if (install_data.repository == null) {
        defer.reject(new Error('No repository'));
      } else {
        url = install_data.repository;
        version_mask = install_data.version || 'master';
        if (url == null) {
          return env.debug('Please provide a repository address for the plugin to install');
        }
        tempfolder_nb = cloned_nb++;
        temp_location = process.cwd() + '/plugins/cloned' + tempfolder_nb;
        temp_pluginname = 'cloned' + tempfolder_nb;
        gitClone(install_data, temp_location, temp_pluginname, version_mask, function(err) {
          if (err) {
            return defer.reject(err);
          }
          return env.plugins.info.getInfo(temp_pluginname).then(function(plugin_data) {
            return moveClonedToPlugins(plugin_data.name, temp_location, function(err) {
              if (err) {
                return defer.reject(err);
              }
              return updatePluginsList(plugin_data.name, install_data, function(err) {
                if (err) {
                  return defer.reject(err);
                }
                return defer.resolve();
              });
            });
          }).fail(function(e) {
            return defer.reject(e);
          });
        });
      }
      return defer.promise;
    };
    gitClone = function(install_data, temp_location, temp_pluginname, version_mask, callback) {
      var url;
      url = install_data.repository;
      return rimraf(temp_location, function(err) {
        var command;
        if (err) {
          return callback(err);
        }
        command = 'cd ' + temp_location + '; git clone ' + url + ' ' + temp_location;
        env.debug("Cloning " + url.red);
        return fs.mkdir(temp_location, function(err) {
          if (err) {
            return callback(err);
          }
          return exec(command, function(error, stdout, stderr) {
            if (error) {
              return callback(error);
            }
            return env.plugins.git(temp_pluginname).then(function(plugin_git) {
              if (version_mask) {
                return plugin_git.getLatestVersion(version_mask).then(function(latest) {
                  if (latest) {
                    command = 'cd ' + temp_location + '; git checkout ' + latest;
                    return exec(command, function(error, stdout, stderr) {
                      if (error) {
                        return callback(error);
                      }
                      return callback(null);
                    });
                  } else {
                    return callback(null);
                  }
                });
              } else {
                return callback(null);
              }
            }).fail(function(err) {
              return callback(null);
            });
          });
        });
      });
    };
    moveClonedToPlugins = function(plugin_name, temp_location, callback) {
      var folder_name;
      folder_name = process.cwd() + "/plugins/" + plugin_name;
      return rimraf(folder_name, function(err) {
        if (err) {
          return callback(err);
        }
        return fs.rename(temp_location, process.cwd() + '/plugins/' + plugin_name, function(err) {
          if (err) {
            return callback(err);
          }
          env.debug('Plugin ' + plugin_name.green + ' successfully installed in "' + folder_name + '".');
          return callback(null);
        });
      });
    };
    updatePluginsList = function(plugin_name, install_data, callback) {
      if (update_list) {
        return env.plugins.pluginsList.updateEntry(plugin_name, {
          repository: install_data.repository,
          version: install_data.version,
          active: install_data.active
        }).then(function() {
          env.debug('Plugin ' + plugin_name.green + ' successfully activated.');
          return callback(null);
        }).fail(function(e) {
          return callback(e);
        });
      } else {
        return callback(null);
      }
    };
    return launchInstall(install_data);
  };
};
