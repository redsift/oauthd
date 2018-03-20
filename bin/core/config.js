module.exports = function(env) {
  var Path, Url, config;
  Path = require('path');
  Url = require('url-parse');
  config = require('../../config');
  config.rootdir = Path.normalize(__dirname + '/../..');
  config.root = Path.normalize(__dirname + '/../..');
  config.base = Path.resolve('/', config.base);
  config.relbase = config.base;
  if (config.base === '/') {
    config.base = '';
  }
  config.base_api = Path.resolve('/', config.base_api);
  config.url = Url(config.host_url);
  config.bootTime = new Date;
  return config;
};
