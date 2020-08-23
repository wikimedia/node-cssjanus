'use strict';

const QUnit = require( 'qunit' );
const cssjanus = require( '../src/cssjanus' );

const testData = require( './data.json' );

for ( const name in testData ) {
	const data = testData[ name ];
	const args = data.args || [ data.options || {} ];

	QUnit.test( name, ( assert ) => {
		for ( let i = 0; i < data.cases.length; i++ ) {
			const input = data.cases[ i ][ 0 ];
			const noop = data.cases[ i ][ 1 ] === undefined;
			const output = noop ? input : data.cases[ i ][ 1 ];
			const roundtrip = data.roundtrip !== undefined ? data.roundtrip : !noop;

			assert.equal(
				cssjanus.transform(
					input,
					args[ 0 ],
					args[ 1 ]
				),
				output,
				`case #${i + 1}`
			);

			if ( roundtrip ) {
				// Round-trip
				assert.equal(
					cssjanus.transform(
						output,
						args[ 0 ],
						args[ 1 ]
					),
					input,
					`case #${i + 1} roundtrip`
				);

				// Keep test data clean
				assert.true(
					data.cases[ i ][ 1 ] !== input,
					`case #${i + 1} should not specify output if it matches the input`
				);
			}
		}
	} );
}
