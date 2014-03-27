var path = require('path');
var spawn = require('child_process').spawn;
var fontOptimizer = path.normalize(__dirname + '/../vendor/font-optimizer');
var webifyPath = path.normalize(__dirname + '/../vendor/webify');
var Q = require('q');

module.exports = function(grunt) {

  grunt.registerMultiTask('ziti', 'Subsetting, optimizing and converting ' +
    'large font files.', function() {

    if (!grunt.file.isDir(fontOptimizer)) {
      return grunt.fail.fatal('Can\'t find font-optimizer.');
    }

    var finish = this.async();
    var files = this.files;
    var options = this.options();

    var regexTTF = new RegExp('\.ttf$', 'i');
    var regexHTML = new RegExp('\.html?$', 'i');
    var regexJS = new RegExp('\.js$', 'i');
    var regexCSS = new RegExp('\.css$', 'i');

    Q.
    fcall(function() {
      if (!grunt.file.isFile(webifyPath)) {
        var url = webifyURL();
        grunt.log.writeln('Can\'t find webify. Now downloading from:');
        grunt.log.writeln(url);
        return download(url, webifyPath, 0755);
      }
    }).
    progress(function(bundle) {
      if (typeof bundle === 'string') {
        return grunt.log.writeln('Redirected to:\n' + bundle);
      }
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write((bundle.done / bundle.total * 100).toFixed(2) +
        '%, ' + bundle.done + ' of ' + bundle.total + ' bytes downloaded... ');
    }).
    catch(function(e) {
      grunt.fail.fatal(e);
    }).
    then(function() {
      var bundle = [];
      for (var i = 0; i < files.length; i++) {
        var file = files[i];

        var ttf = [];
        var html = [];
        var js = [];
        var css = [];

        for (var j = 0; j < file.src.length; j++) {
          var src = file.src[j];
          if (regexTTF.test(src)) {
            ttf.push(src);
          } else if (regexHTML.test(src)) {
            html.push(src);
          } else if (regexJS.test(src)) {
            js.push(src);
          } else if (regexCSS.test(src)) {
            css.push(src);
          }
        }

        if (ttf.length === 0) {
          grunt.fail.fatal('Can\'t find any TTF file.');
        } else if (ttf.length > 1) {
          grunt.log.warn('There are ' + ttf.length + ' TTF files. Only ' +
            ttf[0] + ' will be used.');
        } else if (ttf[0] === file.dest) {
          grunt.fail.fatal('It\'s not recommended to overwrite the ' +
            'TTF source file.');
        }

        var src = path.resolve(ttf[0]);
        var dest = path.resolve(file.dest);

        bundle.push({
          originalSrc: ttf[0],
          src: src,
          dest: dest,
          destp1: dest + '.p1',
          options: options,
          html: html,
          css: css,
          js: js
        });
      }
      return bundle;
    }).
    then(function(bundle) {
      return bundle.reduce(function(previous, current) {
        return previous.then(function() {
          return [
            gettext_html,
            writeCharsFile,
            subset,
            obfuscate,
            webify,
            clean
          ].reduce(Q.when, Q(current));
        });
      }, Q());
    }).
    progress(function(bundle) {
      grunt.log[bundle[0]].apply(null, bundle.slice(1));
    }).
    catch(function(error) {
      grunt.fail.fatal(error);
    }).
    then(function(bundle) {
      finish();
    });

  });

  function writeCharsFile(bundle) {
    grunt.log.writeln('Characters: ' + bundle.chars);
    grunt.file.write(bundle.destp1, bundle.chars);
    return bundle;
  }

  function clean(bundle) {
    grunt.file.delete(bundle.destp1);
    return bundle;
  }

  function gettext_html(bundle) {
    return bundle.html.reduce(function(previous, current) {
      return previous.then(function() {
        return gettext_html_content(bundle, grunt.file.read(current));
      });
    }, Q());
  }

};

function addChars(bundle, string) {
  bundle.chars = bundle.chars || '';
  var i = 0, l = string.length;
  for (; i < l; i++) {
    if (bundle.chars.indexOf(string[i]) === -1) {
      bundle.chars += string[i];
    }
  }
}

