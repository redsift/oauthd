var Q, Url, async, colors, fs, jf, restify;

async = require('async');

jf = require('jsonfile');

fs = require('fs');

colors = require('colors');

Q = require('q');

restify = require('restify');

Url = require('url');

module.exports = function(env) {
  var extended_endpoints, global_interface, loadPlugin, pluginsEngine;
  env.debug('Initializing plugins engine');
  pluginsEngine = {
    plugin: {}
  };
  pluginsEngine.cwd = process.cwd();
  env.plugins = pluginsEngine.plugin;
  env.hooks = {
    'connect.auth': [],
    'connect.callback': [],
    'connect.backend': []
  };
  env.callhook = function() {
    var args, callback, cmds, fn1, hook, i, len, name, ref;
    name = Array.prototype.slice.call(arguments);
    args = name.splice(1);
    name = name[0];
    callback = args.splice(-1);
    callback = callback[0];
    if (!env.hooks[name]) {
      return callback();
    }
    cmds = [];
    args[args.length] = null;
    ref = env.hooks[name];
    fn1 = function(hook) {
      return cmds.push(function(cb) {
        args[args.length - 1] = cb;
        return hook.apply(pluginsEngine.data, args);
      });
    };
    for (i = 0, len = ref.length; i < len; i++) {
      hook = ref[i];
      fn1(hook);
    }
    return async.series(cmds, callback);
  };
  env.addhook = function(name, fn) {
    var base;
    if ((base = env.hooks)[name] == null) {
      base[name] = [];
    }
    return env.hooks[name].push(fn);
  };
  global_interface = void 0;
  pluginsEngine.load = function(plugin_name) {
    var e, error, plugin_data;
    try {
      plugin_data = require(env.pluginsEngine.cwd + '/plugins/' + plugin_name + '/plugin.json');
    } catch (error) {
      e = error;
      plugin_data = {
        name: plugin_name
      };
    }
    if (plugin_data.main != null) {
      if (plugin_data.main[0] !== '/') {
        plugin_data.main = '/' + plugin_data.main;
      }
    } else {
      plugin_data.main = '/index';
    }
    if ((plugin_data.name == null) || plugin_data.name !== plugin_name) {
      plugin_data.name = plugin_name;
    }
    if (plugin_data.type !== 'global-interface') {
      return loadPlugin(plugin_data);
    } else {
      return global_interface = plugin_data;
    }
  };
  loadPlugin = function(plugin_data) {
    var e, error, plugin, ref, ref1;
    if (!fs.existsSync(env.pluginsEngine.cwd + '/plugins/' + plugin_data.name)) {
      env.debug("Cannot find addon " + plugin_data.name);
      return;
    }
    env.debug("Loading " + plugin_data.name.blue);
    try {
      plugin = require(env.pluginsEngine.cwd + '/plugins/' + plugin_data.name + plugin_data.main)(env);
      if (plugin_data.type != null) {
        pluginsEngine.plugin[plugin_data.type] = plugin;
        return (ref = pluginsEngine.plugin[plugin_data.type]) != null ? ref.plugin_config = plugin_data : void 0;
      } else {
        pluginsEngine.plugin[plugin_data.name] = plugin;
        return (ref1 = pluginsEngine.plugin[plugin_data.name]) != null ? ref1.plugin_config = plugin_data : void 0;
      }
    } catch (error) {
      e = error;
      env.debug("Error while loading plugin " + plugin_data.name);
      return env.debug(e.stack.yellow);
    }
  };
  pluginsEngine.init = function(cwd, callback) {
    env.pluginsEngine.cwd = cwd;
    return env.scaffolding.plugins.info.getPluginsJson({
      activeOnly: true
    }).then(function(obj) {
      var data, pluginname, stat;
      if (obj == null) {
        obj = {};
      }
      for (pluginname in obj) {
        data = obj[pluginname];
        stat = fs.statSync(cwd + '/plugins/' + pluginname);
        if (stat.isDirectory()) {
          pluginsEngine.load(pluginname);
        }
      }
      if (global_interface != null) {
        loadPlugin(global_interface);
      }
      return callback(null);
    }).fail(function(e) {
      return callback(e);
    });
  };
  pluginsEngine.list = function(callback) {
    var list;
    list = [];
    return env.scaffolding.plugins.info.getPluginsJson({
      activeOnly: true
    }).then(function(obj) {
      var key, value;
      if (obj != null) {
        for (key in obj) {
          value = obj[key];
          list.push(key);
        }
      }
      return callback(null, list);
    }).fail(function(err) {
      env.debug('An error occured: ' + err);
      return callback(err);
    });
  };
  pluginsEngine.run = function(name, args, callback) {
    var calls, k, plugin, ref;
    if (typeof args === 'function') {
      callback = args;
      args = [];
    }
    args.push(null);
    calls = [];
    ref = pluginsEngine.plugin;
    for (k in ref) {
      plugin = ref[k];
      if (typeof plugin[name] === 'function') {
        (function(plugin) {
          return calls.push(function(cb) {
            args[args.length - 1] = cb;
            return plugin[name].apply(env, args);
          });
        })(plugin);
      }
    }
    async.series(calls, function() {
      args.pop();
      callback.apply(null, arguments);
    });
  };
  pluginsEngine.runSync = function(name, args) {
    var k, plugin, ref;
    ref = pluginsEngine.plugin;
    for (k in ref) {
      plugin = ref[k];
      if (typeof plugin[name] === 'function') {
        plugin[name].apply(env, args);
      }
    }
  };
  pluginsEngine.loadPluginPages = function(server) {
    var defer;
    defer = Q.defer();
    env.scaffolding.plugins.info.getPluginsJson().then(function(plugins) {
      var plugin, plugin_name;
      for (plugin_name in plugins) {
        plugin = plugins[plugin_name];
        if (plugin.interface_enabled) {
          (function(plugin) {
            return server.get(new RegExp("^/plugins/" + plugin.name + "/(.*)"), function(req, res, next) {
              var base;
              if ((base = req.params)[0] == null) {
                base[0] = "";
              }
              req.url = req.params[0];
              req._url = Url.parse(req.url);
              req._path = req._url.pathname;
              return fs.stat(process.cwd() + '/plugins/' + plugin.name + '/public/' + req.params[0], function(err, stat) {
                if ((stat != null ? stat.isFile() : void 0) && req.params[0] !== 'index.html') {
                  next();
                } else {
                  return fs.readFile(process.cwd() + '/plugins/' + plugin.name + '/public/index.html', {
                    encoding: 'UTF-8'
                  }, function(err, data) {
                    var data2;
                    if (err) {
                      res.send(404);
                      return;
                    }
                    res.setHeader('Content-Type', 'text/html');
                    data2 = data.replace(/\{\{ plugin_name \}\}/g, plugin.name);
                    res.send(200, data2);
                  });
                }
              });
            }, restify.serveStatic({
              directory: process.cwd() + '/plugins/' + plugin.name + '/public'
            }));
          })(plugin);
        }
      }
      return defer.resolve();
    });
    return defer.promise;
  };
  extended_endpoints = [];
  pluginsEngine.describeAPIEndpoint = function(endpoint_description) {
    return extended_endpoints.push(endpoint_description);
  };
  pluginsEngine.getExtendedEndpoints = function() {
    return extended_endpoints;
  };
  return pluginsEngine;
};
