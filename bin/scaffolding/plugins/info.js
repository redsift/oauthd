var Q, async, fs, jf, sugar,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

jf = require('jsonfile');

Q = require('q');

fs = require('fs');

sugar = require('sugar');

async = require('async');

module.exports = function(env) {
  var exec, info;
  exec = env.exec;
  info = {
    getPluginsJson: function(opts) {
      var defer;
      defer = Q.defer();
      if (opts == null) {
        opts = {};
      }
      fs.readFile(process.cwd() + '/plugins.json', {
        encoding: 'UTF-8'
      }, function(err, data) {
        var e, obj, plugins_json, plugins_names;
        if (err) {
          return defer.reject(err);
        }
        try {
          obj = JSON.parse(data);
          plugins_json = [];
          plugins_names = Object.keys(obj);
          return async.eachSeries(plugins_names, function(plugin_name, next) {
            var include_plugin, str, value;
            value = obj[plugin_name];
            include_plugin = true;
            if (value.active == null) {
              value.active = true;
            }
            if (typeof value === 'string') {
              str = value.split('#');
              data = {};
              if (str[0] !== '') {
                data.repository = str[0];
                data.version = str[1];
              }
              data.active = true;
              value = data;
            } else if (typeof value === 'object') {
              if (opts.activeOnly && value.active === false) {
                include_plugin = false;
              }
            } else {
              include_plugin = false;
            }
            if (include_plugin) {
              return info.getInfo(plugin_name).then(function(plugin_info) {
                var k, v;
                if (typeof plugin_info === 'object') {
                  for (k in plugin_info) {
                    v = plugin_info[k];
                    if (k !== 'version' && k !== 'active' && k !== 'repository') {
                      value[k] = v;
                    }
                  }
                }
                if (value.repository != null) {
                  if (value.version == null) {
                    value.version = 'master';
                  }
                }
                if (value.active == null) {
                  value.active = true;
                }
                plugins_json[plugin_name] = value;
                return next();
              }).fail(function(e) {
                plugins_json[plugin_name] = {
                  name: plugin_name,
                  active: true
                };
                if (value.repository != null) {
                  if (value.version == null) {
                    value.version = 'master';
                  }
                  plugins_json[plugin_name].repository = value.repository;
                  plugins_json[plugin_name].version = value.version;
                }
                return next();
              });
            } else {
              return next();
            }
          }, function() {
            return defer.resolve(plugins_json);
          });
        } catch (_error) {
          e = _error;
          return defer.reject(e);
        }
      });
      return defer.promise;
    },
    getActive: function() {
      var defer;
      defer = Q.defer();
      info.getPluginsJson({
        activeOnly: true
      }).then(function(plugins) {
        return defer.resolve(plugins);
      }).fail(function(e) {
        return defer.reject(e);
      });
      return defer.promise;
    },
    getInstalled: function() {
      var defer;
      defer = Q.defer();
      fs.readdir(process.cwd() + '/plugins', function(err, folder_names) {
        var installed_plugins;
        installed_plugins = [];
        return async.eachSeries(folder_names, function(name, next) {
          return fs.stat(process.cwd() + '/plugins/' + name, function(err, stat) {
            if (err) {
              defer.reject(err);
            }
            if (stat.isDirectory()) {
              installed_plugins.push(name);
            }
            return next();
          });
        }, function() {
          return defer.resolve(installed_plugins);
        });
      });
      return defer.promise;
    },
    getInactive: function() {
      var active_plugins, defer, installed_plugins;
      defer = Q.defer();
      installed_plugins = void 0;
      active_plugins = void 0;
      info.getInstalled().then(function(_installed) {
        installed_plugins = _installed;
        return info.getActive();
      }).then(function(_active) {
        var i, inactive_plugins, len, plugin;
        active_plugins = Object.keys(_active);
        inactive_plugins = [];
        for (i = 0, len = installed_plugins.length; i < len; i++) {
          plugin = installed_plugins[i];
          if (indexOf.call(active_plugins, plugin) < 0) {
            inactive_plugins.push(plugin);
          }
        }
        return defer.resolve(inactive_plugins);
      }).fail(function(e) {
        return defer.reject(e);
      });
      return defer.promise;
    },
    getInfo: function(plugin_name, callback) {
      var defer;
      defer = Q.defer();
      fs.readFile(process.cwd() + '/plugins/' + plugin_name + '/plugin.json', {
        encoding: 'UTF-8'
      }, function(err, data) {
        var plugin_data;
        if (err) {
          if (err.code === 'ENOENT') {
            return defer.reject(new Error('No plugin.json'));
          } else {
            return defer.reject(err);
          }
        }
        try {
          plugin_data = JSON.parse(data);
          return env.plugins.git(plugin_name).then(function(plugin_git) {
            return plugin_git.getCurrentVersion().then(function(v) {
              plugin_data.version = v.version;
              return defer.resolve(plugin_data);
            }).fail(function() {
              return defer.reject(plugin_data);
            });
          }).fail(function(err) {
            return defer.reject(err);
          });
        } catch (_error) {
          err = _error;
          return defer.reject(err);
        }
      });
      return defer.promise;
    },
    getVersion: function(url, callback) {
      var repo_url, tmpArray, version;
      version = null;
      tmpArray = url.split("#");
      repo_url = tmpArray[0];
      if (tmpArray.length > 1) {
        version = tmpArray[1];
      }
      return callback(repo_url, version);
    },
    isActive: function(name) {
      var obj, plugin_names;
      obj = jf.readFileSync(process.cwd() + '/plugins.json');
      plugin_names = [];
      if (obj != null) {
        plugin_names = Object.keys(obj);
      }
      return plugin_names.indexOf(name) > -1;
    },
    folderExist: function(folder_name) {
      var stat;
      stat = fs.statSync(process.cwd() + '/plugins/' + folder_name);
      return stat.isDirectory();
    },
    getTargetVersion: function(name) {
      var defer;
      defer = Q.defer();
      env.plugins.git(name).then(function(plugin_git) {
        return plugin_git.getVersionMask().then(function(mask) {
          return plugin_git.getLatestVersion(mask).then(function(version) {
            return defer.resolve(version);
          });
        }).fail(function(e) {
          return defer.reject(e);
        });
      }).fail(function(err) {
        return defer.reject(err);
      });
      return defer.promise;
    }
  };
  return info;
};
