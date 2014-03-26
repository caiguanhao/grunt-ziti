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
    then(function() {
      finish();
    }).
    catch(function(e) {
      grunt.fail.fatal(e);
    });

    /*
    var regexTTF = new RegExp('\.ttf$', 'i');
    var regexHTML = new RegExp('\.html?$', 'i');
    var regexJS = new RegExp('\.js$', 'i');
    var regexCSS = new RegExp('\.css$', 'i');

    var options = this.options();

    this.files.forEach(function(file) {

      var ttf = [];
      var html = [];
      var js = [];
      var css = [];

      file.src.forEach(function(p) {
        if (regexTTF.test(p)) {
          return ttf.push(p);
        } else if (regexHTML.test(p)) {
          return html.push(p);
        } else if (regexJS.test(p)) {
          return js.push(p);
        } else if (regexCSS.test(p)) {
          return css.push(p);
        }
      });

      if (ttf.length === 0) {
        return grunt.log.warn('Can\'t find any TTF file.');
      } else if (ttf.length > 1) {
        grunt.log.warn('There are ' + ttf.length + ' TTF files. Only ' +
          ttf[0] + ' will be used.');
      } else if (ttf[0] === file.dest) {
        return grunt.log.warn('It\'s not recommended to overwrite the ' +
          'TTF source file.');
      }

      var src = path.resolve(ttf[0]);
      var dest = path.resolve(file.dest);
      var destp1 = dest + '.p1';

      grunt.file.write(destp1, options.font.chars);

      var chars = '--charsfile=' + destp1;

      grunt.log.write('Subsetting ' + ttf[0] + '... ');
      subset([ chars, src, destp1 ], function(code) {
        if (code !== 0) {
          grunt.log.error();
          grunt.fail.fatal('Error subsetting font (code: ' + code + ').');
        }
        grunt.log.ok();
        grunt.log.write('Obfuscating... ');
        obfuscate([ '--all', destp1, dest ], function(code) {
          if (code !== 0) {
            grunt.log.error();
            grunt.fail.fatal('Error obfuscating font (code: ' + code + ').');
          }
          grunt.log.ok();
          grunt.file.delete(destp1);
          grunt.log.write('Generating web fonts... ');
          webify([ dest ], function(code) {
            if (code !== 0) {
              grunt.log.error();
              grunt.fail.fatal('Error generating web font (code: ' + code +
                ').');
            }
            grunt.log.ok();
            finish();
          });
        });
      });
    });
    */

  });

};

function subset(args, callback) {
  var subset = spawn('./subset.pl', args, {
    cwd: fontOptimizer
  });
  subset.on('close', callback);
}

function obfuscate(args, callback) {
  var obfuscate = spawn('./obfuscate-font.pl', args, {
    cwd: fontOptimizer
  });
  obfuscate.on('close', callback);
}

function webify(args, callback) {
  var obfuscate = spawn(webifyPath, args);
  obfuscate.on('close', callback);
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
