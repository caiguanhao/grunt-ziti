module.exports = function(grunt) {

  grunt.initConfig({
    clean: {
      test: [ 'test/fixtures/my-ziti.*' ]
    },
    ziti: {
      index: {
        options: {
          html: {
            classes: [ 'my-ziti' ],
            attributes: [ 'data-text' ],
            elements: [ 'h2' ]
          },
          js: {
            functions: [ '$ziti$' ]
          },
          css: {
            selectors: [ '.words:before' ]
          },
          font: {
            subset: true,
            optimize: true,
            convert: true
          }
        },
        files: {
          'test/fixtures/my-ziti.ttf': [
            'test/fixtures/index.html',
            'test/fixtures/index.js',
            'test/fixtures/index.css',
            'test/fixtures/original.ttf'
          ]
        }
      }
    }
  });

  grunt.loadTasks('tasks');

  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('default', [ 'clean', 'download-font', 'ziti' ]);

  grunt.registerTask('download-font', 'Download TTF font', function() {
    var https = require('https');
    var fs = require('fs');
    var ttf = 'test/fixtures/original.ttf';

    if (!grunt.file.isFile(ttf)) {
      var finish = this.async();
      var url = 'https://github.com/cghio/wqyfonts/raw/master/fonts/' +
        'WenQuanYiMicroHei.ttf';
      download(url, finish);
    } else {
      grunt.log.ok('No need to download.')
    }

    function download(url, callback) {
      https.get(url, function(response) {
        if (response.statusCode === 302) {
          return download(response.headers.location, callback);
        } else if (response.statusCode !== 200) {
          grunt.fail.fatal('Fail to download. Status: ' + response.statusCode);
        }
        var file = fs.createWriteStream(ttf);
        var total = parseInt(response.headers['content-length']);
        var acc = 0;
        response.on('data', function(data) {
          file.write(data);
          acc += data.length;
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write((acc / total * 100).toFixed(2) + '%, ' + acc +
            ' of ' + total + ' bytes downloaded... ');
        });
        response.on('end', function() {
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          grunt.log.ok('Downloaded ' + url);
          if (callback) callback();
        });
      });
    }
  });

};
