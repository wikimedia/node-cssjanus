/* eslint-disable no-console */

module.exports = function ( grunt ) {
	grunt.registerTask( 'site', function () {
		var from = 'site/',
			// E.g. 'grunt site --dest ../cssjanus.github.io'
			// Ensure 'to' path ends in a slash
			to = ( grunt.option( 'dest' ) || 'dest/' ).replace( /\/?$/, '/' ),
			paths = [
				'/demo/',
				'/lib/',
				'/index.html',
				'/site.css'
			];
		function copyFile( src, dest ) {
			// Fix path to cssjanus.js for site/index.html
			// and site/demo/index.html
			if ( /index\.html$/.test( src ) ) {
				grunt.file.copy( src, dest, {
					process: function ( contents ) {
						return contents
							.replace( '../src/cssjanus.js"', './lib/cssjanus.js"' )
							.replace( '".././', '"../' );
					}
				} );
			} else {
				grunt.file.copy( src, dest );
			}
		}
		if ( !grunt.file.isDir( from ) ) {
			grunt.log.error( 'Unable to open ' + from );
			return false;
		}
		grunt.file.mkdir( to );
		paths.forEach( function ( path ) {
			var src = from + path,
				dest = to + path,
				files;
			if ( grunt.util._.endsWith( dest, '/' ) ) {
				grunt.file.mkdir( dest );
				// Does not support nested directories
				files = grunt.file.expandMapping( '*', dest, { cwd: src } );
				files.forEach( function ( pair ) {
					copyFile( pair.src[ 0 ], pair.dest );
				} );
			} else {
				copyFile( src, dest );
			}
		} );
		// Copy cssjanus.js
		copyFile( 'src/cssjanus.js', to + 'lib/cssjanus.js' );
	} );
};
