var async, crypto;

crypto = require('crypto');

async = require('async');

module.exports = function(env) {
  var config, data, exit, oldhgetall, oldkeys, redis;
  data = {};
  if (env.mode !== 'test') {
    redis = require('redis');
  } else {
    redis = require('fakeredis');
  }
  config = env.config;
  exit = env.utilities.exit;
  data.redis = redis.createClient(config.redis.port || 6379, config.redis.host || '127.0.0.1', config.redis.options || {});
  if (config.redis.password) {
    data.redis.auth(config.redis.password);
  }
  if (config.redis.database) {
    data.redis.select(config.redis.database);
  }
  oldkeys = data.redis.keys;
  data.redis.keys = function(pattern, cb) {
    var cursor, keys_response;
    keys_response = [];
    cursor = -1;
    return async.whilst(function() {
      return cursor !== '0';
    }, function(next) {
      if (cursor === -1) {
        cursor = 0;
      }
      return data.redis.send_command('SCAN', [cursor, 'MATCH', pattern, 'COUNT', 100000], function(err, response) {
        var keys_array;
        if (err) {
          return next(err);
        }
        cursor = response[0];
        keys_array = response[1];
        keys_response = keys_response.concat(keys_array);
        return next();
      });
    }, function(err) {
      if (err) {
        return cb(err);
      }
      return cb(null, keys_response);
    });
  };
  oldhgetall = data.redis.hgetall;
  data.redis.hgetall = function(key, pattern, cb) {
    var cursor, final_response;
    if (cb == null) {
      cb = pattern;
      pattern = '*';
    }
    final_response = {};
    cursor = void 0;
    return async.whilst(function() {
      return cursor !== '0';
    }, function(next) {
      if (cursor === void 0) {
        cursor = 0;
      }
      return data.redis.send_command('HSCAN', [key, cursor, 'MATCH', pattern, 'COUNT', 100], function(err, response) {
        var array, i, j, ref;
        if (err) {
          return next(err);
        }
        cursor = response[0];
        array = response[1];
        for (i = j = 0, ref = array.length; j <= ref; i = j += 2) {
          if (array[i] && array[i + 1]) {
            final_response[array[i]] = array[i + 1];
          }
        }
        return next();
      });
    }, function(err) {
      if (err) {
        return cb(err);
      }
      return cb(null, final_response);
    });
  };
  data.redis.on('connect', function() {
    return console.log('managed to connect!');
  });
  data.redis.on('reconnecting', function(r) {
    return console.log('reconnecting... ', r.attempt);
  });
  data.redis.on('error', function(err) {
    data.redis.last_error = 'Error while connecting to redis DB (' + err.message + ')';
    return console.log(err);
  });
  exit.push('Redis db', function(callback) {
    var e;
    try {
      if (data.redis) {
        data.redis.quit();
      }
    } catch (_error) {
      e = _error;
      return callback(e);
    }
    return callback();
  });
  data.generateUid = function(data) {
    var shasum, uid;
    if (data == null) {
      data = '';
    }
    shasum = crypto.createHash('sha1');
    shasum.update(config.publicsalt);
    shasum.update(data + (new Date).getTime() + ':' + Math.floor(Math.random() * 9999999));
    uid = shasum.digest('base64');
    return uid.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, '');
  };
  data.generateHash = function(data) {
    var shasum;
    shasum = crypto.createHash('sha1');
    shasum.update(config.staticsalt + data);
    return shasum.digest('base64');
  };
  data.emptyStrIfNull = function(val) {
    if ((val == null) || val.length === 0) {
      return new String("");
    }
    return val;
  };
  return data;
};
