var async;

async = require('async');

module.exports = function(env) {
  var check, config, exp;
  config = env.config;
  check = env.utilities.check;
  exp = {};
  exp.add = check({
    key: check.format.key,
    provider: check.format.provider,
    token: ['none', 'string'],
    expire: ['none', 'number'],
    oauthv: 'string',
    origin: ['none', 'string'],
    redirect_uri: ['none', 'string'],
    redirect_type: ['none', 'string'],
    options: ['none', 'object']
  }, function(data, callback) {
    var dbdata, id;
    id = env.data.generateUid();
    dbdata = {
      key: data.key,
      provider: data.provider
    };
    if (data.token) {
      dbdata.token = data.token;
    }
    if (data.expire) {
      dbdata.expire = (new Date()).getTime() + data.expire;
    }
    if (data.redirect_uri) {
      dbdata.redirect_uri = data.redirect_uri;
    }
    if (data.redirect_type) {
      dbdata.redirect_type = data.redirect_type;
    }
    if (data.oauthv) {
      dbdata.oauthv = data.oauthv;
    }
    if (data.origin) {
      dbdata.origin = data.origin;
    }
    if (data.options) {
      dbdata.options = JSON.stringify(data.options);
    }
    dbdata.step = 0;
    return env.data.redis.hmset('st:' + id, dbdata, function(err, res) {
      if (err) {
        return callback(err);
      }
      if (data.expire != null) {
        env.data.redis.expire('st:' + id, data.expire);
      }
      dbdata.id = id;
      return callback(null, dbdata);
    });
  });
  exp.get = check(check.format.key, function(id, callback) {
    return env.data.redis.hgetall('st:' + id, function(err, res) {
      if (err) {
        return callback(err);
      }
      if (!res || Object.keys(res).length === 0) {
        return callback();
      }
      if (res != null ? res.expire : void 0) {
        res.expire = parseInt(res.expire);
      }
      res.id = id;
      if (res.options) {
        res.options = JSON.parse(res.options);
      }
      return callback(null, res);
    });
  });
  exp.set = check(check.format.key, {
    token: ['none', 'string'],
    expire: ['none', 'number'],
    origin: ['none', 'string'],
    redirect_uri: ['none', 'string'],
    step: ['none', 'number']
  }, function(id, data, callback) {
    return env.data.redis.hmset('st:' + id, data, callback);
  });
  exp.del = check(check.format.key, function(id, callback) {
    return env.data.redis.del('st:' + id, callback);
  });
  exp.setToken = check(check.format.key, 'string', function(id, token, callback) {
    return env.data.redis.hset('st:' + id, 'token', token, callback);
  });
  return exp;
};
