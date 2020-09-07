var querystring;

querystring = require('querystring');

module.exports = function(env) {
  var OAuthBase, codeVerifier, config;
  config = env.config;
  if (typeof env.data !== 'undefined') {
    codeVerifier = env.data.generateCodeVerifier();
  }
  OAuthBase = (function() {
    function OAuthBase(oauthv, provider, parameters, app_options) {
      this._appOptions = app_options || {};
      this._params = {};
      this._oauthv = oauthv;
      this._provider = provider;
      this._oauthConfiguration = provider[oauthv];
      this._parameters = parameters;
      this._serverCallbackUrl = config.host_url + '/auth';
      this._setParams(this._provider.parameters);
      this._setParams(this._provider[oauthv].parameters);
    }

    OAuthBase.prototype._setParams = function(parameters) {
      var k, v;
      for (k in parameters) {
        v = parameters[k];
        this._params[k] = v;
      }
    };

    OAuthBase.prototype._replaceParam = function(param, hard_params) {
      param = param.replace(/\{\{(.*?)\}\}/g, function(match, val) {
        if (val === "nonce") {
          return env.data.generateUid();
        } else if (val === "code_verifier") {
          return codeVerifier;
        } else if (val === "code_challenge") {
          return env.data.generateCodeChallenge(codeVerifier);
        }
        return hard_params[val] || "";
      });
      param = param.replace(/\{(.*?)\}/g, (function(_this) {
        return function(match, val) {
          if (!_this._params[val] || !_this._parameters[val]) {
            return "";
          }
          if (Array.isArray(_this._parameters[val])) {
            return _this._parameters[val].join(_this._params[val].separator || ",");
          }
          return _this._parameters[val];
        };
      })(this));
      return param.replace(/!BASE64(.*?)!BASE64/g, function(match, val) {
        return (new Buffer(val)).toString('base64');
      });
    };

    OAuthBase.prototype._createState = function(opts, callback) {
      var newStateData;
      newStateData = {
        key: opts.key,
        provider: this._provider.provider,
        redirect_uri: opts.redirect_uri,
        redirect_type: opts.redirect_type,
        oauthv: this._oauthv,
        origin: opts.origin,
        options: opts.options,
        expire: 1200
      };
      return env.data.states.add(newStateData, callback);
    };

    OAuthBase.prototype._buildQuery = function(configuration, placeholderValues, defaultParameters) {
      var param, parameterName, placeholder, query;
      query = defaultParameters instanceof Object ? defaultParameters : {};
      for (parameterName in configuration) {
        placeholder = configuration[parameterName];
        param = this._replaceParam(placeholder, placeholderValues);
        if (param) {
          query[parameterName] = param;
        }
      }
      return query;
    };

    OAuthBase.prototype._buildAuthorizeUrl = function(url, query, stateId) {
      url = this._replaceParam(url, {});
      url += "?" + querystring.stringify(query);
      return {
        url: url,
        state: stateId
      };
    };

    OAuthBase.prototype._buildServerRequestOptions = function(req) {
      return {
        method: req.method,
        followAllRedirects: true,
        url: this._buildServerRequestUrl(req.apiUrl, req, this._oauthConfiguration.request.url),
        qs: this._buildServerRequestQuery(this._oauthConfiguration.request.query),
        headers: this._buildServerRequestHeaders(req.headers, this._oauthConfiguration.request.headers)
      };
    };

    OAuthBase.prototype._buildServerRequestUrl = function(url, req, configurationUrl) {
      if (typeof req.query === 'function' && typeof req.query() === 'string' && req.query().length > 0 && url.indexOf('?') === -1) {
        url += "?" + req.query();
      }
      if (!url.match(/^[a-z]{2,16}:\/\//)) {
        if (url[0] !== '/') {
          url = '/' + url;
        }
        url = configurationUrl + url;
      }
      return this._replaceParam(url, this._parameters.oauthio);
    };

    OAuthBase.prototype._buildServerRequestQuery = function(configurationQuery) {
      return this._buildQuery(configurationQuery, this._parameters.oauthio);
    };

    OAuthBase.prototype._buildServerRequestHeaders = function(reqHeaders, configurationHeaders) {
      var headers, ignoreheaders, k, param, parameterName, placeholder, v;
      ignoreheaders = ['oauthio', 'host', 'connection', 'origin', 'referer'];
      headers = {};
      for (k in reqHeaders) {
        v = reqHeaders[k];
        if (ignoreheaders.indexOf(k) === -1) {
          k = k.replace(/\b[a-z]/g, (function() {
            return arguments[0].toUpperCase();
          }));
          headers[k] = v;
        }
      }
      for (parameterName in configurationHeaders) {
        placeholder = configurationHeaders[parameterName];
        param = this._replaceParam(placeholder, this._parameters.oauthio);
        if (param) {
          headers[parameterName] = param;
        }
      }
      return headers;
    };

    OAuthBase.prototype._getExpireParameter = function(response) {
      var expire, now;
      expire = response.body.expire;
      if (expire == null) {
        expire = response.body.expires;
      }
      if (expire == null) {
        expire = response.body.expires_in;
      }
      if (expire == null) {
        expire = response.body.expires_at;
      }
      if (expire) {
        expire = parseInt(expire);
        now = (new Date).getTime();
        if (expire > now) {
          expire -= now;
        }
      }
      return expire;
    };

    OAuthBase.prototype._cloneRequest = function() {
      var clonedRequest, k, ref, ref1, v;
      clonedRequest = {};
      ref = this._oauthConfiguration.request;
      for (k in ref) {
        v = ref[k];
        clonedRequest[k] = v;
      }
      ref1 = this._params;
      for (k in ref1) {
        v = ref1[k];
        if (v.scope === 'public') {
          if (clonedRequest.parameters == null) {
            clonedRequest.parameters = {};
          }
          clonedRequest.parameters[k] = this._parameters[k];
        }
      }
      return clonedRequest;
    };

    OAuthBase.prototype._setExtraResponseParameters = function(configuration, response, data) {
      var extra, i, len, ref, results;
      ref = configuration.extra || [];
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        extra = ref[i];
        if (response.body[extra]) {
          results.push(data[extra] = response.body[extra]);
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    OAuthBase.prototype._setExtraRequestAuthorizeParameters = function(request, data) {
      var extra, i, len, ref, results;
      ref = this._oauthConfiguration.authorize.extra || [];
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        extra = ref[i];
        if (request.params[extra]) {
          results.push(data[extra] = request.params[extra]);
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    OAuthBase.prototype._buildHeaders = function(configuration, headerParameters) {
      var headers, name, param, ref, shortFormats, value;
      if (headerParameters == null) {
        headerParameters = {};
      }
      shortFormats = {
        json: 'application/json',
        url: 'application/x-www-form-urlencoded'
      };
      headers = {};
      if (configuration.format) {
        headers["Accept"] = shortFormats[configuration.format] || configuration.format;
      }
      ref = configuration.headers;
      for (name in ref) {
        value = ref[name];
        param = this._replaceParam(value, headerParameters);
        if (param) {
          headers[name] = param;
        }
      }
      return headers;
    };

    OAuthBase.prototype._buildRequestOptions = function(configuration, headers, query, placeholderValues) {
      var method, options, ref;
      method = ((ref = configuration.method) != null ? ref.toUpperCase() : void 0) || 'POST';
      options = {
        url: this._replaceParam(configuration.url, placeholderValues),
        method: method,
        encoding: null,
        form: method !== 'GET' ? query : void 0,
        qs: method === 'GET' ? query : void 0,
        headers: Object.keys(headers).length ? headers : void 0
      };
      return options;
    };

    return OAuthBase;

  })();
  return OAuthBase;
};
