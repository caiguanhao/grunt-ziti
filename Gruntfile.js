module.exports = function(grunt) {

  grunt.initConfig({
    clean: {
      test: [ 'test/tmp/*' ]
    },
    ziti: {
      index: {
        options: {
          html: {
            pattern: '\\.html?$',
            classes: [ 'my-ziti' ],
            attributes: [ 'data-text' ],
            elements: [ 'h2' ],
            comments: [ 'ziti' ]
          },
          js: {
            pattern: '\\.js$',
            functions: [ '$ziti$', '$htmlziti$' ],
            comments: [ 'ziti' ]
          },
          css: {
            pattern: '\\.css$',
            selectors: [ '.words:before' ],
            comments: [ 'ziti', 'htmlziti' ]
          },
          font: {
            pattern: '\\.ttf$',
            chars: '配置',
            charsFilePattern: '\\.txt$'
          },
          download: {
            'test/fixtures/original.ttf': 'https://github.com/cghio/wqyfonts' +
              '/raw/master/fonts/WenQuanYiMicroHei.ttf'
          },
          subset: true,
          optimize: true,
          convert: true,
          deleteCharsFile: false
        },
        files: {
          'test/tmp/index.ttf': [
            'test/fixtures/index.html',
            'test/fixtures/index.js',
            'test/fixtures/index.css',
            'test/fixtures/index.txt',
            'test/fixtures/original.ttf'
          ]
        }
      },
      subset_only: {
        options: {
          font: {
            chars: '字形字体字型'
          },
          convert: false
        },
        files: {
          'test/tmp/subset_only.ttf': [
            'test/fixtures/original.ttf'
          ]
        }
      },
      convert_only: {
        options: {
          subset: false,
          convert: true
        },
        files: {
          'test/tmp/convert_only.ttf': [
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
    'ziti:index',
    'connect',
    'watch'
  ]);

  grunt.registerTask('test', [ 'clean', 'ziti' ]);

};
