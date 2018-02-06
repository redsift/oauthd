var async;

async = require('async');

module.exports = function(env) {
  var cleanExit, closing, closing_stack, exit;
  exit = {};
  closing_stack = [];
  closing = false;
  cleanExit = function(killer) {
    var k;
    closing = true;
    k = setTimeout((function() {
      console.error('--- FORCING STOP');
      process.kill(process.pid);
    }), 5000);
    async.series(closing_stack, function(err, res) {
      env.debug('--- successfully closed !');
      setTimeout(killer, 100);
    });
  };
  process.once('SIGUSR2', function() {
    env.debug('--- closing server...');
    cleanExit(function() {
      process.kill(process.pid, 'SIGUSR2');
    });
  });

  /*
  	process.on 'uncaughtException', (err) ->
  		if closing
  			console.error '--- uncaughtException WHILE CLOSING'
  		else
  			console.error '--- uncaughtException', (new Date).toGMTString()
  			exit.err = err
  		console.error err.stack.toString()
  		console.error '--- node exiting now...'
  		if closing
  			process.exit 2
  		else
  			cleanExit ->
  				process.exit 1
  				return
  		return
   */
  exit.push = function(name, f) {
    closing_stack.push(function(callback) {
      env.debug('Closing `' + name + '`...');
      f(callback);
    });
  };
  return exit;
};
