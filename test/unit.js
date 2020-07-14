var assert = require( 'assert' ),
	cssjanus = require( '../src/cssjanus' ),
	testData = require( './data.json' ),
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
		console.log( '... ' + name );
	} catch ( e ) {
		console.error( name );
		console.error( e.stack );
		failures++;
	}
}

if ( failures === 1 ) {
	console.error( failures + ' test failed.' );
	process.exit( 1 );
}
if ( failures > 1 ) {
	console.error( failures + ' tests failed.' );
	process.exit( 1 );
}
console.log( tests + ' tests passed.' );
