var fs;

fs = require('fs');

module.exports = function(env) {
  var Logger;
  Logger = (function() {
    function Logger(name) {
      this.name = name;
    }

    Logger.prototype.log = function() {
      var arg, args, e, error, i, len, prepend;
      prepend = "### " + (new Date).toUTCString() + "\n";
      args = [];
      for (i = 0, len = arguments.length; i < len; i++) {
        arg = arguments[i];
        try {
          args.push(JSON.stringify(arg));
        } catch (error) {
          e = error;
          args.push('[[JSON str error]]');
        }
      }
      return fs.appendFile(__dirname + '/../logs/' + this.name + '.log', prepend + args.join(' ') + "\n", 'utf8', function() {});
    };

    return Logger;

  })();
  return Logger;
};
