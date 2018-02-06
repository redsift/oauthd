module.exports = function(env) {
  return {
    create: require('./create')(env),
    install: require('./install')(env),
    info: require('./info')(env),
    uninstall: require('./uninstall')(env),
    activate: require('./activate')(env),
    deactivate: require('./deactivate')(env),
    git: function(plugin_name, fetch, cwd) {
      return require('./git')(env, plugin_name, fetch, cwd);
    },
    update: require('./update')(env),
    pluginsList: require('./pluginsList')(env)
  };
};
