var path = require('path');
var spawn = require('child_process').spawn;
var fontOptimizer = path.normalize(__dirname + '/../vendor/font-optimizer');
var webifyPath = path.normalize(__dirname + '/../vendor/webify');

module.exports = function(grunt) {

  grunt.registerMultiTask('ziti', 'Subsetting, optimizing and converting ' +
    'large font files.', function() {

    if (!grunt.file.isDir(fontOptimizer)) {
      return grunt.fail.fatal('Can\'t find font-optimizer.');
    } else if (!grunt.file.isFile(webifyPath)) {
      return grunt.fail.fatal('Can\'t find webify.');
    }

    var finish = this.async();

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

      var chars = '--chars="' + options.font.chars + '"';

      subset([ chars, src, destp1 ], function() {
        obfuscate([ '--all', destp1, dest ], function() {
          grunt.file.delete(destp1);
          webify([ dest ], finish);
        });
      });
    });

  });

};

function subset(args, callback) {
  var subset = spawn('./subset.pl', args, {
    cwd: fontOptimizer
  });
  subset.stdout.pipe(process.stdout);
  subset.stderr.pipe(process.stderr);
  subset.on('close', callback);
}

function obfuscate(args, callback) {
  var obfuscate = spawn('./obfuscate-font.pl', args, {
    cwd: fontOptimizer
  });
  obfuscate.stdout.pipe(process.stdout);
  obfuscate.stderr.pipe(process.stderr);
  obfuscate.on('close', callback);
}

function webify(args, callback) {
  var obfuscate = spawn(webifyPath, args);
  obfuscate.stdout.pipe(process.stdout);
  obfuscate.stderr.pipe(process.stderr);
  obfuscate.on('close', callback);
}
