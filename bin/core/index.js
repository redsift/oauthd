var events;

events = require('events');

module.exports = function(env) {
  return {
    initEnv: function() {
      env.events = new events.EventEmitter();
      return env.middlewares = {
        always: []
      };
    },
    initConfig: function() {
      return env.config = require('./config')(env);
    },
    initUtilities: function() {
      return env.utilities = require('./utilities')(env);
    },
    initOAuth: function() {
      return env.utilities.oauth = require('./oauth')(env);
    },
    initPluginsEngine: function() {
      return env.pluginsEngine = require('./pluginsEngine')(env);
    }
  };
};
