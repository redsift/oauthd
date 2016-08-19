module.exports = function(env) {
  var PLModule, Path, bodyParser, cookieParser, fs, https, k, middleware, ref, restify, server, server_options, session;
  fs = require('fs');
  restify = require('restify');
  bodyParser = require("body-parser");
  cookieParser = require("cookie-parser");
  session = require("express-session");
  https = require('https');
  Path = require('path');
  PLModule = require('./presentationLayer');
  server_options = {
    name: 'oauthd',
    version: '1.0.0'
  };
  if (env.config.ssl) {
    server_options.key = fs.readFileSync(env.config.ssl.key);
    server_options.certificate = fs.readFileSync(env.config.ssl.certificate);
    if (env.config.ssl.ca) {
      server_options.ca = fs.readFileSync(env.config.ssl.ca);
    }
    env.debug('SSL is enabled !');
  }
  server_options.formatters = env.utilities.formatters.formatters;
  env.server = server = restify.createServer(server_options);
  env.pluginsEngine.runSync('raw');
  server.use(restify.queryParser());
  server.use(restify.bodyParser({
    mapParams: false
  }));
  server.use(restify.authorizationParser());
  ref = env.middlewares.always;
  for (k in ref) {
    middleware = ref[k];
    server.use(middleware);
  }
  return {
    listen: (function(_this) {
      return function(callback) {
        return env.pluginsEngine.loadPluginPages(env.server).then(function() {
          env.pluginsEngine.runSync('init');
          PLModule(env);
          return env.pluginsEngine.run('setup', (function(_this) {
            return function() {
              var listen_args;
              listen_args = [env.config.port];
              if (env.config.bind) {
                listen_args.push(env.config.bind);
              }
              listen_args.push(function(err) {
                if (err) {
                  return callback(err);
                }
                env.debug.display('%s listening at %s for %s', server.name, server.url, env.config.host_url);
                env.events.emit('server', null);
                return callback(null, server);
              });
              server.on('uncaughtException', function(req, res, route, err) {
                res.send(404);
              });
              return server.listen.apply(server, listen_args);
            };
          })(this));
        });
      };
    })(this)
  };
};
