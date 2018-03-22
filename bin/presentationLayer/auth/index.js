var UAParser, Url, async, restify;

Url = require('url-parse');

async = require('async');

UAParser = require('ua-parser-js');

restify = require('restify');

module.exports = function(env) {
  return {
    init: function() {},
    registerWs: function() {
      var auth_middleware, clientCallback, createMiddlewareChain, middlewares_connectauth_chain;
      if (!env.middlewares.connectauth) {
        env.middlewares.connectauth = {};
      }
      if (!env.middlewares.connectauth.all) {
        env.middlewares.connectauth.all = [];
      }
      createMiddlewareChain = function() {
        return function(req, res, next) {
          var chain, fn, i, k, middleware, ref1;
          chain = [];
          i = 0;
          ref1 = env.middlewares.connectauth.all;
          fn = function(middleware) {
            return chain.push(function(callback) {
              return middleware(req, res, callback);
            });
          };
          for (k in ref1) {
            middleware = ref1[k];
            fn(middleware);
          }
          if (chain.length === 0) {
            return next();
          }
          return async.waterfall(chain, function() {
            return next();
          });
        };
      };
      middlewares_connectauth_chain = createMiddlewareChain();
      env.server.post(env.config.base + '/auth/refresh_token/:provider', middlewares_connectauth_chain, function(req, res, next) {
        var e;
        e = new env.utilities.check.Error;
        e.check(req.body, {
          key: env.utilities.check.format.key,
          secret: env.utilities.check.format.key,
          token: 'string'
        });
        e.check(req.params, {
          provider: 'string'
        });
        if (e.failed()) {
          return next(e);
        }
        return env.data.apps.checkSecret(req.body.key, req.body.secret, function(e, r) {
          if (e) {
            return next(e);
          }
          if (!r) {
            return next(new env.utilities.check.Error("invalid credentials"));
          }
          return env.data.apps.getKeyset(req.body.key, req.params.provider, function(e, keyset) {
            if (e) {
              return next(e);
            }
            if (keyset.response_type !== "code" && keyset.response_type !== "both") {
              return next(new env.utilities.check.Error("refresh token is a server-side feature only"));
            }
            return env.data.providers.getExtended(req.params.provider, function(e, provider) {
              var oa, ref1;
              if (e) {
                return next(e);
              }
              if (!((ref1 = provider.oauth2) != null ? ref1.refresh : void 0)) {
                return next(new env.utilities.check.Error("refresh token not supported for " + req.params.provider));
              }
              oa = new env.utilities.oauth.oauth2(provider, keyset.parameters);
              return oa.refresh(req.body.token, keyset, env.send(res, next));
            });
          });
        });
      });
      env.server.get(env.config.base + '/auth/iframe', middlewares_connectauth_chain, function(req, res, next) {
        var content, e, origin;
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('p3p', 'CP="IDC DSP COR ADM DEVi TAIi PSA PSD IVAi IVDi CONi HIS OUR IND CNT"');
        e = new env.utilities.check.Error;
        e.check(req.params, {
          d: 'string'
        });
        origin = env.utilities.check.escape(req.params.d);
        if (e.failed()) {
          return next(e);
        }
        content = '<!DOCTYPE html>\n';
        content += '<html><head><script>(function() {\n';
        content += 'function eraseCookie(name) {\n';
        content += '	var date = new Date();\n';
        content += '	date.setTime(date.getTime() - 86400000);\n';
        content += '	document.cookie = name+"=; expires="+date.toGMTString()+"; path=/";\n';
        content += '}\n';
        content += 'function readCookie(name) {\n';
        content += '	var nameEQ = name + "=";\n';
        content += '	var ca = document.cookie.split(";");\n';
        content += '	for(var i = 0; i < ca.length; i++) {\n';
        content += '		var c = ca[i];\n';
        content += '		while (c.charAt(0) === " ") c = c.substring(1,c.length);\n';
        content += '		if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);\n';
        content += '	}\n';
        content += '	return null;\n';
        content += '}\n';
        content += 'var cookieCheckTimer = setInterval(function() {\n';
        content += '	var results = readCookie("oauthio_last");\n';
        content += '	if (!results) return;\n';
        content += '	var msg = decodeURIComponent(results.replace(/\\+/g, " "));\n';
        content += '	parent.postMessage(msg, "' + origin + '");\n';
        content += '	eraseCookie("oauthio_last");\n';
        content += '}, 1000);\n';
        content += '})();</script></head><body></body></html>';
        res.send(content);
        return next();
      });
      env.server.post(env.config.base + '/auth/access_token', middlewares_connectauth_chain, function(req, res, next) {
        var e;
        e = new env.utilities.check.Error;
        e.check(req.body, {
          code: env.utilities.check.format.key,
          key: env.utilities.check.format.key,
          secret: env.utilities.check.format.key
        });
        if (e.failed()) {
          return next(e);
        }
        return env.data.states.get(req.body.code, function(err, state) {
          if (err) {
            return next(err);
          }
          if (!state || state.step !== "1") {
            return next(new env.utilities.check.Error('code', 'invalid or expired'));
          }
          if (state.key !== req.body.key) {
            return next(new env.utilities.check.Error('code', 'invalid or expired'));
          }
          return env.data.apps.checkSecret(state.key, req.body.secret, function(e, r) {
            if (e) {
              return next(e);
            }
            if (!r) {
              return next(new env.utilities.check.Error("invalid credentials"));
            }
            env.data.states.del(req.body.code, (function() {}));
            r = JSON.parse(state.token);
            r.state = state.options.state;
            r.provider = state.provider;
            res.buildJsend = false;
            return res.send(r);
          });
        });
      });
      clientCallback = function(data, req, res, next) {
        return function(e, r, response_type) {
          var body, browser, chromeext, redirect_infos, ref1, uaparser, view;
          if (!e && data.redirect_uri) {
            redirect_infos = Url(env.fixUrl(data.redirect_uri), true);
            if (redirect_infos.hostname === 'oauth.io') {
              e = new env.utilities.check.Error('OAuth.redirect url must NOT be "oauth.io"');
            }
          }
          body = env.utilities.formatters.build(e || r);
          if (data.state) {
            body.state = data.state;
          }
          if (data.provider) {
            body.provider = data.provider.toLowerCase();
          }
          if (data.redirect_type === 'server') {
            res.setHeader('Location', data.redirect_uri + '?oauthio=' + encodeURIComponent(JSON.stringify(body)));
            res.send(302);
            return next();
          }
          view = '<!DOCTYPE html>\n';
          view += '<html><head><script>(function() {\n';
          view += '\t"use strict";\n';
          view += '\tvar msg=' + JSON.stringify(JSON.stringify(body)) + ';\n';
          if (data.redirect_uri) {
            if (data.redirect_uri.indexOf('#') > 0) {
              view += '\tdocument.location.href = "' + data.redirect_uri + '&oauthio=" + encodeURIComponent(msg);\n';
            } else {
              view += '\tdocument.location.href = "' + data.redirect_uri + '#oauthio=" + encodeURIComponent(msg);\n';
            }
          } else {
            uaparser = new UAParser();
            uaparser.setUA(req.headers['user-agent']);
            browser = uaparser.getBrowser();
            chromeext = data.origin.match(/chrome-extension:\/\/([^\/]+)/);
            if (((ref1 = browser.name) != null ? ref1.substr(0, 2) : void 0) === 'IE') {
              res.setHeader('p3p', 'CP="IDC DSP COR ADM DEVi TAIi PSA PSD IVAi IVDi CONi HIS OUR IND CNT"');
              view += 'function createCookie(name, value) {\n';
              view += '	var date = new Date();\n';
              view += '	date.setTime(date.getTime() + 1200 * 1000);\n';
              view += '	var expires = "; expires="+date.toGMTString();\n';
              view += '	document.cookie = name+"="+value+expires+"; path=/";\n';
              view += '}\n';
              view += 'createCookie("oauthio_last",encodeURIComponent(msg));\n';
            } else if (chromeext) {
              view += '\tchrome.runtime.sendMessage("' + chromeext[1] + '", {data:msg});\n';
              view += '\twindow.close();\n';
            } else {
              view += 'var opener = window.opener || window.parent.window.opener;\n';
              view += '\n';
              view += 'if (opener)\n';
              view += '\topener.postMessage(msg, "' + data.origin + '");\n';
              view += '\twindow.close();\n';
            }
          }
          view += '})();</script></head><body style="text-align:center">\n';
          view += '<div style="display:inline-block; padding: 4px; border: 1px solid black">Your browser does not support popup. Please open this site with your default browser.<br />';
          view += '<a href="' + data.origin + '">' + data.origin + '</a></div>';
          view += '</body></html>';
          res.send(view);
          return next();
        };
      };
      auth_middleware = function(req, res, next) {
        var getState;
        res.setHeader('Content-Type', 'text/html');
        getState = function(callback) {
          var oaio_uid, ref1, ref2, stateid, stateref;
          if (req.params.state) {
            return callback(null, req.params.state);
          }
          if (req.headers.referer) {
            stateref = req.headers.referer.match(/state=([^&$]+)/);
            stateid = stateref != null ? stateref[1] : void 0;
            if (stateid) {
              return callback(null, stateid);
            }
          }
          oaio_uid = (ref1 = req.headers.cookie) != null ? (ref2 = ref1.match(/oaio_uid=%22(.*?)%22/)) != null ? ref2[1] : void 0 : void 0;
          if (oaio_uid) {
            return env.data.redis.get('cli:state:' + oaio_uid, callback);
          }
        };
        return getState(function(err, stateid) {
          if (err) {
            return next(err);
          }
          if (!stateid) {
            return next(new env.utilities.check.Error('state', 'must be present'));
          }
          return env.data.states.get(stateid, function(err, state) {
            if (err) {
              return next(err);
            }
            if (!state) {
              return next(new env.utilities.check.Error('state', 'invalid or expired'));
            }
            req.stateid = stateid;
            req.state = state;
            return next();
          });
        });
      };
      env.server.get(env.config.base + '/auth', auth_middleware, middlewares_connectauth_chain, function(req, res, next) {
        var callback, state, stateid;
        stateid = req.stateid;
        state = req.state;
        delete req.stateid;
        delete req.state;
        callback = clientCallback({
          state: state.options.state,
          provider: state.provider,
          redirect_uri: state.redirect_uri,
          origin: state.origin,
          redirect_type: state.redirect_type
        }, req, res, next);
        if (req.error) {
          return callback(req.error);
        }
        if (state.step !== "0") {
          return callback(new env.utilities.check.Error('state', 'code already sent, please use /access_token'));
        }
        return async.parallel([
          function(cb) {
            return env.data.providers.getExtended(state.provider, cb);
          }, function(cb) {
            return env.data.apps.getKeyset(state.key, state.provider, cb);
          }
        ], (function(_this) {
          return function(err, r) {
            var app_options, oa, parameters, provider, response_type;
            if (err) {
              return callback(err);
            }
            provider = r[0];
            parameters = r[1].parameters;
            response_type = r[1].response_type;
            app_options = r[1].options;
            oa = new env.utilities.oauth[state.oauthv](provider, parameters, app_options);
            return oa.access_token(state, req, function(e, r) {
              var status;
              status = e ? 'error' : 'success';
              return env.callhook('connect.auth', req, res, function(err) {
                var ref1;
                if (err) {
                  return callback(err);
                }
                env.events.emit('connect.callback', {
                  req: req,
                  origin: state.origin,
                  key: state.key,
                  provider: state.provider,
                  parameters: (ref1 = state.options) != null ? ref1.parameters : void 0,
                  status: status
                });
                if (e) {
                  return callback(e);
                }
                return env.callhook('connect.backend', {
                  results: r,
                  key: state.key,
                  provider: state.provider,
                  status: status
                }, function(e) {
                  if (e) {
                    return callback(e);
                  }
                  if (state.options.state_type !== 'client') {
                    env.data.states.set(stateid, {
                      token: JSON.stringify(r),
                      step: 1
                    }, (function() {}));
                  }
                  if (!app_options.refresh_client) {
                    delete r.refresh_token;
                  }
                  if (response_type === 'code') {
                    r = {};
                  }
                  if (state.options.state_type !== 'client') {
                    r.code = stateid;
                  }
                  if (state.options.state_type === 'client') {
                    env.data.states.del(stateid, (function() {}));
                  }
                  return callback(null, r, response_type);
                });
              });
            });
          };
        })(this));
      });
      return env.server.get(env.config.base + '/auth/:provider', function(req, res, next) {
        var callback, domain, e, error, key, oauthv, options, origin, provider_conf, ref, ref_origin, urlinfos;
        res.setHeader('Content-Type', 'text/html');
        domain = null;
        origin = null;
        ref = env.fixUrl(req.headers['referer'] || req.headers['origin'] || req.params.d || req.params.redirect_uri || "");
        urlinfos = Url(ref);
        if (!urlinfos.hostname) {
          if (ref) {
            if (req.params.redirect_uri) {
              ref_origin = 'redirect_uri';
            }
            if (req.params.d) {
              ref_origin = 'static';
            }
            if (req.headers['origin']) {
              ref_origin = 'origin';
            }
            if (req.headers['referer']) {
              ref_origin = 'referer';
            }
            return next(new restify.InvalidHeaderError('Cannot find hostname in %s from %s', ref, ref_origin));
          } else {
            return next(new restify.InvalidHeaderError('Missing origin or referer.'));
          }
        }
        origin = urlinfos.protocol + '//' + urlinfos.host;
        options = {};
        if (req.params.opts) {
          try {
            options = JSON.parse(req.params.opts);
            if (typeof options !== 'object') {
              return next(new env.utilities.check.Error('Options must be an object'));
            }
          } catch (error) {
            e = error;
            return next(new env.utilities.check.Error('Error in request parameters'));
          }
        }
        callback = clientCallback({
          state: options.state,
          provider: req.params.provider,
          origin: origin,
          redirect_uri: req.params.redirect_uri
        }, req, res, next);
        key = req.params.k;
        if (!key) {
          return callback(new restify.MissingParameterError('Missing OAuth.io public key.'));
        }
        oauthv = req.params.oauthv && {
          "2": "oauth2",
          "1": "oauth1"
        }[req.params.oauthv];
        provider_conf = void 0;
        return async.waterfall([
          function(cb) {
            return env.data.apps.checkDomain(key, ref, cb);
          }, function(valid, cb) {
            if (!valid) {
              return cb(new env.utilities.check.Error('Origin "' + ref + '" does not match any registered domain/url on ' + env.config.url.host));
            }
            if (req.params.redirect_uri) {
              return env.data.apps.checkDomain(key, req.params.redirect_uri, cb);
            } else {
              return cb(null, true);
            }
          }, function(valid, cb) {
            if (!valid) {
              return cb(new env.utilities.check.Error('Redirect "' + req.params.redirect_uri + '" does not match any registered domain on ' + env.config.url.host));
            }
            return env.data.providers.getExtended(req.params.provider, cb);
          }, function(provider, cb) {
            if (oauthv && !provider[oauthv]) {
              return cb(new env.utilities.check.Error("oauthv", "Unsupported oauth version: " + oauthv));
            }
            provider_conf = provider;
            if (provider.oauth2) {
              if (oauthv == null) {
                oauthv = 'oauth2';
              }
            }
            if (provider.oauth1) {
              if (oauthv == null) {
                oauthv = 'oauth1';
              }
            }
            return env.data.apps.getKeyset(key, req.params.provider, function(e, r) {
              return cb(e, r, provider);
            });
          }, function(keyset, provider, cb) {
            var parameters, response_type;
            if (!keyset) {
              return cb(new env.utilities.check.Error('This app is not configured for ' + provider.provider));
            }
            parameters = keyset.parameters, response_type = keyset.response_type;
            if (response_type === 'code' && (!options.state || options.state_type)) {
              return cb(new env.utilities.check.Error('You must provide a state when server-side auth'));
            }
            return env.callhook('connect.auth', req, res, function(err) {
              var oa, opts;
              if (err) {
                return cb(err);
              }
              env.events.emit('connect.auth', {
                req: req,
                key: key,
                provider: provider.provider,
                parameters: parameters
              });
              options.response_type = response_type;
              options.parameters = parameters;
              if (req.params.mobile) {
                options.state_type = 'client';
              }
              opts = {
                oauthv: oauthv,
                key: key,
                origin: origin,
                redirect_uri: req.params.redirect_uri,
                options: options
              };
              if (req.params.redirect_type) {
                opts.redirect_type = req.params.redirect_type;
              }
              oa = new env.utilities.oauth[oauthv](provider, parameters);
              return oa.authorize(opts, cb);
            });
          }, function(authorize, cb) {
            if (!req.oaio_uid) {
              return cb(null, authorize.url);
            }
            return env.data.redis.set('cli:state:' + req.oaio_uid, authorize.state, function(err) {
              if (err) {
                return cb(err);
              }
              env.data.redis.expire('cli:state:' + req.oaio_uid, 1200);
              return cb(null, authorize.url);
            });
          }
        ], function(err, url) {
          var isJson, k, opts, ref1, ref2, ref3, url_split, v;
          if (err) {
            return callback(err);
          }
          isJson = function(value) {
            var error1;
            try {
              JSON.stringify(value);
              return true;
            } catch (error1) {
              e = error1;
              return false;
            }
          };
          if (provider_conf.mobile != null) {
            if ((((ref1 = provider_conf.mobile) != null ? ref1.params : void 0) != null) && req.params.mobile === 'true') {
              ref2 = provider_conf.mobile.params;
              for (k in ref2) {
                v = ref2[k];
                if (url.indexOf('?') === -1) {
                  url += '?';
                } else {
                  url += '&';
                }
                url += k + '=' + v;
              }
            }
            if (isJson(req.params.opts)) {
              opts = JSON.parse(req.params.opts);
              if (opts.mobile === 'true' && (((ref3 = provider_conf.mobile) != null ? ref3.url : void 0) != null)) {
                url_split = url.split("/oauth/authorize");
                if (url_split.length === 2) {
                  url = provider_conf.mobile.url + '/oauth/authorize/' + url_split[1];
                }
              }
            }
          }
          if (provider_conf.redefine_endpoint) {
            if (isJson(req.params.opts)) {
              opts = JSON.parse(req.params.opts);
              if (opts.endpoint) {
                url_split = url.split("/oauth/");
                if (opts.endpoint[opts.endpoint.length - 1] === '/') {
                  opts.endpoint = opts.endpoint.slice(0, opts.endpoint.length - 1);
                }
                if (url_split.length === 2) {
                  url = opts.endpoint + '/oauth/' + url_split[1];
                }
              }
            }
          }
          res.setHeader('Location', url);
          res.send(302);
          return next();
        });
      });
    }
  };
};