function gettext_html_content(bundle, content) {
  var htmlparser = require('htmlparser2');
  var htmlOptions = bundle.options.html || {};
  var deferred = Q.defer();
  var addText = false;
  var parser = new htmlparser.Parser({
    onopentag: function(name, attribs) {
      addText = false;

      var elements = htmlOptions.elements || [];
      for (var i = 0; i < elements.length; i++) {
        if (name === elements[i]) {
          return addText = true;
        }
      }

      var classes = htmlOptions.classes || [];
      for (var i = 0; i < classes.length; i++) {
        if (hasClass(attribs.class, classes[i])) {
          return addText = true;
        }
      }

      var attributes = htmlOptions.attributes || [];
      for (var i = 0; i < attributes.length; i++) {
        if (attribs.hasOwnProperty(attributes[i])) {
          return addChars(bundle, attribs[attributes[i]]);
        }
      }
    },
    ontext: function(text) {
      if (addText === true) {
        return addChars(bundle, text.trim());
      }
    },
    onend: function() {
      deferred.resolve(bundle);
    }
  });
  parser.write(content);
  parser.end();
  return deferred.promise;
}

function hasClass(classNames, className) {
  classNames = (' ' + classNames + ' ').replace(/[\t\r\n\f]/g, ' ');
  className = ' ' + className + ' ';
  return classNames.indexOf(className) !== -1;
}

function subset(bundle) {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.notify([ 'write', 'Subsetting ' + bundle.originalSrc + '... ' ]);
  }, 0);
  var subset = spawn('./subset.pl', [
    '--charsfile=' + bundle.destp1, bundle.src, bundle.destp1
  ], {
    cwd: fontOptimizer
  });
  subset.on('close', function(code) {
    if (code === 0) {
      deferred.notify([ 'ok' ]);
      deferred.resolve(bundle);
    } else {
      deferred.notify([ 'error' ]);
      deferred.reject('subset exited with code: ' + code);
    }
  });
  return deferred.promise;
}

function obfuscate(bundle) {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.notify([ 'write', 'Obfuscating... ' ]);
  }, 0);
  var obfuscate = spawn('./obfuscate-font.pl', [
    '--all', bundle.destp1, bundle.dest
  ], {
    cwd: fontOptimizer
  });
  obfuscate.on('close', function(code) {
    if (code === 0) {
      deferred.notify([ 'ok' ]);
      deferred.resolve(bundle);
    } else {
      deferred.notify([ 'error' ]);
      deferred.reject('obfuscate exited with code: ' + code);
    }
  });
  return deferred.promise;
}

function webify(bundle) {
  var deferred = Q.defer();
  setTimeout(function() {
    deferred.notify([ 'write', 'Generating web fonts... ' ]);
  }, 0);
  var obfuscate = spawn(webifyPath, [ bundle.dest ]);
  obfuscate.on('close', function(code) {
    if (code === 0) {
      deferred.notify([ 'ok' ]);
      deferred.resolve(bundle);
    } else {
      deferred.notify([ 'error' ]);
      deferred.reject('webify exited with code: ' + code);
    }
  });
  return deferred.promise;
}

function download(url, path, chmod) {
  var deferred = Q.defer();
  var http = require('http');
  http.get(url, function(res) {
    if (res.statusCode === 301 || res.statusCode === 302) {
      url = res.headers.location;
      deferred.notify(url);
      return deferred.resolve(download(url, path, chmod));
    } else if (res.statusCode !== 200) {
      return deferred.reject('Fail to download. Status: ' + res.statusCode);
    }
    var fs = require('fs');
    var file = fs.createWriteStream(path);
    var total = parseInt(res.headers['content-length']);
    var done = 0;
    res.on('data', function(data) {
      file.write(data);
      done += data.length;
      deferred.notify({
        done: done,
        total: total
      });
    });
    res.on('end', function() {
      if (chmod) {
        fs.chmodSync(path, chmod);
      }
      deferred.resolve();
    });
  });
  return deferred.promise;
}

function webifyURL() {
  var url = 'http://sourceforge.net/projects/webify/files';
  switch (process.platform) {
  case 'darwin':
    url += '/mac/webify'
    break;
  case 'linux':
    url += (process.arch === 'x64' ? '/linux' : '/linux32') + '/webify'
    break;
  case 'win32':
    url += '/windows/webify.exe'
    break;
  default:
    grunt.fail.fatal('Can\'t download webify.');
  }
  return url;
}
