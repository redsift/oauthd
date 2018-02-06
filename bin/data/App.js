var Q,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Q = require('q');

module.exports = function(env) {
  var App;
  App = (function(superClass) {
    extend(App, superClass);

    function App() {
      return App.__super__.constructor.apply(this, arguments);
    }

    App.prefix = 'a';

    App.incr = 'a:i';

    App.indexes = {
      'key': 'a:keys'
    };

    App.properties = ['name', 'key', 'secret', 'owner', 'domains', 'providers', 'date', 'stored_keysets'];

    App.findByKey = function(key) {
      var _start, defer;
      defer = Q.defer();
      _start = new Date().getTime();
      this.findByIndex('key', key).then(function(app) {
        return defer.resolve(app);
      }).fail(function(e) {
        return defer.reject(new Error('App not found'));
      });
      return defer.promise;
    };

    App.prototype.prepareResponse = function() {
      var k, ref, response_body, v;
      response_body = {
        id: this.props.key
      };
      ref = this.provider.props;
      for (k in ref) {
        v = ref[k];
        response_body[k] = v;
      }
      return response_body;
    };

    return App;

  })(env.data.Entity);
  return App;
};
