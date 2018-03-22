module.exports = function(env) {
  var sdk_js;
  sdk_js = require('./sdk_js')(env);
  return {
    init: function() {},
    registerWs: function() {
      env.server.get('/auth/download/latest/oauth.js', env.bootPathCache(), function(req, res, next) {
        return sdk_js.get(function(e, r) {
          if (e) {
            return next(e);
          }
          res.setHeader('Content-Type', 'application/javascript');
          res.send(r);
          return next();
        });
      });
      return env.server.get('/auth/download/latest/oauth.min.js', env.bootPathCache(), function(req, res, next) {
        return sdk_js.getmin(function(e, r) {
          if (e) {
            return next(e);
          }
          res.setHeader('Content-Type', 'application/javascript');
          res.send(r);
          return next();
        });
      });
    }
  };
};
