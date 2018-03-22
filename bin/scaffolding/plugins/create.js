var Q, colors;

colors = require('colors');

Q = require('q');

module.exports = function(env) {
  return function(name, force, save) {
    var defer, exec, exists, fs, jf, ncp, path;
    exec = env.exec;
    ncp = env.ncp;
    jf = env.jsonfile;
    fs = env.fs;
    defer = Q.defer();
    path = process.cwd() + '/plugins/' + name;
    exists = fs.existsSync(process.cwd() + '/plugins/' + name);
    if (!exists || force) {
      ncp(__dirname + '/../templates/plugin', path, function(err) {
        if (err) {
          return defer.reject(err);
        } else {
          return jf.readFile(path + '/plugin.json', function(err, obj) {
            if (err) {
              return defer.reject(err);
            }
            if (obj == null) {
              obj = {};
            }
            obj.name = name;
            return jf.writeFile(path + '/plugin.json', obj, function(err) {
              if (err) {
                return defer.reject(err);
              }
              return exec('cd ' + path + '&& git init', function(error, stdout, stderr) {
                if (save) {
                  return env.plugins.pluginsList.updateEntry(name, {
                    active: true
                  }).then(function() {
                    env.debug('The plugin ' + name.green + ' was successfully created in ./plugins/' + name);
                    return defer.resolve();
                  }).fail(function(e) {
                    env.debug('An error occured while initializing the plugin git repo: '.red);
                    console.log(e.message);
                    return defer.reject(e);
                  });
                } else {
                  if (!error) {
                    env.debug('The plugin ' + name.green + ' was successfully created in ./plugins/' + name);
                    return defer.resolve();
                  } else {
                    env.debug('An error occured while initializing the plugin git repo'.red);
                    return defer.reject(error);
                  }
                }
              });
            });
          });
        }
      });
    } else {
      env.debug('The plugin ' + name.yellow + ' already exists. To override, use ' + '--force'.green);
      defer.reject({
        message: 'Folder already exists'
      });
    }
    return defer.promise;
  };
};
