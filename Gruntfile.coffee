
jspath = ['client/**/*.js']

module.exports = (grunt) ->

    # Project configuration.
    grunt.initConfig
        pkg: grunt.file.readJSON 'package.json'

        jshint:
            options:
                jshintrc: '.jshintrc'
            src: jspath

        # Remove old build files
        clean:
            build:
                'target'

        includes:
            js:
                options:
                    includeRegexp: /^\/\/\s*import\s+['"]?([^'"]+)['"]?\s*$/,
                    duplicates: false,
                    debug: true
                    includePath: 'client/modules'

                cwd:'client/'
                src: '**/*.js'
                dest: 'target/'


        rename:
            usertools:
                src:  'target/shockrtools.js'
                dest: 'target/shockrtools.user.js'



    grunt.loadNpmTasks 'grunt-contrib-jshint'
    grunt.loadNpmTasks 'grunt-contrib-clean'
    grunt.loadNpmTasks 'grunt-includes'
    grunt.loadNpmTasks 'grunt-rename'

    # Default tasks.
    grunt.registerTask 'default' , ['clean', 'jshint', 'includes', 'rename' ]
