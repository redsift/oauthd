var exec, fs, jf, ncp;

exec = require('child_process').exec;

fs = require('fs');

jf = require('jsonfile');

ncp = require('ncp');

module.exports = function(opts) {
  var scaffolding_env;
  opts = opts || {};
  scaffolding_env = {
    debug: function() {
      if (opts.console) {
        return console.log.apply(null, arguments);
      } else {

      }
    },
    exec: exec,
    fs: fs,
    ncp: ncp,
    jsonfile: jf
  };
  scaffolding_env.plugins = require('./plugins')(scaffolding_env);
  scaffolding_env.init = require('./init')(scaffolding_env);
  scaffolding_env.compile = require('./compile')(scaffolding_env);
  return scaffolding_env;
};
