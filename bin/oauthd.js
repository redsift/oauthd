var Path, Q, async, colors, qs;

Q = require('q');

Path = require('path');

async = require("async");

colors = require("colors");

qs = require('qs');

exports.init = function(env) {
  var coreModule, dataModule, defer, oldstringify, startTime;
  defer = Q.defer();
  startTime = new Date;
  env = env || {};
  env.scaffolding = require('./scaffolding')();
  coreModule = require('./core');
  dataModule = require('./data');
  coreModule(env).initEnv();
  coreModule(env).initConfig();
  coreModule(env).initUtilities();
  dataModule(env);
  coreModule(env).initOAuth();
  coreModule(env).initPluginsEngine();
  oldstringify = qs.stringify;
  qs.stringify = function() {
    var result;
    result = oldstringify.apply(qs, arguments);
    result = result.replace(/!/g, '%21');
    result = result.replace(/'/g, '%27');
    result = result.replace(/\(/g, '%28');
    result = result.replace(/\)/g, '%29');
    result = result.replace(/\*/g, '%2A');
    return result;
  };
  return env.pluginsEngine.init(process.cwd(), function(err) {
    var auth_plugin_present, k, plugin, ref, server;
    if (!err) {
      auth_plugin_present = false;
      ref = env.plugins;
      for (k in ref) {
        plugin = ref[k];
        if (plugin.plugin_config.type === 'auth') {
          auth_plugin_present = true;
        }
      }
      if (!auth_plugin_present) {
        console.error("No " + "auth".red + " plugin found");
        console.error("You need to install an " + "auth".red + " plugin to run the server");
        defer.reject();
        process.exit();
      }
      env.debug.display("oauthd start server");
      exports.server = server = require('./server')(env);
      async.series([env.data.providers.getList, server.listen], function(err) {
        if (err) {
          console.error('Error while initialisation', err.stack.toString());
          env.pluginsEngine.data.emit('server', err);
          return defer.reject(err);
        } else {
          env.debug.display('Server is ready (load time: ' + Math.round(((new Date) - startTime) / 10) / 100 + 's)', (new Date).toGMTString());
          return defer.resolve();
        }
      });
      return defer.promise;
    }
  });
};

exports.installPlugins = function() {
  return require('../bin/cli/plugins')(['install'], {}).command();
};
