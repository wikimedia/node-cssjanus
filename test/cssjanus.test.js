/**
 * Copyright 2008 Google Inc. All Rights Reserved.
 *
 * Tests converting Cascading Style Sheets from LTR to RTL.
 * This is a series of CSS test cases for cssjanus.py
 *
 * @author "Trevor Parscal" <trevorparscal@gmail.com>
 * @author "Lindsey Simon" <elsigh@google.com>
 */
var assert = require( 'assert' ),
	cssjanus = require( '../lib/cssjanus' ),
	tests = require( './data.json' );

var styles = {
    ok: [32, 39],
    error: [31, 39]
};

/**
 * Gets a version of a string with console styling applied, if supported.
 *
 * @function
 * @param {String} text Text to color
 * @param {String} style Symbolic name of style to apply
 * @returns {String} Styled text
 */
function applyStyle( text, style ) {
    if ( !module.exports.nocolor && style in styles ) {
		text = '\033[' + styles[style][0] + 'm' + text + '\033[' + styles[style][1] + 'm';
    }
    return text;
}

console.log( 'Testing CSSJanus...' );

var failures = 0;
var name, test, settings, i, input, output;

for ( name in tests ) {
	test = tests[name];
	settings = test.settings || {};

	try {
		for ( i = 0; i < test.cases.length; i++ ) {
			input = test.cases[i][0];

			if ( test.cases[i][1] === undefined ) {
				output = input;
			} else {
				assert(
					test.cases[i][1] !== input,
					'case #' + ( i + 1 ) + ' should not specify output if it matches the input'
				);
				output = test.cases[i][1];
			}

			assert.equal(
				cssjanus.transform(
					input,
					settings.swapLtrRtlInUrl,
					settings.swapLeftRightInUrl
				),
				output
			);
		}

		console.log( applyStyle( '  ✓ ' + name, 'ok' ) );
	} catch ( e ) {
		console.log( applyStyle( '  ✗ ' + name, 'error' ) );
		console.log( e.stack );
		failures++;
	}
}

if ( failures === 1 ) {
	console.log( applyStyle( '1 test failed', 'error' ) );
	process.exit( 1 );
} else if ( failures > 1 ) {
	console.log( applyStyle( failures + ' tests failed', 'error' ) );
	process.exit( 1 );
} else {
	console.log( applyStyle( 'All tests passed', 'ok' ) );
}
