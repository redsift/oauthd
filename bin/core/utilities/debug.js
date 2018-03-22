module.exports = function(env) {
  var debug;
  debug = function() {
    var ref;
    if ((ref = env.config) != null ? ref.debug : void 0) {
      return console.log.apply(console, arguments);
    }
  };
  debug.display = function() {
    return console.log.apply(console, arguments);
  };
  return debug;
};
