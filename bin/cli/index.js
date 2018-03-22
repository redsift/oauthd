var args, argv, displayHelp, endOfInit, exec, force_default, ncp, options, pckg_info, scaffolding;

exec = require('child_process').exec;

ncp = require('ncp');

scaffolding = require('../scaffolding')({
  console: true
});

pckg_info = require('../../package.json');

argv = require('minimist')(process.argv.slice(2));

args = argv._;

options = argv;

endOfInit = function(name, showGrunt) {
  var command, info;
  info = 'Running npm install';
  command = 'cd ' + name + ' && npm install';
  if (showGrunt) {
    info += ' and grunt.';
    command += ' && $(npm bin)/grunt';
  } else {
    info += '.';
  }
  console.log(info.green + ' Please wait, this might take up to a few minutes.'.yellow);
  exec = require('child_process').exec;
  return exec(command, function(error, stdout, stderr) {
    var r_command;
    if (error) {
      console.log("Error running command \"" + command + "\".");
      return console.log(error);
    } else {
      r_command = 'cd ' + name + ' && oauthd start';
      return console.log('Thank you for using oauthd. Run ' + r_command.green + ' to start the instance');
    }
  });
};

displayHelp = function() {
  console.log('Usage: oauthd <command> [arguments]');
  console.log('');
  console.log('Available commands');
  console.log('    oauthd ' + 'init'.yellow + '\t\t\t\t\t' + 'Initializes a new oauthd instance');
  console.log('    oauthd ' + 'start'.yellow + '\t\t\t\t' + 'Starts an oauthd instance');
  console.log('    oauthd ' + 'plugins'.yellow + ' <command> [arguments]' + '\t' + 'Starts an oauthd instance');
  console.log('');
  return console.log('oauthd <command> ' + '--help'.green + ' for more information about a specific command');
};

options.help = options.help || options.h;

if (options.help && args.length === 0) {
  displayHelp();
} else if (argv.version || argv.v) {
  console.log(pckg_info.name + ' ' + pckg_info.version.yellow);
} else {
  if (args[0] === 'init') {
    if (options.help || args.length > 1) {
      console.log('Usage: ' + 'oauthd init'.yellow);
      console.log('Initializes a new oauthd instance. \nPrompts the user for an instance name and for default components installation prefs.');
      console.log('\t --name instance name');
      console.log('\t --noplugins do not install any of the default plugins');
    } else {
      force_default = false;
      if (options["default"]) {
        force_default = true;
      }
      scaffolding.init(force_default, options).then(function(name) {
        return endOfInit(name, true);
      }).fail(function(err) {
        return console.log('An error occured: '.red + err.message.yellow);
      });
    }
  } else if (args[0] === 'start') {
    if (options.help || args.length > 1) {
      console.log('Usage: ' + 'oauthd start'.yellow);
      console.log('Starts an oauthd instance. \nYou must be in an instance folder to call this command.');
    } else {
      require('../oauthd').init();
    }
  } else if (args[0] === 'plugins') {
    if (options.help && args.length === 1) {
      require('./plugins')(args, options).help();
    }
    args.shift();
    require('./plugins')(args, options).command().then(function() {}).fail(function(e) {
      return console.log(e.message);
    });
  } else {
    displayHelp();
  }
}
