/* eslint-disable no-console */

module.exports = function ( grunt ) {
	grunt.registerTask( 'unit', function () {
		var assert = require( 'assert' ),
			cssjanus = require( '../../src/cssjanus' ),
			testData = require( '../../test/data.json' ),
			failures = 0,
			tests = 0,
			name, test, args, i, input, noop, roundtrip, output;

		for ( name in testData ) {
			tests++;
			test = testData[ name ];
			args = test.args || [ test.options || {} ];

			try {
				for ( i = 0; i < test.cases.length; i++ ) {
					input = test.cases[ i ][ 0 ];
					noop = test.cases[ i ][ 1 ] === undefined;
					output = noop ? input : test.cases[ i ][ 1 ];
					roundtrip = test.roundtrip !== undefined ? test.roundtrip : !noop;

					assert.equal(
						cssjanus.transform(
							input,
							args[ 0 ],
							args[ 1 ]
						),
						output
					);

					if ( roundtrip ) {
						// Round-trip
						assert.equal(
							cssjanus.transform(
								output,
								args[ 0 ],
								args[ 1 ]
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
