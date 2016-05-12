var Q, async, colors, fs, ncp, prompt;

fs = require('fs');

prompt = require('prompt');

colors = require('colors');

Q = require('q');

ncp = require('ncp');

async = require('async');

module.exports = function(env) {
  var copyBasisStructure, doInit, installPlugins;
  installPlugins = function(defer, name) {
    var old_location;
    old_location = process.cwd();
    process.chdir(process.cwd() + '/' + name);
    return async.series([
      function(next) {
        return env.plugins.install({
          repository: "https://github.com/oauth-io/oauthd-admin-auth",
          version: "1.x.x"
        }, process.cwd()).then(function() {
          return next();
        }).fail(function(e) {
          return next(e);
        });
      }, function(next) {
        return env.plugins.install({
          repository: "https://github.com/oauth-io/oauthd-slashme",
          version: "0.x.x"
        }, process.cwd()).then(function() {
          return next();
        }).fail(function(e) {
          return next(e);
        });
      }, function(next) {
        return env.plugins.install({
          repository: "https://github.com/oauth-io/oauthd-request",
          version: "0.x.x"
        }, process.cwd()).then(function() {
          return next();
        }).fail(function(e) {
          return next(e);
        });
      }, function(next) {
        return env.plugins.install({
          repository: "https://github.com/oauth-io/oauthd-front",
          version: "0.x.x"
        }, process.cwd()).then(function() {
          return next();
        }).fail(function(e) {
          return next(e);
        });
      }
    ], function(err) {
      if (err) {
        defer.reject(err);
      }
      process.chdir(old_location);
      return defer.resolve(name);
    });
  };
  doInit = function(defer, name, plugins) {
    var schema;
    if (plugins) {
      copyBasisStructure(defer, name, 'n');
      return;
    }
    schema = {
      properties: {}
    };
    schema.properties.install_default_plugin = {
      pattern: /^([Yy]|[nN])$/,
      message: "Please answer by 'y' for yes or 'n' for no.",
      description: 'Do you want to install default plugins?  (Y|n)',
      "default": 'Y'
    };
    prompt.message = "oauthd".white;
    prompt.delimiter = "> ";
    prompt.start();
    return prompt.get(schema, function(err, res2) {
      return copyBasisStructure(defer, name, res2.install_default_plugin);
    });
  };
  copyBasisStructure = function(defer, name, install_default_plugin) {
    env.debug('Generating a folder for ' + name);
    return ncp(__dirname + '/../templates/basis_structure', process.cwd() + '/' + name, function(err) {
      if (err) {
        defer.reject(err);
      }
      return fs.rename(process.cwd() + '/' + name + '/gitignore', process.cwd() + '/' + name + '/.gitignore', function(err) {
        if (err) {
          defer.reject(err);
        }
        if (install_default_plugin.match(/[yY]/)) {
          return installPlugins(defer, name);
        } else {
          return defer.resolve(name);
        }
      });
    });
  };
  return function(force_default, options) {
    var defer, exists, plugins, schema;
    defer = Q.defer();
    if (force_default) {
      exists = fs.existsSync('./default-oauthd-instance');
      if (!exists) {
        plugins = options.noplugins ? "n" : "Y";
        copyBasisStructure(defer, "default-oauthd-instance", plugins);
      } else {
        defer.reject(new Error('Stopped because \'default-oauthd-instance\' folder already exists.'));
      }
    } else {
      if (options.name) {
        exists = fs.existsSync('./' + options.name);
        if (exists) {
          defer.reject(new Error('Stopped because \'' + options.name + '\' folder already exists.'));
        } else {
          doInit(defer, options.name, options.noplugins);
        }
      } else {
        schema = {
          properties: {
            name: {
              pattern: /^[a-zA-Z0-9_\-]+$/,
              message: 'You must give a folder name using only letters, digits, dash and underscores',
              description: 'What will be the name of your oauthd instance?',
              require: true,
              delimiter: ''
            }
          }
        };
        prompt.message = "oauthd".white;
        prompt.delimiter = "> ";
        prompt.start();
        prompt.get(schema, function(err, results) {
          if (err) {
            defer.reject(err);
          }
          if (results.name.length === 0) {
            env.debug('You must give a folder name using only letters, digits, dash and underscores.');
            return;
          }
          exists = fs.existsSync('./' + results.name);
          if (exists) {
            schema = {
              properties: {}
            };
            schema.properties.overwrite = {
              pattern: /^(y|n)$/,
              message: "Please answer by 'y' for yes or 'n' for no.",
              description: 'A folder ' + results.name + ' already exists. Do you want to overwrite it? (y|N)',
              "default": 'N'
            };
            prompt.message = "oauthd".white;
            prompt.delimiter = "> ";
            prompt.start();
            return prompt.get(schema, function(err, res_overwrite) {
              if (res_overwrite.overwrite.match(/[Yy]/)) {
                return doInit(defer, results.name, options.noplugins);
              } else {
                return defer.reject(new Error('Stopped'));
              }
            });
          } else {
            return doInit(defer, results.name, options.noplugins);
          }
        });
      }
    }
    return defer.promise;
  };
};
