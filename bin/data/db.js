var async, crypto;

crypto = require('crypto');

async = require('async');

module.exports = function(env) {
  var Redis, _multi, config, data, exit, oldhgetall, oldkeys, redis, redis_options;
  data = {};
  config = env.config;
  if (env.mode !== 'test') {
    Redis = require('ioredis');
    redis_options = {
      port: config.redis.port || 6379,
      host: config.redis.host || '127.0.0.1',
      db: config.redis.database || 0,
      retryStrategy: (function(_this) {
        return function(times) {
          return Math.min(times * 100, 2000);
        };
      })(this)
    };
    if (config.redis.password) {
      redis_options.password = config.redis.password;
    }
    data.redis = new Redis(redis_options);
    _multi = data.redis.multi;
    data.redis.multi = (function(_this) {
      return function(commands) {
        var _exec, pipeline;
        pipeline = commands ? _multi.call(data.redis, commands) : _multi.call(data.redis);
        _exec = pipeline.exec;
        pipeline.exec = function(cb) {
          return _exec.call(pipeline, function(err, res) {
            var k, r;
            if (err) {
              return cb(err);
            }
            for (k in res) {
              r = res[k];
              if (r[0]) {
                err = r[0];
              }
              res[k] = r[1];
            }
            if (err) {
              return cb(err);
            }
            return cb(null, res);
          });
        };
        return pipeline;
      };
    })(this);
  } else {
    redis = require('fakeredis');
    data.redis = redis.createClient(config.redis.port || 6379, config.redis.host || '127.0.0.1', config.redis.options || {});
    if (config.redis.password) {
      data.redis.auth(config.redis.password);
    }
    if (config.redis.database) {
      data.redis.select(config.redis.database);
    }
  }
  exit = env.utilities.exit;
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
  data.redis.on('error', function(err) {
    data.redis.last_error = 'Error while connecting to redis DB (' + err.message + ')';
    return console.log(err);
  });
  exit.push('Redis db', function(callback) {
    var e, error;
    try {
      if (data.redis) {
        data.redis.quit();
      }
    } catch (error) {
      e = error;
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
