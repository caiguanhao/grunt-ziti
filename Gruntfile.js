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
            convert: true,
            chars: "字形（glyph）字体（typeface）字型（font）名称标准"
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

  grunt.registerTask('default', [ 'clean', 'ziti' ]);

};
