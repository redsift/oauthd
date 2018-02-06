var request,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

request = require('request');

module.exports = function(env) {
  var OAuth2, OAuth2ResponseParser, OAuthBase, check, logger;
  check = env.utilities.check;
  logger = new env.utilities.logger("oauth2");
  OAuth2ResponseParser = require('./oauth2-response-parser')(env);
  OAuthBase = require('./oauth-base')(env);
  OAuth2 = (function(superClass) {
    extend(OAuth2, superClass);

    function OAuth2(provider, parameters) {
      OAuth2.__super__.constructor.call(this, 'oauth2', provider, parameters);
    }

    OAuth2.prototype.authorize = function(opts, callback) {
      return this._createState(opts, (function(_this) {
        return function(err, state) {
          var configuration, placeholderValues, query, ref, ref1;
          if (err) {
            return callback(err);
          }
          configuration = _this._oauthConfiguration.authorize;
          if (configuration.url == null) {
            return callback(new Error('The provider is not properly configured internally. Please contact the provider owner if available.'));
          }
          placeholderValues = {
            state: state.id,
            callback: _this._serverCallbackUrl
          };
          if ((ref = opts.options) != null ? ref.scope : void 0) {
            _this._parameters['scope'] = opts.options.scope;
          }
          query = _this._buildQuery(configuration.query, placeholderValues, (ref1 = opts.options) != null ? ref1.authorize : void 0);
          return callback(null, _this._buildAuthorizeUrl(configuration.url, query, state.id));
        };
      })(this));
    };

    OAuth2.prototype.access_token = function(state, req, callback) {
      var configuration, err, headers, options, placeholderValues, query;
      if (req.params.error || req.params.error_description) {
        err = new check.Error;
        if (req.params.error_description) {
          err.error(req.params.error_description);
        } else {
          err.error(OAuth2ResponseParser.errors_desc.authorize[req.params.error] || 'Error while authorizing');
        }
        if (req.params.error) {
          err.body.error = req.params.error;
        }
        if (req.params.error_uri) {
          err.body.error_uri = req.params.error_uri;
        }
        return callback(err);
      }
      if (!req.params.code) {
        return callback(new check.Error('code', 'unable to find authorize code'));
      }
      configuration = this._oauthConfiguration.access_token;
      placeholderValues = {
        code: req.params.code,
        state: state.id,
        callback: this._serverCallbackUrl
      };
      this._setExtraRequestAuthorizeParameters(req, placeholderValues);
      query = this._buildQuery(configuration.query, placeholderValues);
      headers = this._buildHeaders(configuration);
      options = this._buildRequestOptions(configuration, headers, query, placeholderValues);
      options.followAllRedirects = true;
      return request(options, (function(_this) {
        return function(e, r, body) {
          var responseParser;
          if (e) {
            return callback(e);
          }
          responseParser = new OAuth2ResponseParser(r, body, headers["Accept"], 'access_token');
          return responseParser.parse(function(err, response) {
            var expire, requestclone, result;
            if (err) {
              return callback(err);
            }
            expire = _this._getExpireParameter(response);
            requestclone = _this._cloneRequest();
            result = {
              access_token: response.access_token,
              token_type: response.body.token_type,
              expires_in: expire,
              base: _this._provider.baseurl,
              request: requestclone,
              refresh_token: response.body.refresh_token,
              response_body: response.body
            };
            _this._setExtraResponseParameters(configuration, response, result);
            _this._setExtraRequestAuthorizeParameters(req, result);
            return callback(null, result);
          });
        };
      })(this));
    };

    OAuth2.prototype.refresh = function(token, keyset, callback) {
      var configuration, headers, options, placeholderValues, query;
      configuration = this._oauthConfiguration.refresh;
      placeholderValues = {
        refresh_token: token
      };
      query = this._buildQuery(configuration.query, placeholderValues);
      headers = this._buildHeaders(configuration, {
        refresh_token: token
      });
      options = this._buildRequestOptions(configuration, headers, query);
      options.followAllRedirects = true;
      return request(options, (function(_this) {
        return function(e, r, body) {
          var responseParser;
          if (e) {
            return callback(e);
          }
          responseParser = new OAuth2ResponseParser(r, body, headers["Accept"], 'refresh token');
          return responseParser.parse(function(err, response) {
            var expire, result;
            if (err) {
              return callback(err);
            }
            expire = _this._getExpireParameter(response);
            result = {
              access_token: response.body.access_token,
              token_type: response.body.token_type,
              expires_in: expire
            };
            if (response.body.refresh_token && (_this._appOptions.refresh_client || keyset.response_type === "code")) {
              result.refresh_token = response.body.refresh_token;
            }
            return callback(null, result);
          });
        };
      })(this));
    };

    OAuth2.prototype.request = function(req, callback) {
      var configuration, options;
      if (!this._parameters.oauthio.token) {
        if (this._parameters.oauthio.access_token) {
          this._parameters.oauthio.token = this._parameters.oauthio.access_token;
        } else {
          return callback(new check.Error("You must provide a 'token' in 'oauthio' http header"));
        }
      }
      configuration = this._provider.oauth2.request;
      options = this._buildServerRequestOptions(req, configuration);
      return callback(null, options);
    };

    return OAuth2;

  })(OAuthBase);
  return OAuth2;
};
