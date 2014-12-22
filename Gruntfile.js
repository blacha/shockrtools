jspath = ['client/**/*.js'];

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            src: jspath
        },

        // Remove old build files
        clean: {
            build: [
                'target'
            ],
            modules: [
                'target/modules'
            ]
        },

        mkdir: {
            chrome: {
                options: {
                    create: ['target/chrome']
                }

            }
        },

        copy: {
            chrome: {
                files: [{
                        flatten: true,
                        expand: true,
                        src: 'chrome/*.json',
                        dest: 'target/chrome/'
                    }, {
                        flatten: true,
                        expand: true,
                        src: 'target/shockrtools.js',
                        dest: 'target/chrome/'
                    }]
            }
        },

        includes: {
            js: {
                options: {
                    includeRegexp: /^\/\/\s*import\s+['"]?([^'"]+)['"]?\s*$/,
                    duplicates: false,
                    debug: true,
                    includePath: 'client/modules',
                },

                cwd: 'client/',
                src: '**/*.js',
                dest: 'target/'
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-includes');
    grunt.loadNpmTasks('grunt-mkdir');

    // Default tasks.
    grunt.registerTask('default', [
        'clean',
        'jshint',
        'includes',
        'clean:modules', // remove all the old modules
        'mkdir:chrome', // set up chrome extensionbuild dir.
        'copy' // move all chrome extension files in.
    ]);
}