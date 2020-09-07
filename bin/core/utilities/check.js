var escapeHtml,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

escapeHtml = function(text) {
  var map;
  map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) {
    return map[m];
  });
};

module.exports = function(env) {
  var CheckError, _check, _clone, check;
  _check = function(arg, format, errors) {
    var j, k, len, possibility, success, v;
    if (format instanceof RegExp) {
      return typeof arg === 'string' && arg.match(format);
    }
    if (Array.isArray(format)) {
      for (j = 0, len = format.length; j < len; j++) {
        possibility = format[j];
        if (_check(arg, possibility)) {
          return true;
        }
      }
      return false;
    }
    if (typeof format === 'object') {
      if ((arg != null) && typeof arg === 'object') {
        success = true;
        for (k in format) {
          v = format[k];
          if (!_check(arg[k], v)) {
            if (errors != null) {
              errors[k] = 'Invalid format';
              success = false;
            } else {
              return false;
            }
          }
        }
        return success;
      }
      return false;
    }
    return !format || format === 'any' && (arg != null) || format === 'none' && (arg == null) || format === 'null' && arg === null || format === 'string' && typeof arg === 'string' || format === 'regexp' && arg instanceof RegExp || format === 'object' && (arg != null) && typeof arg === 'object' || format === 'function' && typeof arg === 'function' || format === 'array' && Array.isArray(arg) || format === 'number' && (arg instanceof Number || typeof arg === 'number') || format === 'int' && (parseFloat(arg) === parseInt(arg)) && !isNaN(arg) || format === 'bool' && (arg instanceof Boolean || typeof arg === 'boolean') || format === 'date' && arg instanceof Date;
  };
  _clone = function(item) {
    var child, i, index, result;
    if (item == null) {
      return item;
    }
    if (item instanceof Number) {
      return Number(item);
    }
    if (item instanceof String) {
      return String(item);
    }
    if (item instanceof Boolean) {
      return Boolean(item);
    }
    if (Array.isArray(item)) {
      result = [];
      for (index in item) {
        child = item[index];
        result[index] = _clone(child);
      }
      return result;
    }
    if (typeof item === "object" && !item.prototype) {
      result = {};
      for (i in item) {
        result[i] = _clone(item[i]);
      }
      return result;
    }
    return item;
  };
  CheckError = (function(superClass) {
    extend(CheckError, superClass);

    function CheckError() {
      Error.captureStackTrace(this, this.constructor);
      this.message = "Invalid format";
      this.body = {};
      if (arguments.length === 1) {
        this.message = arguments[0];
      } else if (arguments.length) {
        this.status = "fail";
        this.body[arguments[0]] = arguments[1];
      }
      CheckError.__super__.constructor.call(this, this.message);
    }

    CheckError.prototype.check = function(name, arg, format) {
      var f, o, success;
      this.status = "fail";
      if (arguments.length === 2) {
        success = _check(name, arg, this.body);
        if (!Object.keys(this.body).length && success === false) {
          this.status = "error";
        }
        return success;
      }
      o = {};
      f = {};
      o[name] = arg;
      f[name] = format;
      success = _check(o, f, this.body);
      if (!Object.keys(this.body).length && success === false) {
        this.status = "error";
      }
      return success;
    };

    CheckError.prototype.error = function(name, message) {
      if (arguments.length === 1) {
        this.message = name;
        this.status = "error";
      } else {
        this.body[name] = message;
        this.status = "fail";
      }
    };

    CheckError.prototype.failed = function() {
      return Object.keys(this.body).length || this.status === "error";
    };

    return CheckError;

  })(Error);
  check = function() {
    var checked, formats;
    checked = Array.prototype.pop.call(arguments, arguments);
    formats = arguments;
    return (function(_this) {
      return function() {
        var argformat, args, callback, e, err, error, error1, i;
        args = Array.prototype.slice.call(arguments);
        callback = args.pop();
        if (args.length !== formats.length) {
          return callback(new CheckError('Bad parameters count'));
        }
        error = new CheckError('Bad parameters format');
        for (i in formats) {
          argformat = formats[i];
          if (!error.check(args[i], argformat) && !error.failed()) {
            error.error('Bad parameters format');
          }
        }
        if (error.failed()) {
          return callback(error);
        }
        try {
          return checked.apply(_this, arguments);
        } catch (error1) {
          e = error1;
          err = new Error('Uncaught exception: ' + e.message);
          if (e.stack) {
            err.stack = e.stack;
          }
          return callback(err);
        }
      };
    })(this);
  };
  check.clone = function(cloned) {
    return (function(_this) {
      return function() {
        return cloned.apply(_this, _clone(arguments));
      };
    })(this);
  };
  check.escape = function(str) {
    return str.replace(/[\\\/"']/g, '\\$&').replace(/\u0000/g, '\\0');
  };
  check.Error = CheckError;
  check.nullv = {};
  check.escapeHtml = escapeHtml;
  check.format = {
    mail: /^[a-zA-Z0-9._%\-\+]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,5}$/,
    provider: /^[a-zA-Z0-9._\-]{2,}$/,
    key: /^[a-zA-Z0-9\-_\.]{23,150}$/
  };
  return check;
};
