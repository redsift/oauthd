var Path, async, fs;

fs = require("fs");

Path = require("path");

async = require("async");

module.exports = function(env) {
  var check, config, def, exp, providers;
  config = env.config;
  check = env.utilities.check;
  exp = {};
  def = {
    oauth2: {
      authorize: {
        query: {
          client_id: "{client_id}",
          response_type: "code",
          redirect_uri: "{{callback}}",
          scope: "{scope}",
          state: "{{state}}"
        }
      },
      access_token: {
        query: {
          client_id: "{client_id}",
          client_secret: "{client_secret}",
          redirect_uri: "{{callback}}",
          grant_type: "authorization_code",
          code: "{{code}}"
        }
      },
      request: {
        headers: {
          "Authorization": "Bearer {{token}}"
        }
      },
      refresh: {
        query: {
          client_id: "{client_id}",
          client_secret: "{client_secret}",
          grant_type: "refresh_token",
          refresh_token: "{{refresh_token}}"
        }
      },
      revoke: {}
    },
    oauth1: {
      request_token: {
        query: {
          oauth_callback: "{{callback}}"
        }
      },
      authorize: {},
      access_token: {
        query: {}
      },
      request: {}
    }
  };
  providers = {
    _list: {},
    _cached: false
  };
  exp.getList = function(callback) {
    var k, v;
    if (!providers._cached) {
      return fs.readdir(config.rootdir + '/providers', function(err, provider_names) {
        var cmds, fn, i, len, provider;
        if (err) {
          return callback(err);
        }
        cmds = [];
        fn = function(provider) {
          if (provider !== 'default') {
            return cmds.push(function(callback) {
              return exp.get(provider, function(err, data) {
                var base;
                if (err) {
                  env.debug("Error in " + provider + ".json:", err, "skipping this provider");
                  return callback(null);
                }
                if ((base = providers._list)[provider] == null) {
                  base[provider] = {
                    cached: false,
                    name: data.name || provider
                  };
                }
                return callback(null);
              });
            });
          }
        };
        for (i = 0, len = provider_names.length; i < len; i++) {
          provider = provider_names[i];
          fn(provider);
        }
        return async.parallel(cmds, function(err, res) {
          var k, v;
          if (err) {
            return callback(err);
          }
          providers._cached = true;
          return callback(null, (function() {
            var ref, results;
            ref = providers._list;
            results = [];
            for (k in ref) {
              v = ref[k];
              results.push({
                provider: k,
                name: v.name
              });
            }
            return results;
          })());
        });
      });
    } else {
      return callback(null, (function() {
        var ref, results;
        ref = providers._list;
        results = [];
        for (k in ref) {
          v = ref[k];
          results.push({
            provider: k,
            name: v.name
          });
        }
        return results;
      })());
    }
  };
  exp.get = function(provider_name, callback) {
    var provider, providers_dir;
    providers_dir = config.rootdir + '/providers';
    provider = Path.resolve(providers_dir, provider_name + '/conf.json');
    if (Path.relative(providers_dir, provider).substr(0, 2) === "..") {
      return callback(new check.Error('Not authorized'));
    }
    return fs.readFile(provider, {
      encoding: 'utf-8'
    }, function(err, data) {
      var content;
      if ((err != null ? err.code : void 0) === 'ENOENT') {
        return callback(new check.Error('No such provider: ' + provider_name));
      }
      if (err) {
        return callback(err);
      }
      content = null;
      try {
        content = JSON.parse(data);
      } catch (_error) {
        err = _error;
        return callback(err);
      }
      content.provider = provider_name;
      return callback(null, content);
    });
  };
  exp.getSettings = function(provider, callback) {
    var provider_name, providers_dir;
    provider_name = provider;
    providers_dir = config.rootdir + '/providers';
    provider = Path.resolve(providers_dir, provider + '/settings.json');
    if (Path.relative(providers_dir, provider).substr(0, 2) === "..") {
      return callback(new check.Error('Not authorized'));
    }
    return fs.readFile(provider, function(err, data) {
      var content;
      if ((err != null ? err.code : void 0) === 'ENOENT') {
        return callback(new check.Error('No settings infos for ' + provider_name));
      }
      if (err) {
        return callback(err);
      }
      content = null;
      try {
        content = JSON.parse(data);
      } catch (_error) {
        err = _error;
        return callback(err);
      }
      content.provider = provider_name;
      return callback(null, content);
    });
  };
  exp.getMeMapping = function(provider, callback) {
    var provider_name, providers_dir;
    provider_name = provider;
    providers_dir = config.rootdir + '/providers';
    provider = Path.resolve(providers_dir, provider + '/me.js');
    if (Path.relative(providers_dir, provider).substr(0, 2) === "..") {
      return callback(new check.Error('Not authorized'));
    }
    return fs.exists(provider, function(exists) {
      var me;
      if (exists) {
        me = require(provider);
        return callback(null, me);
      } else {
        return callback(new check.Error('No me.js information for ' + provider_name));
      }
    });
  };
  exp.getExtended = function(name, callback) {
    var provider;
    provider = providers._list[name];
    if (provider != null ? provider.cache : void 0) {
      return callback(null, provider.data);
    }
    return exp.get(name, function(err, res) {
      var base_url, endpoint, endpoint_name, fillRequired, found_state, i, j, k, len, len1, oauthv, params, ref, ref1, ref10, ref11, ref12, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, v;
      if (err) {
        return callback(err);
      }
      provider = providers._list[name] || {
        cache: false
      };
      base_url = "";
      if (res.url) {
        base_url = res.url.match(/^.{2,5}:\/\/[^\/]+/)[0] || "";
      }
      ref = ['oauth1', 'oauth2'];
      for (i = 0, len = ref.length; i < len; i++) {
        oauthv = ref[i];
        if (res[oauthv] != null) {
          found_state = false;
          ref1 = ['request_token', 'authorize', 'access_token', 'request', 'refresh', 'revoke'];
          for (j = 0, len1 = ref1.length; j < len1; j++) {
            endpoint_name = ref1[j];
            if (oauthv === 'oauth2' && endpoint_name === 'request_token') {
              continue;
            }
            endpoint = res[oauthv][endpoint_name];
            if (endpoint_name === 'request' && !endpoint) {
              endpoint = res[oauthv][endpoint_name] = {};
            }
            if (!endpoint) {
              res[oauthv][endpoint_name] = {};
              continue;
            }
            if (typeof endpoint === 'string') {
              endpoint = res[oauthv][endpoint_name] = {
                url: endpoint
              };
            }
            if (res.url && ((ref2 = endpoint.url) != null ? ref2[0] : void 0) === '/') {
              endpoint.url = res.url + endpoint.url;
            }
            if (endpoint_name === 'request') {
              if (!endpoint.url) {
                endpoint.url = base_url;
              }
              fillRequired = function(str) {
                var hardparamRegexp, matches, results;
                hardparamRegexp = /\{\{(.+?)\}\}/g;
                results = [];
                while (matches = hardparamRegexp.exec(str)) {
                  if (matches[1] !== 'token') {
                    if (endpoint.required == null) {
                      endpoint.required = [];
                    }
                    results.push(endpoint.required.push(matches[1]));
                  } else {
                    results.push(void 0);
                  }
                }
                return results;
              };
              fillRequired(endpoint.url);
              if (endpoint.query) {
                ref3 = endpoint.query;
                for (k in ref3) {
                  v = ref3[k];
                  fillRequired(v);
                }
              }
              if (endpoint.headers) {
                ref4 = endpoint.headers;
                for (k in ref4) {
                  v = ref4[k];
                  fillRequired(v);
                }
              }
            }
            if (!endpoint.query && endpoint_name === 'authorize' && endpoint.ignore_verifier) {
              endpoint.query = {
                oauth_callback: '{{callback}}'
              };
            }
            if (!endpoint.query && def[oauthv][endpoint_name].query) {
              endpoint.query = {};
              ref5 = def[oauthv][endpoint_name].query;
              for (k in ref5) {
                v = ref5[k];
                endpoint.query[k] = v;
              }
            }
            if (!endpoint.headers && !endpoint.query && def[oauthv][endpoint_name].headers) {
              endpoint.headers = {};
              ref6 = def[oauthv][endpoint_name].headers;
              for (k in ref6) {
                v = ref6[k];
                endpoint.headers[k] = v;
              }
            }
            ref7 = endpoint.query;
            for (k in ref7) {
              v = ref7[k];
              if (v.indexOf('{{state}}') !== -1) {
                found_state = true;
              }
              if (v.indexOf('{scope}') !== -1 && !((ref8 = res[oauthv].parameters) != null ? ref8.scope : void 0) && !((ref9 = res.parameters) != null ? ref9.scope : void 0)) {
                delete endpoint.query[k];
              }
            }
            if (!found_state) {
              ref10 = endpoint.query;
              for (k in ref10) {
                v = ref10[k];
                endpoint.query[k] = v.replace(/\{\{callback\}\}/g, '{{callback}}?state={{state}}');
              }
            }
          }
          params = res[oauthv].parameters;
          if (params) {
            for (k in params) {
              v = params[k];
              if (typeof v === 'string') {
                params[k] = {
                  type: v
                };
              }
              if (!params[k].type) {
                params[k].type = 'string';
              }
              if (params[k].values && !params[k].cardinality) {
                params[k].cardinality = '*';
              }
              if (params[k].values && !params[k].separator) {
                params[k].separator = ' ';
              }
            }
          }
        }
      }
      if (!((ref11 = res.oauth1) != null ? ref11.parameters : void 0) && !((ref12 = res.oauth2) != null ? ref12.parameters : void 0) && !res.parameters) {
        res.parameters = {
          client_id: 'string',
          client_secret: 'string'
        };
      }
      params = res.parameters;
      if (params) {
        for (k in params) {
          v = params[k];
          if (typeof v === 'string') {
            params[k] = {
              type: v
            };
          }
          if (!params[k].type) {
            params[k].type = 'string';
          }
          if (params[k].values && !params[k].cardinality) {
            params[k].cardinality = '*';
          }
          if (params[k].values && !params[k].separator) {
            params[k].separator = ' ';
          }
        }
      }
      provider.data = res;
      provider.cache = true;
      return callback(null, res);
    });
  };
  return exp;
};
