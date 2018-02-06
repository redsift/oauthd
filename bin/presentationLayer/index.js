var fs, restify;

restify = require('restify');

fs = require('fs');

module.exports = function(env) {
  var api, auth, sdk;
  api = require('./api')(env);
  sdk = require('./sdk')(env);
  auth = require('./auth')(env);
  env.server.send = env.send = function(res, next) {
    return function(e, r) {
      if (e) {
        return next(e);
      }
      res.send((r != null ? r : env.utilities.check.nullv));
      return next();
    };
  };
  api.init();
  env.bootPathCache = (function(_this) {
    return function() {
      var chain;
      chain = restify.conditionalRequest();
      chain.unshift(function(req, res, next) {
        res.set('ETag', env.data.generateHash(req.path() + ':' + env.config.bootTime));
        return next();
      });
      return chain;
    };
  })(this);
  env.cors_middleware = function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    return next();
  };
  env.fixUrl = (function(_this) {
    return function(ref) {
      return ref.replace(/^([a-zA-Z\-_]+:\/)([^\/])/, '$1/$2');
    };
  })(this);
  sdk.registerWs();
  api.registerWs();
  return auth.registerWs();
};
