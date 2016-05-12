var Q, async,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Q = require('q');

async = require('async');

module.exports = function(env) {
  var Entity;
  Entity = (function() {
    Entity.prefix = '';

    Entity.incr = '';

    Entity.indexes = [];

    Entity.properties = void 0;

    Entity.extendProperties = function(array) {
      var k, prop, results;
      if ((this.properties != null) && Array.isArray(this.properties)) {
        results = [];
        for (k in array) {
          prop = array[k];
          if (indexOf.call(this.properties, prop) < 0) {
            results.push(this.properties.push(prop));
          } else {
            results.push(void 0);
          }
        }
        return results;
      }
    };

    Entity.findById = function(id) {
      var defer, lapin;
      defer = Q.defer();
      lapin = new this(id);
      lapin.load().then(function() {
        return defer.resolve(lapin);
      }).fail(function(e) {
        return defer.reject(e);
      });
      return defer.promise;
    };

    Entity.findByIndex = function(field, index) {
      var defer;
      defer = Q.defer();
      env.data.redis.hget(this.indexes[field], index, (function(_this) {
        return function(err, id) {
          var entity;
          if (err) {
            return defer.reject(err);
          }
          entity = new _this(id);
          return entity.load().then(function() {
            return defer.resolve(entity);
          }).fail(function(e) {
            return defer.reject(e);
          });
        };
      })(this));
      return defer.promise;
    };

    Entity.onCreate = function(entity) {};

    Entity.onUpdate = function(entity) {};

    Entity.onSave = function(entity) {};

    Entity.onRemove = function(entity) {};

    Entity.onCreateAsync = function(entity, done) {
      return done();
    };

    Entity.onUpdateAsync = function(entity, done) {
      return done();
    };

    Entity.onSaveAsync = function(entity, done) {
      return done();
    };

    Entity.onRemoveAsync = function(entity, done) {
      return done();
    };

    Entity.prototype.id = 0;

    Entity.prototype.oldIndexesValues = {};

    Entity.prototype.props = {};

    Entity.prototype.prefix = function() {
      return this.constructor.prefix + ':' + this.id + ':';
    };

    function Entity(id) {
      this.id = id;
    }

    Entity.prototype.keys = function() {
      var array, defer, k, keys, ref, v;
      defer = Q.defer();
      keys = {};
      array = [];
      if ((this.constructor.properties != null) && Array.isArray(this.constructor.properties)) {
        ref = this.constructor.properties;
        for (k in ref) {
          v = ref[k];
          array.push(this.prefix() + v);
        }
        defer.resolve(array);
      } else {
        env.data.redis.keys(this.prefix() + '*', function(e, result) {
          if (e) {
            return defer.reject(e);
          } else {
            return defer.resolve(result);
          }
        });
      }
      return defer.promise;
    };

    Entity.prototype.typedKeys = function() {
      var defer, keys;
      defer = Q.defer();
      keys = {};
      this.keys().then((function(_this) {
        return function(result) {
          return async.eachSeries(result, function(key, next) {
            return env.data.redis.type(key, function(e, type) {
              var keyname;
              if (e) {
                return defer.reject(e);
              }
              if (type !== 'none') {
                keyname = key.replace(_this.prefix(), '');
                keys[keyname] = type;
              }
              return next();
            });
          }, function(e, final_result) {
            if (e) {
              return defer.reject(e);
            } else {
              return defer.resolve(keys);
            }
          });
        };
      })(this)).fail(function(e) {
        return defer.reject(e);
      });
      return defer.promise;
    };

    Entity.prototype.getAll = function() {
      var defer;
      defer = Q.defer();
      this.typedKeys().then((function(_this) {
        return function(keys) {
          var cmds, key, type;
          cmds = [];
          for (key in keys) {
            type = keys[key];
            if (type === 'hash') {
              cmds.push(['hgetall', _this.prefix() + key]);
            }
            if (type === 'string') {
              cmds.push(['get', _this.prefix() + key]);
            }
            if (type === 'set') {
              cmds.push(['smembers', _this.prefix() + key]);
            }
          }
          return env.data.redis.multi(cmds).exec(function(err, fields) {
            var array, k, key_pt, keyname, keys_array, obj_pt, object, v;
            object = {};
            keys_array = Object.keys(keys);
            for (k in fields) {
              v = fields[k];
              keyname = keys_array[k];
              if (indexOf.call(keyname, ':') >= 0) {
                array = keyname.split(':');
                key_pt = array[0];
                obj_pt = object[key_pt] != null ? object[key_pt] : object[key_pt] = {};
                while (array.length > 2) {
                  array.shift();
                  key_pt = array[0];
                  if (obj_pt[key_pt] == null) {
                    obj_pt[key_pt] = {};
                  }
                  obj_pt = obj_pt[key_pt];
                }
                array.shift();
                obj_pt[array[0]] = v;
              } else {
                object[keys_array[k]] = v;
              }
            }
            return defer.resolve(object);
          });
        };
      })(this)).fail(function(e) {
        return defer.reject(e);
      });
      return defer.promise;
    };

    Entity.prototype.load = function() {
      var defer;
      defer = Q.defer();
      this.getAll().then((function(_this) {
        return function(data) {
          if (Object.keys(data).length > 0) {
            _this.props = data;
            return defer.resolve(data);
          } else {
            return defer.reject(new Error('Data not found'));
          }
        };
      })(this)).fail(function(e) {
        return defer.reject(e);
      });
      return defer.promise;
    };

    Entity.prototype.save = function(opts) {
      var _save, defer, delete_unknown_keys, overwrite;
      opts = opts || {};
      overwrite = opts.overwrite;
      if (overwrite == null) {
        overwrite = true;
      }
      delete_unknown_keys = opts.del_unset;
      if (delete_unknown_keys == null) {
        delete_unknown_keys = false;
      }
      defer = Q.defer();
      _save = (function(_this) {
        return function(done) {
          var multi;
          multi = env.data.redis.multi();
          return _this.keys().then(function(keys) {
            var i, j, key, len, len1, prefixedProps, ref;
            if (delete_unknown_keys) {
              prefixedProps = [];
              ref = Object.keys(_this.props);
              for (i = 0, len = ref.length; i < len; i++) {
                key = ref[i];
                prefixedProps.push(_this.prefix() + key);
              }
              for (j = 0, len1 = keys.length; j < len1; j++) {
                key = keys[j];
                if (indexOf.call(prefixedProps, key) < 0) {
                  multi.del(key);
                }
              }
            }
            return async.waterfall([
              function(cb) {
                var index_keys;
                index_keys = Object.keys(_this.constructor.indexes);
                return async.eachSeries(index_keys, function(key, ccb) {
                  var index_field, index_key;
                  index_key = key;
                  index_field = _this.constructor.indexes[key];
                  return env.data.redis.get(_this.prefix() + index_key, function(err, value) {
                    if (!err && (_this.props[index_key] != null) && (value != null) !== _this.props[index_key]) {
                      multi.hdel(index_field, value);
                      multi.hset(index_field, _this.props[index_key], _this.id);
                    }
                    if (!value) {
                      multi.set(_this.prefix() + index_key, _this.props[index_key]);
                    }
                    return ccb();
                  });
                }, function() {
                  return cb();
                });
              }, function(cb) {
                var count, index_field, k, ref1, results, v, value;
                ref1 = _this.props;
                results = [];
                for (key in ref1) {
                  value = ref1[key];
                  index_field = _this.constructor.indexes[key];
                  if (index_field != null) {
                    if ((_this.oldIndexesValues[key] != null) && _this.oldIndexesValues[key] !== value) {
                      multi.hdel(index_field, _this.oldIndexesValues[key]);
                    }
                  }
                  if (typeof value === 'string' || typeof value === 'number') {
                    multi.set(_this.prefix() + key, value);
                  } else if (typeof value === 'object' && Array.isArray(value)) {
                    multi.del(_this.prefix() + key);
                    for (k in value) {
                      v = value[k];
                      multi.sadd(_this.prefix() + key, v);
                    }
                  } else if ((value != null) && typeof value === 'object') {
                    if (overwrite) {
                      multi.del(_this.prefix() + key);
                    }
                    count = 0;
                    for (k in value) {
                      count++;
                    }
                    if (count > 0) {
                      multi.hmset(_this.prefix() + key, value);
                    } else {
                      multi.del(_this.prefix() + key);
                    }
                  } else {

                  }
                  if (opts.ttl != null) {
                    multi.expire(_this.prefix() + key, opts.ttl);
                  }
                  results.push(cb());
                }
                return results;
              }
            ], function() {
              return multi.exec(function(e, res) {
                if (e) {
                  return done(e);
                }
                return done();
              });
            });
          }).fail(function(e) {
            if (e) {
              return done(e);
            }
          });
        };
      })(this);
      if (this.id == null) {
        env.data.redis.incr(this.constructor.incr, (function(_this) {
          return function(e, id) {
            _this.id = id;
            return _save(function(e) {
              if (e) {
                return defer.reject(e);
              }
              _this.constructor.onCreate(_this);
              _this.constructor.onSave(_this);
              return _this.constructor.onCreateAsync(_this, function(e) {
                if (e) {
                  return defer.reject(e);
                }
                return _this.constructor.onSaveAsync(_this, function(e) {
                  if (e) {
                    return defer.reject(e);
                  }
                  return defer.resolve();
                });
              });
            });
          };
        })(this));
      } else {
        _save((function(_this) {
          return function(e) {
            if (e) {
              return defer.reject(e);
            }
            _this.constructor.onUpdate(_this);
            _this.constructor.onSave(_this);
            return _this.constructor.onUpdateAsync(_this, function(e) {
              if (e) {
                return defer.reject(e);
              }
              return _this.constructor.onSaveAsync(_this, function(e) {
                if (e) {
                  return defer.reject(e);
                }
                return defer.resolve();
              });
            });
          };
        })(this));
      }
      return defer.promise;
    };

    Entity.prototype.remove = function() {
      var defer, multi;
      defer = Q.defer();
      multi = env.data.redis.multi();
      async.waterfall([
        (function(_this) {
          return function(next) {
            var index_keys;
            index_keys = Object.keys(_this.constructor.indexes);
            return async.eachSeries(index_keys, function(key, next2) {
              return env.data.redis.get(_this.prefix() + key, function(err, index_value) {
                if ((err == null) && (index_value != null)) {
                  multi.hdel(_this.constructor.indexes[key], index_value);
                }
                return next2();
              });
            }, function() {
              return next();
            });
          };
        })(this), (function(_this) {
          return function(next) {
            return _this.keys().then(function(keys) {
              var i, key, len;
              for (i = 0, len = keys.length; i < len; i++) {
                key = keys[i];
                multi.del(key);
              }
              return multi.exec(function(e) {
                if (e) {
                  return defer.reject(e);
                }
                return _this.constructor.onRemoveAsync(_this, function(e) {
                  if (e) {
                    return defer.reject(e);
                  }
                  defer.resolve();
                  return next();
                });
              });
            }).fail(function(e) {
              defer.reject(e);
              return next();
            });
          };
        })(this)
      ]);
      return defer.promise;
    };

    return Entity;

  })();
  return Entity;
};
