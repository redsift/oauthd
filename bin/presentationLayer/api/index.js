var Path, Url, async, engine, fs, restify;

restify = require('restify');

async = require('async');

fs = require('fs');

Path = require('path');

Url = require('url');

engine = {};

module.exports = function(env) {
  return {
    init: function() {
      env.server.opts(/^\/api\/.*$/, (function(_this) {
        return function(req, res, next) {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
          return res.send(200);
        };
      })(this));
      return env.server.use((function(_this) {
        return function(req, res, next) {
          if (req.url.match(/^\/api\/.*$/)) {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
          }
          return next();
        };
      })(this));
    },
    registerWs: function() {
      env.server.post('/api/apps', env.middlewares.auth.needed, (function(_this) {
        return function(req, res, next) {
          return env.data.apps.create(req.body, req.user, function(error, result) {
            if (error) {
              return next(error);
            }
            env.events.emit('app.create', req.user, result);
            res.send({
              name: result.name,
              key: result.key,
              domains: result.domains
            });
            return next();
          });
        };
      })(this));
      env.server.get('/api/apps/:key', env.middlewares.auth.needAccess('read'), (function(_this) {
        return function(req, res, next) {
          return async.parallel([
            function(cb) {
              return env.data.apps.get(req.params.key, cb);
            }, function(cb) {
              return env.data.apps.getDomains(req.params.key, cb);
            }, function(cb) {
              return env.data.apps.getKeysets(req.params.key, cb);
            }, function(cb) {
              return env.data.apps.getBackend(req.params.key, cb);
            }
          ], function(e, r) {
            var app;
            if (e) {
              return next(e);
            }
            app = r[0];
            delete app.id;
            app.domains = r[1];
            app.keysets = r[2];
            app.backend = r[3];
            res.send(app);
            return next();
          });
        };
      })(this));
      env.server.post('/api/apps/:key', env.middlewares.auth.needAccess('update'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.update(req.params.key, req.body, env.send(res, next));
        };
      })(this));
      env.server.del('/api/apps/:key', env.middlewares.auth.needed, (function(_this) {
        return function(req, res, next) {
          return env.data.apps.get(req.params.key, function(e, app) {
            if (e) {
              return next(e);
            }
            return env.data.apps.remove(req.params.key, function(e, r) {
              if (e) {
                return next(e);
              }
              env.events.emit('app.remove', req.user, app);
              res.send(env.utilities.check.nullv);
              return next();
            });
          });
        };
      })(this));
      env.server.post('/api/apps/:key/reset', env.middlewares.auth.needAccess('update'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.resetKey(req.params.key, env.send(res, next));
        };
      })(this));
      env.server.get('/api/apps/:key/domains', env.middlewares.auth.needAccess('read'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.getDomains(req.params.key, env.send(res, next));
        };
      })(this));
      env.server.post('/api/apps/:key/domains', env.middlewares.auth.needAccess('update'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.updateDomains(req.params.key, req.body.domains, env.send(res, next));
        };
      })(this));
      env.server.post('/api/apps/:key/domains/:domain', env.middlewares.auth.needAccess('update'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.addDomain(req.params.key, req.params.domain, env.send(res, next));
        };
      })(this));
      env.server.del('/api/apps/:key/domains/:domain', env.middlewares.auth.needAccess('update'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.remDomain(req.params.key, req.params.domain, env.send(res, next));
        };
      })(this));
      env.server.get('/api/apps/:key/keysets', env.middlewares.auth.needAccess('read'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.getKeysets(req.params.key, env.send(res, next));
        };
      })(this));
      env.server.get('/api/apps/:key/keysets/:provider', env.middlewares.auth.needAccess('read'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.getKeyset(req.params.key, req.params.provider, env.send(res, next));
        };
      })(this));
      env.server.post('/api/apps/:key/keysets/:provider', env.middlewares.auth.needAccess('update'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.addKeyset(req.params.key, req.params.provider, req.body, env.send(res, next));
        };
      })(this));
      env.server.del('/api/apps/:key/keysets/:provider', env.middlewares.auth.needAccess('update'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.remKeyset(req.params.key, req.params.provider, env.send(res, next));
        };
      })(this));
      env.server.get('/api/apps/:key/access', env.middlewares.auth.needAccess('read'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.getAccessList(req.params.key, env.send(res, next));
        };
      })(this));
      env.server.post('/api/apps/:key/access', env.middlewares.auth.needed, (function(_this) {
        return function(req, res, next) {
          var ref, ref1;
          return env.data.apps.setAccess(req.params.key, (ref = req.body) != null ? ref.id : void 0, (ref1 = req.body) != null ? ref1.access : void 0, env.send(res, next));
        };
      })(this));
      env.server.get('/api/providers', env.middlewares.auth.optional, (function(_this) {
        return function(req, res, next) {
          return env.data.providers.getList(env.send(res, next), req.user);
        };
      })(this));
      env.server.get('/api/apps/:key/backend', env.middlewares.auth.needAccess('read'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.getBackend(req.params.key, env.send(res, next));
        };
      })(this));
      env.server.post('/api/apps/:key/backend/:backend', env.middlewares.auth.needAccess('update'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.setBackend(req.params.key, req.params.backend, req.body, env.send(res, next));
        };
      })(this));
      env.server.del('/api/apps/:key/backend', env.middlewares.auth.needAccess('update'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.remBackend(req.params.key, env.send(res, next));
        };
      })(this));
      env.server.get('/api/apps/:key/options', env.middlewares.auth.needAccess('read'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.getOptions(req.params.key, env.send(res, next));
        };
      })(this));
      env.server.post('/api/apps/:key/options', env.middlewares.auth.needAccess('update'), (function(_this) {
        return function(req, res, next) {
          return env.data.apps.setOptions(req.params.key, req.body, env.send(res, next));
        };
      })(this));
      env.server.get('/api/providers/:provider', env.cors_middleware, (function(_this) {
        return function(req, res, next) {
          if (req.query.extend) {
            return env.data.providers.getExtended(req.params.provider, env.send(res, next));
          } else {
            return env.data.providers.get(req.params.provider, env.send(res, next));
          }
        };
      })(this));
      env.server.get('/api/providers/:provider/settings', env.cors_middleware, (function(_this) {
        return function(req, res, next) {
          return env.data.providers.getSettings(req.params.provider, env.send(res, next));
        };
      })(this));
      env.server.get('/api/providers/:provider/user-mapping', env.cors_middleware, (function(_this) {
        return function(req, res, next) {
          return env.data.providers.getMeMapping(req.params.provider, env.send(res, next));
        };
      })(this));
      env.server.get('/api/providers/:provider/logo', env.bootPathCache(), ((function(_this) {
        return function(req, res, next) {
          var base;
          if ((base = env.middlewares).providerLogo == null) {
            base.providerLogo = function(req, res, next) {
              return next();
            };
          }
          return fs.exists(Path.normalize(env.config.rootdir + '/providers/' + req.params.provider), function(exists) {
            if (!exists) {
              return env.middlewares.providerLogo(req, res, next);
            } else {
              return fs.exists(Path.normalize(env.config.rootdir + '/providers/' + req.params.provider + '/logo.png'), function(exists) {
                if (!exists) {
                  req.params.provider = 'default';
                }
                req.url = '/' + req.params.provider + '/logo.png';
                req._url = Url.parse(req.url);
                req._path = req._url._path;
                return next();
              });
            }
          });
        };
      })(this)), restify.serveStatic({
        directory: env.config.rootdir + '/providers',
        maxAge: env.config.cacheTime
      }));
      env.server.get('/api/providers/:provider/:file', env.bootPathCache(), ((function(_this) {
        return function(req, res, next) {
          req.url = '/' + req.params.provider + '/' + req.params.file;
          req._url = Url.parse(req.url);
          req._path = req._url._path;
          return next();
        };
      })(this)), restify.serveStatic({
        directory: env.config.rootdir + '/providers',
        maxAge: env.config.cacheTime
      }));
      env.server.get('/api/plugins', env.middlewares.auth.needed, (function(_this) {
        return function(req, res, next) {
          return env.scaffolding.plugins.info.getPluginsJson({
            activeOnly: true
          }).then(function(data) {
            return res.send(Object.values(data));
          }).fail(function(e) {
            env.debug(e);
            return res.send(400, 'Error reading the plugins data');
          });
        };
      })(this));
      env.server.get('/api/plugins/:plugin_name', env.middlewares.auth.needed, (function(_this) {
        return function(req, res, next) {
          return env.scaffolding.plugins.info.getInfo(req.params.plugin_name).then(function(data) {
            return res.send(data);
          }).fail(function(e) {
            env.debug(e);
            return res.send(400, 'Error reading the plugin data');
          });
        };
      })(this));
      env.server.get('/api/host_url', env.middlewares.auth.needed, (function(_this) {
        return function(req, res, next) {
          res.send(env.config.host_url);
          return next();
        };
      })(this));
      env.server.get('/api/config', env.middlewares.auth.needed, (function(_this) {
        return function(req, res, next) {
          res.send(env.config);
          return next();
        };
      })(this));
      return env.server.get('/api/extended-endpoints', function(req, res, next) {
        res.send(env.pluginsEngine.getExtendedEndpoints());
        return next();
      });
    }
  };
};
