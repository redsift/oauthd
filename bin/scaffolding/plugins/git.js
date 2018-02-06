var Q, fs;

Q = require('q');

fs = require('fs');

module.exports = function(env, plugin_name, fetch, cwd) {
  var createDefer, exec, execGit, fetched, git, plugin_location;
  createDefer = Q.defer();
  exec = env.exec;
  cwd = cwd || process.cwd();
  plugin_location = cwd + '/plugins/' + plugin_name;
  fetched = false;
  if (!fs.existsSync(plugin_location + '/.git')) {
    createDefer.reject(new Error('No .git file.'));
  }
  execGit = function(commands, callback) {
    var full_command, k, v;
    full_command = 'cd ' + plugin_location + ';';
    if (fetch && !fetched) {
      full_command += ' git fetch;';
      fetched = true;
    }
    for (k in commands) {
      v = commands[k];
      full_command += ' git ' + v + ';';
    }
    return exec(full_command, function() {
      return callback.apply(null, arguments);
    });
  };
  git = {
    getCurrentVersion: function() {
      var defer;
      defer = Q.defer();
      execGit(['branch -v'], function(error, stdout, stderr) {
        var behind, head, tag, version;
        if (error) {
          return defer.reject(error);
        }
        tag = stdout.match(/\* \(detached from (.*)\)/);
        tag = tag != null ? tag[1] : void 0;
        if (!tag) {
          head = stdout.match(/\* ([^\s]*)/);
          head = head != null ? head[1] : void 0;
          behind = stdout.match(/\*.*\[behind (\d+)\]/);
          behind = behind != null ? behind[1] : void 0;
        }
        version = {};
        if (tag != null) {
          version.version = tag;
          if (tag.match(/(\d+)\.(\d+)\.(\d+)/)) {
            version.type = 'tag_n';
          } else {
            version.type = 'tag_a';
          }
        } else if (head != null) {
          version.version = head;
          version.type = 'branch';
          if (behind != null) {
            version.uptodate = false;
          } else {
            version.uptodate = true;
          }
        } else {
          version.version = 'No version information';
          version.type = 'unversionned';
        }
        return defer.resolve(version);
      });
      return defer.promise;
    },
    getVersionDetail: function(version) {
      var changes, major, minor, version_detail;
      version_detail = version.match(/(\d+)\.(\d+)\.(\d+)/);
      changes = version_detail[3];
      minor = version_detail[2];
      major = version_detail[1];
      return {
        major: major,
        minor: minor,
        changes: changes
      };
    },
    isNumericalVersion: function(version) {
      return version.match(/(\d+)\.(\d+)\.(\d+)/);
    },
    isNumericalMask: function(version) {
      return version.match(/^(\d+)\.(\d+|x)\.(\d+|x)$/);
    },
    compareVersions: function(a, b) {
      var vd_a, vd_b;
      if (a === b) {
        return 0;
      }
      vd_a = git.getVersionDetail(a);
      vd_b = git.getVersionDetail(b);
      if (vd_a.major > vd_b.major) {
        return 1;
      } else if (vd_a.major === vd_b.major) {
        if (vd_a.minor > vd_b.minor) {
          return 1;
        } else if (vd_a.minor === vd_b.minor) {
          if (vd_a.changes > vd_b.changes) {
            return 1;
          } else {
            return -1;
          }
        } else {
          return -1;
        }
      } else {
        return -1;
      }
    },
    matchVersion: function(mask, version) {
      var mask_, md, vd;
      mask_ = mask.match(/(\d+)\.(\d+|x)\.(\d+|x)/);
      md = {
        major: mask_[1],
        minor: mask_[2],
        changes: mask_[3]
      };
      vd = git.getVersionDetail(version);
      if (vd.major === md.major) {
        if (vd.minor === md.minor || md.minor === 'x') {
          if (vd.changes === md.changes || md.changes === 'x') {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      } else {
        return false;
      }
    },
    getAllVersions: function(mask) {
      var defer;
      defer = Q.defer();
      execGit(['tag'], function(error, stdout, stderr) {
        var k, matched_tags, tag, tags;
        tags = stdout.match(/(\d+)\.(\d+)\.(\d+)/g);
        matched_tags = [];
        if (mask) {
          for (k in tags) {
            tag = tags[k];
            if (git.matchVersion(mask, tag)) {
              matched_tags.push(tag);
            }
          }
          tags = matched_tags;
        }
        tags.sort(git.compareVersions);
        return defer.resolve(tags);
      });
      return defer.promise;
    },
    getAllTagsAndBranches: function() {
      var defer, versions;
      defer = Q.defer();
      versions = {};
      execGit(['tag'], function(error, stdout, stderr) {
        versions.tags = stdout.match(/[^\s]+/g);
        return execGit(['branch -a'], function(error, stdout, stderr) {
          var branches, k, match, v;
          branches = stdout.match(/.+/g);
          versions.branches = [];
          for (k in branches) {
            v = branches[k];
            v = v.replace(/^[\s]+/, '');
            match = v.match(/[^\s]+\/[^\s]+\/([^\s]+).*/);
            if (match) {
              v = match[1];
            }
            if ((!v.match(/detached/)) && (!v.match(/HEAD/))) {
              versions.branches.push(v);
            }
          }
          return defer.resolve(versions);
        });
      });
      return defer.promise;
    },
    getLatestVersion: function(mask) {
      var defer;
      defer = Q.defer();
      if (mask.match(/^(\d+)\.(\d+|x)\.(\d+|x)$/)) {
        git.getAllVersions(mask).then(function(versions) {
          var latest_version;
          latest_version = versions[versions.length - 1];
          return defer.resolve(latest_version);
        });
      } else {
        defer.resolve(mask);
      }
      return defer.promise;
    },
    getVersionMask: function() {
      var defer;
      defer = Q.defer();
      env.plugins.info.getPluginsJson().then(function(data) {
        var version_mask;
        version_mask = data[plugin_name].version;
        if (!(version_mask != null) && data[plugin_name].repository) {
          version_mask = 'master';
        }
        return defer.resolve(version_mask);
      }).fail(function(e) {
        return defer.reject(e);
      });
      return defer.promise;
    },
    getRemote: function() {
      var defer;
      defer = Q.defer();
      env.plugins.info.getPluginsJson().then(function(data) {
        var plugin_data;
        plugin_data = data[plugin_name];
        return defer.resolve(plugin_data.repository);
      }).fail(function(e) {
        return defer.reject(e);
      });
      return defer.promise;
    },
    pullBranch: function(branch) {
      var defer;
      defer = Q.defer();
      execGit(['pull origin ' + branch], function(err, stdout, stderr) {
        if (err == null) {
          return defer.resolve();
        } else {
          return defer.reject();
        }
      });
      return defer.promise;
    },
    checkout: function(version) {
      var defer;
      defer = Q.defer();
      execGit(['checkout ' + version], function(err, stdout, stderr) {
        if (err == null) {
          return defer.resolve();
        } else {
          return defer.reject(new Error('The target version ' + version + ' does not seem to exist'));
        }
      });
      return defer.promise;
    },
    isValidRepository: function() {
      var defer;
      defer = Q.defer();
      exec('cd ' + process.cwd() + '/plugins/' + plugin_name + '; echo $(git rev-parse --show-toplevel)', function(err, stdout, stderr) {
        stdout = stdout.replace(/[\s]/, '');
        return defer.resolve(stdout === process.cwd() + '/plugins/' + plugin_name);
      });
      return defer.promise;
    }
  };
  createDefer.resolve(git);
  return createDefer.promise;
};
