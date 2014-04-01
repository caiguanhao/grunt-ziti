var path = require('path');
var spawn = require('child_process').spawn;
var Q = require('q');

var fontOptimizer = path.normalize(__dirname + '/../vendor/font-optimizer');
var webifyPath = path.normalize(__dirname + '/../vendor/webify');

module.exports = function(grunt) {

  grunt.registerMultiTask('ziti', 'Subsetting, optimizing and converting ' +
    'large font files.', function() {

    if (!grunt.file.isDir(fontOptimizer)) {
      return grunt.fail.fatal('Can\'t find font-optimizer. You may need to ' +
        're-install or re-download grunt-ziti.');
    }

    var finish = this.async();
    var files = this.files;
    var options = this.options({
      html: {},
      js: {},
      css: {},
      font: {},
      subset: true,
      optimize: true,
      convert: true,
      deleteCharsFile: true
    });

    var regexTTF = makeRegExp(options.font.pattern, '\\.ttf$', 'i');
    var regexHTML = makeRegExp(options.html.pattern, '\\.html?$', 'i');
    var regexJS = makeRegExp(options.js.pattern, '\\.js$', 'i');
    var regexCSS = makeRegExp(options.css.pattern, '\\.css$', 'i');

    var regexCharsFile;
    if (typeof options.font.charsFilePattern === 'string') {
      regexCharsFile = new RegExp(options.font.charsFilePattern);
    }

    Q.
    fcall(function() {
      if (options.convert === true && !grunt.file.isFile(webifyPath)) {
        var url = webifyURL();
        grunt.log.writeln('Can\'t find webify. Now downloading from:');
        grunt.log.writeln(url);
        return download(url, webifyPath, 0755);
      }
    }).
    then(function() {
      if (typeof options.download !== 'object') return;
      var downloadFiles = Object.keys(options.download);
      if (downloadFiles.length === 0) return;
      var downloadList = [];
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        for (var j = 0; j < downloadFiles.length; j++) {
          var f = downloadFiles[j];
          if (file.src.indexOf(f) > -1) continue;
          for (var k = 0; k < file.orig.src.length; k++) {
            if (grunt.file.isMatch(file.orig.src[k], f)) {
              downloadList.push(f);
            }
          }
        }
      }
      return downloadList.reduce(function(previous, current) {
        return previous.then(function() {
          return download(options.download[current], current).then(function() {
            for (var i = 0; i < files.length; i++) {
              var file = files[i];
              for (var j = 0; j < file.orig.src.length; j++) {
                if (grunt.file.isMatch(file.orig.src[j], current)) {
                  if (file.src.indexOf(f) === -1) file.src.push(f);
                }
              }
            }
          });
        });
      }, Q());
    }).
    progress(function(bundle) {
      if (bundle) grunt.log[bundle[0]].apply(null, bundle.slice(1));
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
        var charsFiles = [];

        for (var j = 0; j < file.src.length; j++) {
          var src = file.src[j];
          var basename = path.basename(src);
          if (regexTTF.test(basename)) {
            ttf.push(src);
          } else if (regexHTML.test(basename)) {
            html.push(src);
          } else if (regexJS.test(basename)) {
            js.push(src);
          } else if (regexCSS.test(basename)) {
            css.push(src);
          } else if (regexCharsFile && regexCharsFile.test(basename)) {
            charsFiles.push(src);
          }
        }

        if (options.subset === true) {
          if (ttf.length === 0) {
            grunt.log.warn('Can\'t find any TTF file.');
          } else if (ttf.length > 1) {
            grunt.log.warn('There are ' + ttf.length + ' TTF files. Only ' +
              ttf[0] + ' will be used.');
          } else if (ttf[0] === file.dest) {
            grunt.fail.fatal('It\'s not recommended to overwrite the ' +
              'TTF source file.');
          }
        }

        var src = ttf[0] ? path.resolve(ttf[0]) : '';
        var dest = path.resolve(file.dest);

        bundle.push({
          originalSrc: ttf[0] || '',
          src: src,
          dest: dest,
          chars: options.font.chars || '',      // initial chars
          charsFile: dest + '.chars',
          optimizedFile: dest + '.optimized',
          options: options,
          html: html,
          css: css,
          js: js,
          charsFiles: charsFiles
        });
      }
      return bundle;
    }).
    then(function(bundle) {
      return bundle.reduce(function(previous, current) {
        return previous.then(function() {
          var tasks = [
            addCharsFromCharsFiles,
            gettext('html'),
            gettext('js'),
            gettext('css'),
            writeCharsFile
          ];
          if (current.src) {
            if (current.options.subset === true) {
              tasks.push(subset);
              if (current.options.optimize === true) {
                tasks.push(obfuscate);
                tasks.push(renameOptimizedFile);
              }
            } else {
              tasks.push(function(bundle) {
                grunt.log.writeln('Source font file will not be subsetted.');
                return bundle;
              });
            }
            if (current.options.convert === true) {
              tasks.push(copySrcToDestIfDestIsMissing);
              tasks.push(webify);
            }
            if (current.options.deleteCharsFile === true) {
              tasks.push(cleanCharsFile);
            }
          }
          return tasks.reduce(Q.when, Q(current));
        });
      }, Q());
    }).
    progress(function(bundle) {
      if (bundle) grunt.log[bundle[0]].apply(null, bundle.slice(1));
    }).
    catch(function(error) {
      grunt.fail.fatal(error);
    }).
    then(function(bundle) {
      finish();
    });

  });

  function writeCharsFile(bundle) {
    if (bundle.chars) {
      grunt.log.ok('Characters: ' + bundle.chars);
    } else {
      if (bundle.options.subset === true) {
        grunt.log.warn('Found no characters.');
      }
    }
    grunt.file.write(bundle.charsFile, bundle.chars || '');
    return bundle;
  }

  function cleanCharsFile(bundle) {
    grunt.file.delete(bundle.charsFile);
    return bundle;
  }

  function renameOptimizedFile(bundle) {
    var deferred = Q.defer();
    var fs = require('fs');
    fs.rename(bundle.optimizedFile, bundle.dest, function(err) {
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve(bundle);
      }
    });
    return deferred.promise;
  }

  function copySrcToDestIfDestIsMissing(bundle) {
    if (!grunt.file.isFile(bundle.dest)) {
      grunt.file.copy(bundle.src, bundle.dest);
    }
    return bundle;
  }

  var gettextFunctions = {
    html: gettextHTMLContent,
    js:   gettextJSContent,
    css:  gettextCSSContent
  };

  function gettext(filetype) {
    return function(bundle) {
      return bundle[filetype].reduce(function(previous, current) {
        return previous.then(function() {
          return gettextFunctions[filetype](bundle, grunt.file.read(current));
        });
      }, Q(bundle));
    };
  }

  function addCharsFromCharsFiles(bundle) {
    return bundle.charsFiles.reduce(function(previous, current) {
      return previous.then(function() {
        var content = grunt.file.read(current);
        if (content) addChars(bundle, content.trim());
        return bundle;
      });
    }, Q(bundle));
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

function gettextHTMLContent(bundle, content) {
  var htmlparser = require('htmlparser2');
  var htmlOptions = bundle.options.html;

  var elements = htmlOptions.elements || [];
  var classes = htmlOptions.classes || [];
  var attributes = htmlOptions.attributes || [];
  var comments = htmlOptions.comments || [];

  var deferred = Q.defer();
  var addText = false;
  var processTextAsHTML = false;
  var processTextAsJS = false;
  var processTextAsCSS = false;
  var parser = new htmlparser.Parser({
    onopentag: function(name, attribs) {
      processTextAsHTML = false;
      processTextAsJS = false;
      processTextAsCSS = false;
      if (name === 'script') {
        var type = (attribs.type || '').trim();
        // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-type
        if (type === '' || /^(text|application)\/(ecma|java)script$/i.test(type)) {
          return processTextAsJS = true;
        }
        return processTextAsHTML = true;
      }
      if (name === 'style') {
        return processTextAsCSS = true;
      }

      addText = false;
      for (var i = 0; i < elements.length; i++) {
        if (name === elements[i]) return addText = true;
      }
      for (var i = 0; i < classes.length; i++) {
        if (hasClass(attribs.class, classes[i])) return addText = true;
      }
      for (var i = 0; i < attributes.length; i++) {
        if (attribs.hasOwnProperty(attributes[i])) {
          return addChars(bundle, attribs[attributes[i]]);
        }
      }
    },
    oncomment: function(data) {
      if (comments.length > 0) {
        gettextHTMLComments(bundle, comments, data);
      }
    },
    ontext: function(text) {
      if (processTextAsHTML === true) {
        return gettextHTMLContent(bundle, text);
      }
      if (processTextAsJS === true) {
        return gettextJSContent(bundle, text);
      }
      if (processTextAsCSS === true) {
        return gettextCSSContent(bundle, text);
      }
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

var BLANK = '[\\s\\t\\n\\r\\f]{0,}';
// see http://stackoverflow.com/a/9337047/855665
var NAME_DELIMETER = '[^A-Za-z0-9_$\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\uff3f]';

function makeRegExp(regex, defaultRegExp, flags) {
  if (typeof regex === 'string' && regex.length > 0) {
    return new RegExp(regex, flags);
  }
  return new RegExp(defaultRegExp, flags);
}

function gettextJSContent(bundle, content) {
  var jsOptions = bundle.options.js;

  var funcs = jsOptions.functions || [];
  if (funcs.length > 0) gettextJSFunctions(bundle, funcs, content);

  var comments = jsOptions.comments || [];
  if (comments.length > 0) gettextJSComments(bundle, comments, content);

  return bundle;
}

function gettextJSFunctions(bundle, funcs, content) {
  var funcNames = funcs.map(function(f) { return escapeRegex(f); });

  var functions = NAME_DELIMETER + '(' + funcNames.join('|') + ')' +
    BLANK + '\\(' + BLANK + '([\'"])([\\S\\s]+?)';
  var functionsRegExp = new RegExp(functions + '[\'"]' + BLANK + '\\)');
  var functionsRegExpGlobal = new RegExp(functions + '\\)', 'g');

  var concat = '^' + BLANK + '\\+' + BLANK + '$';
  var concatRegExp = new RegExp(concat);
  var concatRegExpStart = new RegExp('^' + BLANK + '\\+');
  var concatRegExpEnd = new RegExp('\\+' + BLANK + '$');

  var mRegExp = new RegExp('[\'"]' + BLANK + '\\+' + BLANK + '$', 'mg');
  var mRegExp2 = new RegExp('(\\()' + BLANK + '([\'"])');
  var mRegExp3 = new RegExp('^' + BLANK + '[\'"]' + BLANK, 'mg');

  content = content.replace(/(['"])(.+?|)\)(.+?|)\1/g, '$1$2\x00$3$1');
  var m = (' ' + content).match(functionsRegExpGlobal) || [];

  for (var i = 0; i < m.length; i++) {
    var t = m[i];
    t = t.replace(/[^'"]+$/, ')');
    // turn oneline concat string to multiline
    var s = t.split(/['"]/);
    for (var j = s.length - 1; j >= 0; j--) {
      if (concatRegExp.test(s[j])) {
        s[j] = (' ' + s[j] + ' ').replace(/[\s\t\n\r\f]{1,}/g, '\n');
      } else if (concatRegExpStart.test(s[j]) && concatRegExpEnd.test(s[j])) {
        s[j] = '\n+\n';
      }
    }
    t = s.join('"');
    // multiline string:
    t = t.replace(mRegExp, '');
    t = t.replace(mRegExp2, '$1$2');
    t = t.replace(mRegExp3, '');
    t = t.replace(/\n/g, '');
    t = t.match(functionsRegExp);
    if (t) addChars(bundle, t[3].replace(/\x00/g, ')'));
  }
}

function gettextJSComments(bundle, comments, content) {
  var cont = '', start = 0, end = 0, cursor = 0;
  for (; end < content.length;) {
    start = content.indexOf('/*', cursor);
    end = content.indexOf('*/', start + 2);
    if (start === -1 || end === -1) break;
    cont += content.substring(start + 2, end);
    cursor = end + 2;
  }

  comments = comments.map(function(c) { return escapeRegex(c); });
  var comm = NAME_DELIMETER + '(' + comments.join('|') + ')' + BLANK +
    '\\{([\\S\\s]+?)\\}';
  var blankRegExpGlobal = new RegExp(BLANK, 'g');

  var m, c;
  while (m = (' ' + cont).match(comm)) {
    c = m[2].replace(blankRegExpGlobal, '');
    addChars(bundle, c);
    cont = cont.substr(m.index + m[0].length - 1);
  }
}

function gettextHTMLComments(bundle, comments, content) {
  comments = comments.map(function(c) { return escapeRegex(c); });
  var comm = NAME_DELIMETER + '(' + comments.join('|') + ')' +
    BLANK + '\\{([\\S\\s]+?)' + BLANK + '\\}';
  var commRegExp = new RegExp(comm);
  var commRegExpGlobal = new RegExp(comm, 'g');
  content = content.replace(/\}/g, ' } ')
  var m = (' ' + content).match(commRegExpGlobal) || [];
  for (var i = 0; i < m.length; i++) {
    var s = (' ' + m[i]).match(commRegExp);
    if (!s) continue;
    addChars(bundle, s[2].replace(new RegExp(BLANK, 'g'), ''));
  }
}

function gettextCSSContent(bundle, content) {
  var cssOptions = bundle.options.css;
  var selectors = cssOptions.selectors || [];
  var comments = cssOptions.comments || [];

  var contentPropRegExp = new RegExp('^' + BLANK +'content\\:' + BLANK +
    '[\'"]([\\S\\s]+?)[\'"]' + BLANK + '$');
  var splitRegExp = new RegExp('[\'"][\\s\\t]{0,}[\'"]');

  // comments
  var cont = [], comm = '', start = 0, end = 0, cursor = 0;
  for (; end < content.length;) {
    start = content.indexOf('/*', cursor);
    end = content.indexOf('*/', start + 2);
    if (start === -1 || end === -1) break;
    cont.push(content.substring(cursor, start));
    comm += content.substring(start + 2, end);
    cursor = end + 2;
  }

  if (comments.length > 0) {
    var commentRegExp = NAME_DELIMETER + '(' + comments.join('|') + ')' +
      BLANK + '\\{([\\S\\s]+?)\\}';
    var blankRegExpGlobal = new RegExp(BLANK, 'g');
    var m, c;
    while (m = (' ' + comm).match(commentRegExp)) {
      c = m[2].replace(blankRegExpGlobal, '');
      addChars(bundle, c);
      comm = comm.substr(m.index + m[0].length - 1);
    }
  }

  if (selectors.length === 0) return bundle;

  selectors = selectors.map(function(s) { return escapeRegex(s); });
  var rulesRegExp = new RegExp('[;{}]' + BLANK + '(' + selectors.join('|') +
    ')' + BLANK + '\\{([\\S\\s]+?)$');

  if (cont.length > 0) {
    content = cont.join('') + content.substring(cursor, content.length);
  }

  // replace '}' in strings to NULL to not match them in rulesRegExp
  content = content.replace(/(['"])(.+?|)\}(.+?|)\1/g, '$1$2\x00$3$1');

  var m = content.split('}');
  for (var i = 0; i < m.length; i++) {
    t = (';' + m[i]).match(rulesRegExp);
    if (!t) continue;
    t = t[2].replace(/(['"])(.+?|);(.+?|)\1/g, '$1$2\x01$3$1').split(';');
    for (var j = t.length - 1; j >= 0; j--) {
      var a = t[j].trim().match(contentPropRegExp);
      if (!a) continue;
      var s = a[1].replace(/\x00/g, '}').replace(/\x01/g, ';');
      s = s.split(splitRegExp).join('');

      var ind = s.match(/['"]/);
      if (ind) s = s.substr(0, ind.index);
      // skip invalid property value:
      if (/['"]$/.test(s) || /\n|\r|\f/.test(s)) continue;

      s = s.replace(/[\s\t]{0,}/g, '');
      if (!s) continue;

      addChars(bundle, s);
      break; // only use last valid property value
    }
  }
  return bundle;
}

function escapeRegex(string) {
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
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
    '--charsfile=' + bundle.charsFile, bundle.src, bundle.dest
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
    '--all', bundle.dest, bundle.optimizedFile
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
  var protocol;
  if (url.substr(0, 8) === 'https://') {
    protocol = 'https';
  } else if (url.substr(0, 7) === 'http://') {
    protocol = 'http'
  }
  if (!protocol) return Q.reject('Unknown protocol of URL: ' + url);

  var deferred = Q.defer();
  var http = require(protocol);
  http.get(url, function(res) {
    if (res.statusCode === 301 || res.statusCode === 302) {
      url = res.headers.location;
      deferred.notify([ 'ok', 'Redirected to: ' + url ]);
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
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      deferred.notify([ 'write', (done / total * 100).toFixed(2) + '%, ' +
        done + ' of ' + total + ' bytes downloaded... ' ]);
    });
    res.on('end', function() {
      file.end();
      deferred.notify([ 'writeln' ]);
      deferred.notify([ 'ok', 'Download completed: ' + path ]);
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
    url += '/mac/webify-0.1.6.0'
    break;
  case 'linux':
    url += (process.arch === 'x64' ? '/linux' : '/linux32') + '/webify-0.1.6.0'
    break;
  case 'win32':
    url += '/windows/webify-0.1.6.0.exe'
    break;
  default:
    grunt.fail.fatal('Can\'t download webify.');
  }
  url += '/download';
  return url;
}
