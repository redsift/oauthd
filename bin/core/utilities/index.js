module.exports = function(env) {
  env.utilities = {};
  env.debug = require('./debug')(env);
  env.utilities.check = require('./check')(env);
  env.utilities.logger = require('./logger')(env);
  env.utilities.formatters = require('./formatters')(env);
  env.utilities.exit = require('./exit')(env);
  return env.utilities;
};
