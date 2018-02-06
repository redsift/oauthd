var Q, async, fs, jf, sugar;

jf = require('jsonfile');

Q = require('q');

fs = require('fs');

sugar = require('sugar');

async = require('async');

module.exports = function(scaffolding) {
  var modify_module, writeEntry;
  writeEntry = function(key, value) {
    var defer;
    defer = Q.defer();
    jf.readFile(process.cwd() + '/plugins.json', function(err, obj) {
      var k, v;
      if (err) {
        return defer.reject(err);
      }
      if (obj != null) {
        if (obj[key] == null) {
          obj[key] = {};
        }
        for (k in value) {
          v = value[k];
          obj[key][k] = v;
        }
        return jf.writeFile(process.cwd() + '/plugins.json', obj, {
          spaces: 2
        }, function(err) {
          if (err) {
            return defer.reject(err);
          }
          return defer.resolve();
        });
      }
    });
    return defer.promise;
  };
  modify_module = {
    updateEntry: function(name, data) {
      var defer;
      defer = Q.defer();
      writeEntry(name, data).then(function() {
        return defer.resolve();
      }).fail(function(e) {
        return defer.reject(e);
      });
      return defer.promise;
    },
    removeEntry: function(name) {
      var defer;
      defer = Q.defer();
      jf.readFile(process.cwd() + '/plugins.json', function(err, obj) {
        if (err) {
          return defer.reject(err);
        }
        if (obj != null) {
          delete obj[name];
          return jf.writeFile(process.cwd() + '/plugins.json', obj, function(err) {
            if (err) {
              return defer.reject(err);
            }
            return defer.resolve();
          });
        }
      });
      return defer.promise;
    }
  };
  return modify_module;
};
