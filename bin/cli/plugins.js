var Q, async, colors, exec, fs, ncp, scaffolding, sugar;

fs = require('fs');

ncp = require('ncp');

exec = require('child_process').exec;

Q = require('q');

scaffolding = require('../scaffolding')({
  console: true
});

colors = require('colors');

sugar = require('sugar');

async = require('async');

module.exports = function(args, options) {
  return {
    help: function(command) {
      if (command == null) {
        console.log('Usage: oauthd plugins <command> [args]');
        console.log('');
        console.log('Available commands');
        console.log('    oauthd plugins ' + 'list'.yellow + '\t\t\t\t' + 'Lists installed plugins');
        console.log('    oauthd plugins ' + 'create'.yellow + ' <name>' + '\t\t' + 'Creates a new plugin');
        console.log('    oauthd plugins ' + 'install'.yellow + ' [git-repository]' + '\t' + 'Installs a plugin');
        console.log('    oauthd plugins ' + 'uninstall'.yellow + ' <name>' + '\t\t' + 'Removes a plugin');
        console.log('    oauthd plugins ' + 'activate'.yellow + ' <name>' + '\t\t' + 'Activates a plugin');
        console.log('    oauthd plugins ' + 'deactivate'.yellow + ' <name>' + '\t\t' + 'Deactivates a plugin');
        console.log('');
        console.log('oauthd plugins <command> ' + '--help'.green + ' for more information about a specific command');
      }
      if (command === 'list') {
        console.log('Usage: oauthd plugins ' + 'list'.yellow);
        console.log('Lists all installed plugins');
      }
      if (command === 'activate') {
        console.log('Usage: oauthd plugins ' + 'activate <name>'.yellow);
        console.log('Activates a plugin (puts it in the plugins.json file)');
      }
      if (command === 'deactivate') {
        console.log('Usage: oauthd plugins ' + 'deactivate <name>'.yellow);
        console.log('Deactivates a plugin (removes it from the plugins.json file)');
      }
      if (command === 'create') {
        console.log('Usage: oauthd plugins ' + 'create <name>'.yellow);
        console.log('Creates a new plugin in ./plugins/<name> with a basic architecture');
        console.log('');
        console.log('Options:');
        console.log('    ' + '--force'.yellow + '\t\t' + 'Creates the plugin even if another one with same name, overriding it');
        console.log('    ' + '--inactive'.yellow + '\t\t' + 'Prevents oauthd from adding the plugin to plugins.json');
      }
      if (command === 'install') {
        console.log('Usage: oauthd plugins ' + 'install [git-repository]'.yellow);
        console.log('Installs a plugin using a git repository.');
        console.log('If no argument is given, installs all plugins listed in plugins.json');
        console.log('');
        console.log('Options:');
        console.log('    ' + '--force'.yellow + '\t' + 'Installs the plugin even if already present, overriding it');
      }
      if (command === 'update') {
        console.log('Usage: oauthd plugins ' + 'update [name]'.yellow);
        console.log('Updates a plugin using its git repository. If no argument is given, updates all plugins listed in plugins.json');
        console.log('');
        console.log('Options:');
        console.log('    ' + '--verbose'.yellow + '\t' + 'Get more details about update process');
      }
      if (command === 'uninstall') {
        console.log('Usage: oauthd plugins ' + 'uninstall <name>'.yellow);
        console.log('Uninstalls a given plugin');
      }
      if (command === 'info') {
        console.log('Usage: oauthd plugins ' + 'info [name]'.yellow);
        console.log('If no argument is given, show info of all plugins listed in plugins.json');
        console.log('');
        console.log('Options:');
        return console.log('    ' + '--fetch'.yellow + '\t' + 'Fetch plugins repository, to get updates availability (a bit longer)');
      }
    },
    command: function() {
      var active, arg, chainPluginsInstall, chainPluginsUpdate, doGetInfo, elt, force, i, inactive, installed, len, main_defer, name, plugin_data, plugin_git, plugin_name, save;
      main_defer = Q.defer();
      if (args[0] === 'list') {
        if (options.help) {
          this.help('list');
        } else {
          active = void 0;
          inactive = void 0;
          installed = void 0;
          scaffolding.plugins.info.getActive().then(function(_active) {
            active = _active;
            return scaffolding.plugins.info.getInactive();
          }).then(function(_inactive) {
            inactive = _inactive;
            return scaffolding.plugins.info.getInstalled();
          }).then(function(_installed) {
            var i, len, name, results, value;
            installed = _installed;
            console.log('This instance has ' + (installed.length + ' installed plugin(s):').white);
            console.log(((Object.keys(active)).length + ' active plugin(s)').green);
            for (name in active) {
              value = active[name];
              console.log('- ' + name);
            }
            console.log((inactive.length + ' inactive plugin(s)').yellow);
            results = [];
            for (i = 0, len = inactive.length; i < len; i++) {
              name = inactive[i];
              results.push(console.log('- ' + name));
            }
            return results;
          });
        }
        return main_defer.promise;
      }
      if (args[0] === 'uninstall') {
        if (options.help) {
          this.help('uninstall');
        } else {
          args.shift();
          plugin_name = "";
          for (i = 0, len = args.length; i < len; i++) {
            elt = args[i];
            if (plugin_name !== "") {
              plugin_name += " ";
            }
            plugin_name += elt;
          }
          scaffolding.plugins.uninstall(plugin_name);
        }
        return main_defer.promise;
      }
      chainPluginsInstall = function(plugins_data) {
        return async.eachSeries(plugins_data, function(plugin_data, next) {
          return scaffolding.plugins.install(plugin_data, false).then(function() {
            return next();
          }).fail(function(e) {
            return next();
          });
        }, function(err) {
          return scaffolding.compile().then(function() {
            return main_defer.resolve();
          }).fail(function() {
            return main_defer.reject();
          });
        });
      };
      if (args[0] === 'install') {
        if (options.help) {
          this.help('install');
        } else {
          arg = args[1];
          if (arg != null) {
            args = arg.split('#');
            plugin_data = {};
            plugin_data.repository = args[0];
            if (args[1]) {
              plugin_data.version = args[1];
            }
            scaffolding.plugins.install(plugin_data).then(function() {
              return scaffolding.compile();
            }).then(function() {
              return console.log('Done');
            }).fail(function(e) {
              return console.log('An error occured: '.red + e);
            });
          } else {
            scaffolding.plugins.info.getPluginsJson().then(function(plugins) {
              return chainPluginsInstall(Object.keys(plugins).map(function(k) {
                return plugins[k];
              }));
            }).fail(function(e) {
              return console.log('An error occured:', e.message);
            });
          }
        }
        return main_defer.promise;
      }
      if (args[0] === 'create') {
        if (options.help) {
          this.help('create');
        } else {
          force = options.force;
          save = !options.inactive;
          name = args[1];
          if (name) {
            scaffolding.plugins.create(name, force, save).then(function() {
              return defer.resolve();
            }).fail(function() {
              return defer.reject();
            });
          } else {
            defer.reject('Error'.red + ': ');
          }
        }
        return main_defer.promise;
      }
      if (args[0] === 'activate') {
        if (options.help || args.length !== 2) {
          this.help('activate');
        } else {
          scaffolding.plugins.activate(args[1]).then(function() {
            return console.log('Successfully activated '.green + args[1].green);
          }).fail(function(e) {
            console.log('An error occured while activating '.red + args[1].red + ':'.red);
            return console.log(e.message);
          });
        }
        return main_defer.promise;
      }
      if (args[0] === 'deactivate') {
        if (options.help || args.length !== 2) {
          this.help('deactivate');
        } else {
          scaffolding.plugins.deactivate(args[1]).then(function() {
            return console.log('Successfully deactivated '.green + args[1].green);
          }).fail(function(e) {
            console.log('An error occured while deactivating '.red + args[1].red + ':'.red);
            return console.log(e.message);
          });
        }
        return main_defer.promise;
      }
      chainPluginsUpdate = function(plugins) {
        var plugin_names;
        plugin_names = Object.keys(plugins);
        return async.eachSeries(plugin_names, function(name, next) {
          console.log('Updating '.white + name.white);
          return scaffolding.plugins.update(name).then(function(updated) {
            if (updated) {
              console.log('Succesfully updated '.green + name.green);
            } else {
              console.log(name + ' already up to date');
            }
            return next();
          }).fail(function(e) {
            console.log('Error while updating '.red + name.red + ':'.red);
            console.log(e.message);
            return next();
          });
        }, function(err) {
          return main_defer.reject(err);
          return main_defer.resolve();
        });
      };
      if (args[0] === 'update') {
        if (options.help) {
          this.help('update');
        } else {
          name = args[1];
          if (name) {
            if (scaffolding.plugins.info.isActive(name)) {
              console.log('Updating '.white + name.white);
              plugin_git = scaffolding.plugins.git(name);
              scaffolding.plugins.update(name).then(function(updated) {
                if (updated) {
                  console.log('Succesfully updated '.green + name.green + ' to '.green + updated.white);
                } else {
                  console.log(name + ' already up to date');
                }
                return main_defer.resolve();
              }).fail(function(e) {
                console.log('Error while updating '.red + name.red + ':'.red);
                console.log(e.message);
                return next();
              });
            } else {
              console.log("The plugin you want to update is not present in \'plugins.json\'.");
            }
          } else {
            scaffolding.plugins.info.getPluginsJson().then(function(plugins) {
              return chainPluginsUpdate(plugins);
            });
          }
        }
        return main_defer.promise;
      }
      doGetInfo = function(name, verbose, done, fetch) {
        return scaffolding.plugins.info.getInfo(name).then(function(plugin_data) {
          var error, ref, title;
          if (plugin_data == null) {
            return console.log('No plugin named ' + name + ' was found');
          }
          plugin_data = plugin_data || {
            name: name
          };
          error = '';
          if (plugin_data.name == null) {
            return done(null, null, true);
          }
          title = ((ref = plugin_data.name) != null ? ref.white : void 0) + ' ';
          return scaffolding.plugins.git(plugin_data.name, fetch).then(function(plugin_git) {
            var text;
            if ((plugin_data.description != null) && plugin_data.description !== "") {
              text = plugin_data.description + "\n";
            }
            if (text == null) {
              text = 'No description\n';
            }
            return plugin_git.getCurrentVersion().then(function(current_version) {
              if (current_version.type === 'branch') {
                return plugin_git.getVersionMask().then(function(mask) {
                  var update;
                  update = '';
                  if (!current_version.uptodate) {
                    update = ' (' + 'Updates available'.green + ')';
                  }
                  if (mask !== current_version.version) {
                    update += ' (plugins.json points \'' + mask + '\')';
                  }
                  title += '(' + current_version.version + ')' + update + "";
                  return done(title, text);
                });
              } else if (current_version.type === 'tag_n') {
                return plugin_git.getVersionMask().then(function(mask) {
                  return plugin_git.getLatestVersion(mask).then(function(latest_version) {
                    var update;
                    update = '';
                    if (plugin_git.isNumericalVersion(latest_version)) {
                      if (plugin_git.compareVersions(latest_version, current_version.version) > 0) {
                        update = ' (' + latest_version.green + ' is available)';
                      }
                    } else {
                      update = ' (plugins.json points \'' + latest_version + '\')';
                    }
                    title += '(' + current_version.version + ')' + update + "";
                    return done(title, text);
                  });
                });
              } else if (current_version.type === 'tag_a') {
                return plugin_git.getVersionMask().then(function(mask) {
                  title += '(tag ' + current_version.version + ')';
                  if (mask !== current_version.version) {
                    title += ' (plugins.json points \'' + mask + '\')';
                  }
                  return done(title, text);
                });
              } else if (current_version.type === 'unversionned') {
                title += "(unversionned)";
                return done(title, text);
              }
            }).fail(function(e) {
              return done(title, text);
            });
          }).fail(function(e) {
            if (verbose) {
              return console.log('Error with plugin \'' + name.white + '\':', e.message);
            }
          });
        }).fail(function(e) {
          if (verbose) {
            console.log('Error with plugin \'' + name.white + '\':', e.message);
          }
          return done(null, null, true);
        });
      };
      if (args[0] === 'info') {
        if (options.help) {
          this.help('info');
        } else {
          name = args[1];
          if (name) {
            doGetInfo(name, true, function(title, text, e) {
              if (title) {
                console.log(title);
                console.log(text);
              }
              if (e) {
                return console.log('Could not retrieve information for ' + name.white);
              }
            }, options.fetch);
          } else {
            scaffolding.plugins.info.getActive().then(function(plugins) {
              var errors_found, names;
              names = Object.keys(plugins);
              errors_found = false;
              return async.eachSeries(names, function(n, next) {
                return doGetInfo(n, options.verbose != null, function(title, text, e) {
                  if (e != null) {
                    errors_found = errors_found || e;
                  }
                  if (title != null) {
                    console.log(title);
                    if (text != null) {
                      console.log(text);
                    }
                  }
                  if (e && (options.verbose != null)) {
                    console.log('');
                  }
                  return next();
                }, options.fetch);
              }, function() {
                if (errors_found && (options.verbose == null)) {
                  console.log('Could not retrieve all plugins. Use ' + '--verbose'.white + ' for more information.');
                }
                return main_defer.resolve();
              });
            });
          }
        }
        return main_defer.promise;
      }
      if (args[0] != null) {
        console.log('Unknown command: ' + args[0].yellow);
      }
      if (!options.help) {
        this.help();
      }
      return main_defer.promise;
    }
  };
};
