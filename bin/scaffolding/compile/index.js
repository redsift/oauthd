var Q, exec;

Q = require('q');

exec = require('child_process').exec;

module.exports = function(env) {
  return function() {
    var defer;
    defer = Q.defer();
    env.debug('Running npm install and grunt.'.green + ' This may take a few minutes'.yellow);
    exec('npm install; grunt;', function(error, stdout, stderr) {
      if (!error) {
        return defer.resolve();
      } else {
        return defer.reject();
      }
    });
    return defer.promise;
  };
};
