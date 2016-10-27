var Url, async, restify;

restify = require('restify');

Url = require('url');

async = require('async');

module.exports = function(env) {
  var App, check, config, plugins;
  config = env.config;
  check = env.utilities.check;
  plugins = env.plugins;
  App = {};
  App.create = function(data, user, callback) {
    var domain, err, i, key, len, ref, secret;
    err = new check.Error;
    err.check(data, {
      name: /^.{3,80}$/,
      domains: ['none', 'array']
    });
    if (err.failed()) {
      return callback(new check.Error("You must specify a name and at least one domain for your application."));
    }
    key = data.key ? data.key : env.data.generateUid();
    secret = data.secret ? data.secret : env.data.generateUid();
    err = new check.Error;
    if (data.domains) {
      ref = data.domains;
      for (i = 0, len = ref.length; i < len; i++) {
        domain = ref[i];
        err.check('domains', domain, 'string');
      }
    }
    if (err.failed()) {
      return callback(new check.Error("You must specify a name and at least one domain for your application."));
    }
    if ((user != null ? user.id : void 0) == null) {
      return callback(new check.Error("The user must be defined and contain the field 'id'"));
    }
    return env.data.redis.incr('a:i', function(err, idapp) {
      var cmds, j, len1, prefix, ref1;
      if (err) {
        return callback(err);
      }
      prefix = 'a:' + idapp + ':';
      cmds = [['mset', prefix + 'name', data.name, prefix + 'key', key, prefix + 'secret', secret, prefix + 'owner', user.id, prefix + 'date', (new Date).getTime()], ['hset', 'a:keys', key, idapp]];
      if (data.domains) {
        ref1 = data.domains;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          domain = ref1[j];
          cmds.push(['sadd', prefix + 'domains', domain]);
        }
      }
      return env.data.redis.multi(cmds).exec(function(err, res) {
        if (err) {
          return callback(err);
        }
        return callback(null, {
          id: idapp,
          name: data.name,
          key: key
        });
      });
    });
  };
  App.getByOwner = function(owner_id, callback) {
    return env.data.redis.smembers('u:' + owner_id + ':apps', function(err, app_ids) {
      var apps;
      if (err) {
        return callback(err);
      }
      apps = [];
      return async.eachSeries(app_ids, function(id, cb) {
        return env.data.App.findById(id).then(function(app) {
          apps.push(app.props);
          return cb();
        }).fail(function(e) {
          return cb(e);
        });
      }, function(err) {
        if (err) {
          return callback(err);
        }
        return callback(null, apps);
      });
    });
  };
  App.getById = check('int', function(idapp, callback) {
    var prefix;
    prefix = 'a:' + idapp + ':';
    return env.data.redis.mget([prefix + 'name', prefix + 'key', prefix + 'secret', prefix + 'date', prefix + 'owner'], function(err, replies) {
      if (err) {
        return callback(err);
      }
      return callback(null, {
        id: idapp,
        name: replies[0],
        key: replies[1],
        secret: replies[2],
        date: replies[3],
        owner: replies[4]
      });
    });
  });
  App.get = check(check.format.key, function(key, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      var prefix;
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      prefix = 'a:' + idapp + ':';
      return env.data.redis.mget([prefix + 'name', prefix + 'key', prefix + 'secret', prefix + 'date', prefix + 'owner', prefix + 'backend:name', prefix + 'backend:value'], function(err, replies) {
        var backend, e, ref, server_side_only;
        if (err) {
          return callback(err);
        }
        if (replies[5]) {
          backend = {
            name: replies[5]
          };
          try {
            backend.value = JSON.parse(replies[6]);
          } catch (_error) {
            e = _error;
            backend.value = {};
          }
        }
        server_side_only = ((backend != null ? backend.name : void 0) != null) && !((ref = backend.value) != null ? ref.client_side : void 0);
        return callback(null, {
          id: idapp,
          name: replies[0],
          key: replies[1],
          secret: replies[2],
          date: replies[3],
          owner: replies[4],
          server_side_only: server_side_only,
          backend: backend
        });
      });
    });
  });
  App.update = check(check.format.key, {
    name: ['none', /^.{3,80}$/],
    domains: ['none', 'array']
  }, function(key, data, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return async.parallel([
        function(callback) {
          var upinfos;
          upinfos = [];
          if (data.name) {
            upinfos.push('a:' + idapp + ':name');
            upinfos.push(data.name);
          }
          if (!upinfos.length) {
            return callback();
          }
          return env.data.redis.mset(upinfos, function() {
            if (err) {
              return callback(err);
            }
            return callback();
          });
        }, function(callback) {
          if (!data.domains) {
            return callback();
          }
          return App.updateDomains(key, data.domains, function(err, res) {
            if (err) {
              return callback(err);
            }
            return callback();
          });
        }
      ], function(err, res) {
        if (err) {
          return callback(err);
        }
        return callback();
      });
    });
  });
  App.resetKey = check(check.format.key, function(key, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      var newkey, newsecret;
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      newkey = env.data.generateUid();
      newsecret = env.data.generateUid();
      return env.data.redis.multi([['mset', 'a:' + idapp + ':key', newkey, 'a:' + idapp + ':secret', newsecret], ['hdel', 'a:keys', key], ['hset', 'a:keys', newkey, idapp]]).exec(function(err, r) {
        if (err) {
          return callback(err);
        }
        env.events.emit('app.resetkey', newkey);
        return callback(null, {
          key: newkey,
          secret: newsecret
        });
      });
    });
  });
  App.remove = check(check.format.key, function(key, callback) {
    return App.getKeysets(key, function(err, providers) {
      var i, len, provider;
      if (err) {
        return callback(err);
      }
      for (i = 0, len = providers.length; i < len; i++) {
        provider = providers[i];
        env.events.emit('app.remkeyset', {
          provider: provider,
          app: key
        });
      }
      return env.data.redis.hget('a:keys', key, function(err, idapp) {
        if (err) {
          return callback(err);
        }
        if (!idapp) {
          return callback(new check.Error('Unknown key'));
        }
        return env.data.redis.multi([['hdel', 'a:keys', key], ['keys', 'a:' + idapp + ':*']]).exec(function(err, replies) {
          if (err) {
            return callback(err);
          }
          return env.data.redis.del(replies[1], function(err, removed) {
            if (err) {
              return callback(err);
            }
            return callback();
          });
        });
      });
    });
  });
  App.getDomains = check(check.format.key, function(key, callback) {
    console.log('getDomains aboot to hget key', key);
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      console.log('getDomains result', idapp);
      console.log('getDomains err', err);
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.smembers('a:' + idapp + ':domains', callback);
    });
  });
  App.updateDomains = check(check.format.key, 'array', function(key, domains, callback) {
    console.log('updateDomains aboot to hget key', key);
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      var cmds, domain, i, len;
      console.log('updateDomains result', idapp);
      console.log('updateDomains err', err);
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      cmds = [['del', 'a:' + idapp + ':domains']];
      for (i = 0, len = domains.length; i < len; i++) {
        domain = domains[i];
        cmds.push(['sadd', 'a:' + idapp + ':domains', domain]);
      }
      return env.data.redis.multi(cmds).exec(function(err, res) {
        if (err) {
          return callback(err);
        }
        return callback();
      });
    });
  });
  App.addDomain = check(check.format.key, 'string', function(key, domain, callback) {
    console.log('addDomain aboot to hget key', key);
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      console.log('addDomain result', idapp);
      console.log('addDomain err', err);
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.sadd('a:' + idapp + ':domains', domain, function(err, res) {
        if (err) {
          return callback(err);
        }
        if (!res) {
          return callback(new check.Error('domain', domain + ' is already valid'));
        }
        return callback();
      });
    });
  });
  App.remDomain = check(check.format.key, 'string', function(key, domain, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.srem('a:' + idapp + ':domains', domain, function(err, res) {
        if (err) {
          return callback(err);
        }
        if (!res) {
          return callback(new check.Error('domain', domain + ' is already non-valid'));
        }
        return callback();
      });
    });
  });
  App.getBackend = check(check.format.key, function(key, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return App.getBackendById(idapp, callback);
    });
  });
  App.getBackendById = function(idapp, callback) {
    return env.data.redis.mget('a:' + idapp + ':backend:name', 'a:' + idapp + ':backend:value', function(err, res) {
      if (err) {
        return callback(err);
      }
      if (!res[0] || !res[1]) {
        return callback(null, null);
      }
      if (typeof res[1] === 'string') {
        res[1] = JSON.parse(res[1]);
      }
      return callback(null, {
        name: res[0],
        value: res[1]
      });
    });
  };
  App.setBackend = check(check.format.key, 'string', 'object', function(key, name, backend, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.mset('a:' + idapp + ':backend:name', name, 'a:' + idapp + ':backend:value', JSON.stringify(backend), function(err, res) {
        if (err) {
          return callback(err);
        }
        return callback();
      });
    });
  });
  App.remBackend = check(check.format.key, function(key, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.del('a:' + idapp + ':backend:name', 'a:' + idapp + ':backend:value', function(err, res) {
        if (err) {
          return callback(err);
        }
        return callback();
      });
    });
  });
  App.getKeyset = check(check.format.key, 'string', function(key, provider, callback) {
    console.log('hget a:keys', key);
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return App.getOptionsById(idapp, function(err, options) {
        if (err) {
          return callback(err);
        }
        return App.getBackendById(idapp, function(err, backend) {
          console.log('mget', 'a:' + idapp + ':k:' + provider);
          return env.data.redis.mget('a:' + idapp + ':k:' + provider, function(err, res) {
            var e, ref, response_type;
            if (err) {
              return callback(err);
            }
            if (res[0]) {
              try {
                res[0] = JSON.parse(res[0]);
              } catch (_error) {
                e = _error;
                if (err) {
                  return callback(err);
                }
              }
            }
            if (((backend != null ? backend.value : void 0) == null) || (backend != null ? (ref = backend.value) != null ? ref.client_side : void 0 : void 0)) {
              response_type = 'both';
            } else {
              response_type = 'code';
            }
            return callback(null, {
              parameters: res[0] || {},
              response_type: response_type,
              options: options
            });
          });
        });
      });
    });
  });
  App.setOptions = check(check.format.key, 'object', function(key, options, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.hmset('a:' + idapp + ':opts', options, function(err, res) {
        if (err) {
          return callback(err);
        }
        return callback(null, 'options updated');
      });
    });
  });
  App.getOptions = check(check.format.key, function(key, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return App.getOptionsById(idapp, callback);
    });
  });
  App.getOptionsById = function(idapp, callback) {
    return env.data.redis.hgetall('a:' + idapp + ':opts', function(err, options) {
      var k, v;
      if (err) {
        return callback(err);
      }
      if (options) {
        for (k in options) {
          v = options[k];
          if (v === "true") {
            options[k] = true;
          }
          if (v === "false") {
            options[k] = false;
          }
        }
      }
      return callback(null, options || {});
    });
  };
  App.getKeysetWithResponseType = check(check.format.key, 'string', function(key, provider, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.mget('a:' + idapp + ':k:' + provider, 'a:' + idapp + ':ktype:' + provider, function(err, res) {
        var e;
        if (err) {
          return callback(err);
        }
        if (res[0]) {
          try {
            res[0] = JSON.parse(res[0]);
          } catch (_error) {
            e = _error;
            if (err) {
              return callback(err);
            }
          }
        }
        return callback(null, {
          parameters: res[0] || {},
          response_type: res[1] || 'token'
        });
      });
    });
  });
  App.addKeyset = check(check.format.key, 'string', {
    parameters: 'object'
  }, function(key, provider, data, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.exists('a:' + idapp + ':k:' + provider, function(err, isUpdate) {
        if (err) {
          return callback(err);
        }
        return env.data.redis.mset('a:' + idapp + ':k:' + provider, JSON.stringify(data.parameters), 'a:' + idapp + ':kdate:' + provider, (new Date).getTime(), function(err, res) {
          var eventName;
          if (err) {
            return callback(err);
          }
          eventName = isUpdate ? 'app.updatekeyset' : 'app.addkeyset';
          env.events.emit(eventName, {
            provider: provider,
            app: key,
            id: idapp
          });
          return env.data.redis.sadd('a:' + idapp + ':providers', provider, function(err) {
            if (err) {
              return callback(err);
            }
            return callback();
          });
        });
      });
    });
  });
  App.remKeyset = check(check.format.key, 'string', function(key, provider, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.get('a:' + idapp + ':k:' + provider, function(err, raw_keyset) {
        var e, keyset;
        try {
          return keyset = JSON.parse(raw_keyset);
        } catch (_error) {
          e = _error;
          return keyset = {};
        } finally {
          env.data.redis.del('a:' + idapp + ':k:' + provider, 'a:' + idapp + ':ktype:' + provider, 'a:' + idapp + ':kdate:' + provider, function(err, res) {
            if (err) {
              return callback(err);
            }
            if (!res) {
              return callback(new check.Error('provider', 'You have no keyset for ' + provider));
            }
            env.events.emit('app.remkeyset', {
              provider: provider,
              app: key,
              id: idapp,
              keyset: keyset
            });
            return env.data.redis.srem('a:' + idapp + ':providers', provider, function(err) {
              if (err) {
                return callback(err);
              }
              return callback();
            });
          });
        }
      });
    });
  });
  App.getAccess = check(check.format.key, 'string', function(key, id, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.hget('a:' + idapp + ':access', id, function(err, access) {
        if (err) {
          return callback(err);
        }
        if (!access) {
          return callback(null, []);
        }
        return callback(null, JSON.parse(access));
      });
    });
  });
  App.setAccess = check(check.format.key, 'string', ['array', 'null'], function(key, id, access, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      if (!access || !access.length) {
        return env.data.redis.hdel('a:' + idapp + ':access', id, function(err) {
          env.events.emit('app.delAccess', key, id);
          if (err) {
            return callback(err);
          }
          return callback();
        });
      } else {
        return env.data.redis.hset('a:' + idapp + ':access', id, JSON.stringify(access), function(err) {
          env.events.emit('app.setAccess', key, id, access);
          if (err) {
            return callback(err);
          }
          return callback();
        });
      }
    });
  });
  App.getAccessList = check(check.format.key, function(key, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.hgetall('a:' + idapp + ':access', function(err, _access_list) {
        var access_list, k, v;
        if (err) {
          return callback(err);
        }
        access_list = {};
        for (k in _access_list) {
          v = _access_list[k];
          access_list[k] = JSON.parse(v);
        }
        return callback(null, access_list);
      });
    });
  });
  App.getKeysets = check(check.format.key, function(key, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      var prefix, providers_key;
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      prefix = 'a:' + idapp;
      providers_key = prefix + ':providers';
      return env.data.redis.smembers(providers_key, function(err, providers) {
        if (err) {
          return callback(err);
        }
        if ((providers != null ? providers.length : void 0) > 0) {
          return callback(null, providers);
        } else {
          return env.data.redis.get(prefix + ':stored_keysets', function(err, v) {
            if (v !== '1') {
              return env.data.redis.set(prefix + ':stored_keysets', '1', function(err) {
                return env.data.redis.keys(prefix + ':k:*', function(err, provider_keys) {
                  var commands, i, len, p;
                  if (err) {
                    return callback(err);
                  }
                  commands = [];
                  providers = [];
                  for (i = 0, len = provider_keys.length; i < len; i++) {
                    key = provider_keys[i];
                    p = key.replace(prefix + ':k:', '');
                    providers.push(p);
                    commands.push(['sadd', providers_key, p]);
                  }
                  return env.data.redis.multi(commands).exec(function(err) {
                    if (err) {
                      return callback(err);
                    }
                    return callback(null, providers);
                  });
                });
              });
            } else {
              return callback(null, providers);
            }
          });
        }
      });
    });
  });
  App.checkDomain = check(check.format.key, 'string', function(key, domain_str, callback) {
    return App.getDomains(key, function(err, domains) {
      var domain, i, len, vdomain, vdomain_str;
      if (err) {
        return callback(err);
      }
      domain = Url.parse(domain_str);
      if (!domain.protocol) {
        domain_str = 'http://' + domain_str;
        domain = Url.parse(domain_str);
      }
      if (domain.host === config.url.host) {
        return callback(null, true);
      }
      for (i = 0, len = domains.length; i < len; i++) {
        vdomain_str = domains[i];
        vdomain_str = vdomain_str.replace('*', '.');
        if (!vdomain_str.match(/^.{1,}:\/\//)) {
          vdomain_str = '.://' + vdomain_str;
        }
        vdomain = Url.parse(vdomain_str);
        if (vdomain.protocol !== '.:' && vdomain.protocol !== domain.protocol) {
          continue;
        }
        if (vdomain.port && vdomain.port !== domain.port) {
          continue;
        }
        if (vdomain.pathname && vdomain.pathname !== '/' && vdomain.pathname !== domain.pathname) {
          continue;
        }
        if (vdomain.hostname === domain.hostname || vdomain.hostname.substr(0, 2) === '..' && domain.hostname.substr(domain.hostname.length - vdomain.hostname.length + 1) === vdomain.hostname.substr(1)) {
          return callback(null, true);
        }
      }
      return callback(null, false);
    });
  });
  App.getOwner = check(check.format.key, function(key, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.get('a:' + idapp + ':owner', function(err, iduser) {
        if (err) {
          return callback(err);
        }
        if (!iduser) {
          return callback(new check.Error('Could not find app owner'));
        }
        return callback(null, {
          id: iduser
        });
      });
    });
  });
  App.checkSecret = check(check.format.key, check.format.key, function(key, secret, callback) {
    return env.data.redis.hget('a:keys', key, function(err, idapp) {
      if (err) {
        return callback(err);
      }
      if (!idapp) {
        return callback(new check.Error('Unknown key'));
      }
      return env.data.redis.get('a:' + idapp + ':secret', function(err, sec) {
        if (err) {
          return callback(err);
        }
        return callback(null, sec === secret);
      });
    });
  });
  return App;
};
