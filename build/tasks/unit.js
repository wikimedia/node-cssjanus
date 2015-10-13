module.exports = function ( grunt ) {
	grunt.registerTask( 'unit', function () {
		var assert = require( 'assert' ),
			cssjanus = require( '../../src/cssjanus' ),
			testData = require( '../../test/data.json' ),
			failures = 0,
			tests = 0,
			name, test, settings, i, input, noop, output, tblrOutput, tbrlOutput;

		for ( name in testData ) {
			tests++;
			test = testData[ name ];
			settings = test.settings || {};

			try {
				for ( i = 0; i < test.cases.length; i++ ) {
					input = test.cases[ i ][ 0 ];
					noop = test.cases[ i ][ 1 ] === undefined;
					output = noop ? input : test.cases[ i ][ 1 ];
					tblrOutput = test.cases[ 2 ] === undefined ? input : test.cases[ 2 ];
					tbrlOutput = test.cases[ 3 ] === undefined ? tblrOutput : test.cases[ 3 ];

					assert.equal(
						cssjanus.transform(
							input,
							settings.swapLtrRtlInUrl,
							settings.swapLeftRightInUrl
						),
						output
					);

					if ( !noop ) {
						// Round-trip right-to-left
						assert.equal(
							cssjanus.transform(
								output,
								settings.swapLtrRtlInUrl,
								settings.swapLeftRightInUrl
							),
							input
						);

						// Keep test data clean
						assert(
							test.cases[ i ][ 1 ] !== input,
							'case #' + ( i + 1 ) + ' should not specify output if it matches the input'
						);
						output = test.cases[ i ][ 1 ];
					}

					assert.equal(
						cssjanus.transform(
							input,
							settings.swapLtrRtlInUrl,
							settings.swapLeftRightInUrl,
							'lr-tb',
							'tb-lr'
						),
						tblrOutput
					);

					assert.equal(
						cssjanus.transform(
							input,
							settings.swapLtrRtlInUrl,
							settings.swapLeftRightInUrl,
							'lr-tb',
							'tb-rl'
						),
						tbrlOutput
					);
				}
				grunt.verbose.write( name + '...' );
				grunt.verbose.ok();
			} catch ( e ) {
				grunt.log.error( name );
				// grunt.log has a markup formatter that strips star ("*") and underscore ("_")
				// characters in favour of console escape sequences for bold and underline
				// formatting. Use console instead to avoid mangling strings like "/* @noflip */"
				// and "[attr*=value]" in AssertionError messages.
				console.log( e.stack );
				failures++;
			}
		}

		if ( failures === 1 ) {
			grunt.log.error( failures + ' test failed.' );
			return false;
		}
		if ( failures > 1 ) {
			grunt.log.error( failures + ' tests failed.' );
			return false;
		}
		grunt.log.ok( tests + ' tests passed.' );
	} );
};
