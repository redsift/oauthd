module.exports = function(env) {
  return {
    oauth1: require('./oauth1')(env),
    oauth2: require('./oauth2')(env)
  };
};
