var fs;

fs = require('fs');

module.exports = function(env) {
  var config, sdk_js_str, sdk_js_str_min;
  config = env.config;
  sdk_js_str = null;
  sdk_js_str_min = null;
  return {
    get: function(callback) {
      if (sdk_js_str) {
        return callback(null, sdk_js_str);
      }
      return fs.readFile(__dirname + '/js_sdk/oauth.js', 'utf8', function(err, data) {
        sdk_js_str = data;
        return callback(null, sdk_js_str);
      });
    },
    getmin: function(callback) {
      if (sdk_js_str_min) {
        return callback(null, sdk_js_str_min);
      }
      return fs.readFile(__dirname + '/js_sdk/oauth.min.js', 'utf8', function(err, data) {
        sdk_js_str_min = data;
        return callback(null, sdk_js_str_min);
      });
    }
  };
};
