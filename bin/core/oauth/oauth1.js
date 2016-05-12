var request,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

request = require('request');

module.exports = function(env) {
  var OAuth1, OAuth1ResponseParser, OAuthBase, check;
  check = env.utilities.check;
  OAuth1ResponseParser = require('./oauth1-response-parser')(env);
  OAuthBase = require('./oauth-base')(env);
  OAuth1 = (function(superClass) {
    extend(OAuth1, superClass);

    function OAuth1(provider, parameters) {
      OAuth1.__super__.constructor.call(this, 'oauth1', provider, parameters);
    }

    OAuth1.prototype.authorize = function(opts, callback) {
      return this._createState(opts, (function(_this) {
        return function(err, state) {
          if (err) {
            return callback(err);
          }
          return _this._getRequestToken(state, opts, callback);
        };
      })(this));
    };

    OAuth1.prototype._getRequestToken = function(state, opts, callback) {
      var configuration, headers, options, placeholderValues, query, ref;
      configuration = this._oauthConfiguration.request_token;
      placeholderValues = {
        state: state.id,
        callback: this._serverCallbackUrl
      };
      query = this._buildQuery(configuration.query, placeholderValues, (ref = opts.options) != null ? ref.request_token : void 0);
      headers = this._buildHeaders(configuration);
      options = this._buildRequestOptions(configuration, headers, query);
      options.oauth = {
        callback: query.oauth_callback,
        consumer_key: this._parameters.client_id,
        consumer_secret: this._parameters.client_secret
      };
      delete query.oauth_callback;
      if (Object.keys(headers).length) {
        options.headers = headers;
      }
      if (options.method === 'POST') {
        options.form = query;
      } else {
        options.qs = query;
      }
      return request(options, (function(_this) {
        return function(err, response, body) {
          if (err) {
            return callback(err);
          }
          return _this._parseGetRequestTokenResponse(response, body, opts, headers, state, callback);
        };
      })(this));
    };

    OAuth1.prototype._parseGetRequestTokenResponse = function(response, body, opts, headers, state, callback) {
      var responseParser;
      responseParser = new OAuth1ResponseParser(response, body, headers["Accept"], 'request_token');
      return responseParser.parse((function(_this) {
        return function(err, response) {
          if (err) {
            return callback(err);
          }
          return env.data.states.setToken(state.id, response.oauth_token_secret, function(err, returnCode) {
            var configuration, placeholderValues, query, ref;
            if (err) {
              return callback(err);
            }
            configuration = _this._oauthConfiguration.authorize;
            placeholderValues = {
              state: state.id,
              callback: _this._serverCallbackUrl
            };
            query = _this._buildQuery(configuration.query, placeholderValues, (ref = opts.options) != null ? ref.authorize : void 0);
            query.oauth_token = response.oauth_token;
            return callback(null, _this._buildAuthorizeUrl(configuration.url, query, state.id));
          });
        };
      })(this));
    };

    OAuth1.prototype.access_token = function(state, req, callback) {
      var base, configuration, err, headers, options, placeholderValues, query;
      if (!req.params.oauth_token && !req.params.error) {
        if ((base = req.params).error_description == null) {
          base.error_description = 'Authorization refused';
        }
      }
      if (req.params.error || req.params.error_description) {
        err = new check.Error;
        err.error(req.params.error_description || 'Error while authorizing');
        if (req.params.error) {
          err.body.error = req.params.error;
        }
        if (req.params.error_uri) {
          err.body.error_uri = req.params.error_uri;
        }
        return callback(err);
      }
      err = new check.Error;
      if (this._oauthConfiguration.authorize.ignore_verifier === true) {
        err.check(req.params, {
          oauth_token: 'string'
        });
      } else {
        err.check(req.params, {
          oauth_token: 'string',
          oauth_verifier: 'string'
        });
      }
      if (err.failed()) {
        return callback(err);
      }
      configuration = this._oauthConfiguration.access_token;
      placeholderValues = {
        state: state.id,
        callback: this._serverCallbackUrl
      };
      this._setExtraRequestAuthorizeParameters(req, placeholderValues);
      query = this._buildQuery(configuration.query, placeholderValues);
      headers = this._buildHeaders(configuration);
      options = this._buildRequestOptions(configuration, headers, query, placeholderValues);
      options.oauth = {
        callback: query.oauth_callback,
        consumer_key: this._parameters.client_id,
        consumer_secret: this._parameters.client_secret,
        token: req.params.oauth_token,
        token_secret: state.token
      };
      if (this._oauthConfiguration.authorize.ignore_verifier !== true) {
        options.oauth.verifier = req.params.oauth_verifier;
      } else {
        options.oauth.verifier = '';
      }
      if (!options.oauth.callback) {
        delete options.oauth.callback;
      }
      delete query.oauth_callback;
      return request(options, (function(_this) {
        return function(e, r, body) {
          var responseParser;
          if (e) {
            return callback(e);
          }
          responseParser = new OAuth1ResponseParser(r, body, headers["Accept"], 'access_token');
          return responseParser.parse(function(err, response) {
            var expire, requestclone, result;
            if (err) {
              return callback(err);
            }
            expire = _this._getExpireParameter(response);
            requestclone = _this._cloneRequest();
            result = {
              oauth_token: response.oauth_token,
              oauth_token_secret: response.oauth_token_secret,
              expires_in: expire,
              request: requestclone
            };
            _this._setExtraResponseParameters(configuration, response, result);
            _this._setExtraRequestAuthorizeParameters(req, result);
            return callback(null, result);
          });
        };
      })(this));
    };

    OAuth1.prototype.request = function(req, callback) {
      var options;
      if (!this._parameters.oauthio.oauth_token || !this._parameters.oauthio.oauth_token_secret) {
        return callback(new check.Error("You must provide 'oauth_token' and 'oauth_token_secret' in 'oauthio' http header"));
      }
      options = this._buildServerRequestOptions(req);
      options.oauth = {
        consumer_key: this._parameters.client_id,
        consumer_secret: this._parameters.client_secret,
        token: this._parameters.oauthio.oauth_token,
        token_secret: this._parameters.oauthio.oauth_token_secret
      };
      return callback(null, options);
    };

    return OAuth1;

  })(OAuthBase);
  return OAuth1;
};
