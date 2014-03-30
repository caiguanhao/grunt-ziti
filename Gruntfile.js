module.exports = function(grunt) {

  grunt.initConfig({
    clean: {
      test: [ 'test/tmp/*' ]
    },
    ziti: {
      index: {
        options: {
          html: {
            classes: [ 'my-ziti' ],
            attributes: [ 'data-text' ],
            elements: [ 'h2' ],
            comments: [ 'ziti' ]
          },
          js: {
            functions: [ '$ziti$', '$htmlziti$' ],
            comments: [ 'ziti' ]
          },
          css: {
            selectors: [ '.words:before' ],
            comments: [ 'ziti', 'htmlziti' ]
          },
          subset: true,
          optimize: true,
          convert: true,
          deleteCharsFile: false
        },
        files: {
          'test/tmp/my-ziti.ttf': [
            'test/fixtures/index.html',
            'test/fixtures/index.js',
            'test/fixtures/index.css',
            'test/fixtures/original.ttf'
          ]
        }
      },
      none: {
        files: {
          'test/tmp/none.ttf': [
            'test/fixtures/original.ttf'
          ]
        }
      }
    },
    connect: {
      test: {
        options: {
          hostname: '*',
          port: 3000,
          base: [ 'test' ]
        }
      }
    },
    watch: {
      options: {
        livereload: true
      },
      main: {
        files: [ 'tasks/*', 'Gruntfile.js' ],
        tasks: [ 'ziti:index' ]
      },
      test: {
        files: [ 'test/fixtures/*' ],
        tasks: [ 'ziti:index' ]
      }
    }
  });

  grunt.loadTasks('tasks');

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', [
    'clean',
    'download-font',
    'ziti:index',
    'connect',
    'watch'
  ]);

  grunt.registerTask('test', [ 'clean', 'download-font', 'ziti' ]);

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
