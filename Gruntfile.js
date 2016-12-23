module.exports = function ( grunt ) {
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-eslint' );
	grunt.loadNpmTasks( 'grunt-jsonlint' );
	grunt.loadTasks( 'build/tasks' );

	grunt.initConfig( {
		eslint: {
			all: [ '*.js', '{build,src,test}/**/*.js' ]
		},
		jsonlint: {
			all: 'test/data.json'
		},
		watch: {
			files: [
				'.eslintrc.json',
				'<%= eslint.all %>',
				'test/data.json'
			],
			tasks: [ 'test' ]
		}
	} );

	grunt.registerTask( 'test', [ 'eslint', 'jsonlint', 'unit' ] );
	grunt.registerTask( 'default', 'test' );
};
