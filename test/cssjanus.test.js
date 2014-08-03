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
	cssjanus = require( '../lib/cssjanus' );

/**
 * Flips a stylesheet.
 *
 * @function
 * @param {String} code Stylesheet to flip
 * @param {Boolean} swapLtrRtlInUrl Swap "ltr" and "rtl" in CSS URLs
 * @param {Boolean} swapLeftRightInUrl Swap "left" and "right" in CSS URLs
 * @returns {String} Flipped stylesheet
 */
function flip( code, swapLtrRtlInUrl, swapLeftRightInUrl ) {
	return cssjanus.transform( code, swapLtrRtlInUrl, swapLeftRightInUrl );
}

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

/* Tests */

var tests = {
	'preserves comments': function() {
		assert.equal(
			flip( '/* left /* right */right: 10px' ),
			'/* left /* right */left: 10px'
		);
		assert.equal(
			flip( '/*left*//*left*/right: 10px' ),
			'/*left*//*left*/left: 10px'
		);
		assert.equal(
			flip( '/* Going right is cool */\n#test {right: 10px}' ),
			'/* Going right is cool */\n#test {left: 10px}'
		);
		assert.equal(
			flip( '/* padding-right 1 2 3 4 */\n#test {right: 10px}\n/*right*/' ),
			'/* padding-right 1 2 3 4 */\n#test {left: 10px}\n/*right*/'
		);
		assert.equal(
			flip( '/** Two line comment\n * left\n \\*/\n#test {right: 10px}' ),
			'/** Two line comment\n * left\n \\*/\n#test {left: 10px}'
		);
	},
	'flips absolute or relative position values': function() {
		assert.equal(
			flip( 'right: 10px' ),
			'left: 10px'
		);
	},
	'flips four value notation': function() {
		assert.equal(
			flip( 'padding: .25em 0ex 0pt 15px' ),
			'padding: .25em 15px 0pt 0ex'
		);
		assert.equal(
			flip( 'margin: 1px 2px 3px -4px' ),
			'margin: 1px -4px 3px 2px'
		);
		assert.equal(
			flip( 'padding:0 0 .25em 15px' ),
			'padding:0 15px .25em 0'
		);
		assert.equal(
			flip( 'padding: 1px 2% 3px 4.1grad' ),
			'padding: 1px 4.1grad 3px 2%'
		);
		assert.equal(
			flip( 'padding: 1px auto 3px 2px' ),
			'padding: 1px 2px 3px auto'
		);
		assert.equal(
			flip( 'padding: 1px auto 3px inherit !important' ),
			'padding: 1px inherit 3px auto !important'
		);
		// not really four notation
		assert.equal(
			flip( '#settings td p strong' ),
			'#settings td p strong'
		);
	},
	'flips three value notation': function() {
		assert.equal(
			flip( 'margin: 1em 0 .25em' ),
			'margin: 1em 0 .25em'
		);
		assert.equal(
			flip( 'margin:-1.5em 0 -.75em' ),
			'margin:-1.5em 0 -.75em'
		);
	},
	'flips two value notation': function() {
		assert.equal(
			flip( 'padding: 1px 2px' ),
			'padding: 1px 2px'
		);
	},
	'flips one value notation': function() {
		assert.equal(
			flip( 'padding: 1px' ),
			'padding: 1px'
		);
	},
	'flips direction': function() {
		assert.equal(
			flip( 'direction: ltr' ),
			'direction: rtl'
		);
		assert.equal(
			flip( 'direction: rtl' ),
			'direction: ltr'
		);
		assert.equal(
			flip( 'body { direction: rtl }' ),
			'body { direction: ltr }'
		);
		assert.equal(
			flip( 'body { padding: 10px; direction: rtl; }' ),
			'body { padding: 10px; direction: ltr; }'
		);
		assert.equal(
			flip( 'body { direction: rtl } .myClass { direction: ltr }' ),
			'body { direction: ltr } .myClass { direction: rtl }'
		);
		assert.equal(
			flip( 'body{\n direction: rtl\n}' ),
			'body{\n direction: ltr\n}'
		);
	},
	'flips rules with more than one hyphen': function() {
		assert.equal(
			flip( 'border-right-color: red' ),
			'border-left-color: red'
		);
		assert.equal(
			flip( 'border-left-color: red' ),
			'border-right-color: red'
		);
	},
	// This is for compatibility strength, in reality CSS has no properties that are
	// currently like this.
	'leaves unknown property names alone': function() {
		assert.equal(
			flip( 'alright: 10px' ),
			'alright: 10px'
		);
		assert.equal(
			flip( 'alleft: 10px' ),
			'alleft: 10px'
		);
	},
	'flips floats': function() {
		assert.equal(
			flip( 'float: left' ),
			'float: right'
		);
		assert.equal(
			flip( 'float: right' ),
			'float: left'
		);
	},
	'does not flip URLs when flags are off': function() {
		assert.equal(
			flip( 'background: url(/foo/bar-left.png)', false, false ),
			'background: url(/foo/bar-left.png)'
		);
		assert.equal(
			flip( 'background: url(/foo/left-bar.png)', false, false ),
			'background: url(/foo/left-bar.png)'
		);
		assert.equal(
			flip( 'url("http://www.blogger.com/img/triangle_ltr.gif")', false, false ),
			'url("http://www.blogger.com/img/triangle_ltr.gif")'
		);
		assert.equal(
			flip( "url('http://www.blogger.com/img/triangle_ltr.gif')", false, false ),
			"url('http://www.blogger.com/img/triangle_ltr.gif')"
		);
		assert.equal(
			flip( "url('http://www.blogger.com/img/triangle_ltr.gif'  )", false, false ),
			"url('http://www.blogger.com/img/triangle_ltr.gif'  )"
		);
		assert.equal(
			flip( 'background: url(/foo/bar.left.png)', false, false ),
			'background: url(/foo/bar.left.png)'
		);
		assert.equal(
			flip( 'background: url(/foo/bar-rtl.png)', false, false ),
			'background: url(/foo/bar-rtl.png)'
		);
		assert.equal(
			flip( 'background: url(/foo/bar-rtl.png); right: 10px', false, false ),
			'background: url(/foo/bar-rtl.png); left: 10px'
		);
		assert.equal(
			flip( 'background: url(/foo/bar-right.png); direction: ltr', false, false ),
			'background: url(/foo/bar-right.png); direction: rtl'
		);
		assert.equal(
			flip( 'background: url(/foo/bar-rtl_right.png);right:10px; direction: ltr', false, false ),
			'background: url(/foo/bar-rtl_right.png);left:10px; direction: rtl'
		);
	},
	'flips URLs when flags are on': function() {
		assert.equal(
			flip( 'background: url(/foo/bar-right.png)', true, true ),
			'background: url(/foo/bar-left.png)'
		);
		assert.equal(
			flip( 'background: url(/foo/right-bar.png)', true, true ),
			'background: url(/foo/left-bar.png)'
		);
		assert.equal(
			flip( 'url("http://www.blogger.com/img/triangle_rtl.gif")', true, true ),
			'url("http://www.blogger.com/img/triangle_ltr.gif")'
		);
		assert.equal(
			flip( "url('http://www.blogger.com/img/triangle_rtl.gif')", true, true ),
			"url('http://www.blogger.com/img/triangle_ltr.gif')"
		);
		assert.equal(
			flip( "url('http://www.blogger.com/img/triangle_rtl.gif'	)", true, true ),
			"url('http://www.blogger.com/img/triangle_ltr.gif'	)"
		);
		assert.equal(
			flip( 'background: url(/foo/bar.right.png)', true, true ),
			'background: url(/foo/bar.left.png)'
		);
		assert.equal(
			flip( 'background: url(/foo/bright.png)', true, true ),
			'background: url(/foo/bright.png)'
		);
		assert.equal(
			flip( 'background: url(/foo/bar-ltr.png)', true, true ),
			'background: url(/foo/bar-rtl.png)'
		);
		assert.equal(
			flip( 'background: url(/foo/bar-ltr.png); right: 10px', true, true ),
			'background: url(/foo/bar-rtl.png); left: 10px'
		);
		assert.equal(
			flip( 'background: url(/foo/bar-left.png); direction: ltr', true, true ),
			'background: url(/foo/bar-right.png); direction: rtl'
		);
		assert.equal(
			flip( 'background: url(/foo/bar-ltr_left.png);right:10px; direction: ltr', true, true ),
			'background: url(/foo/bar-rtl_right.png);left:10px; direction: rtl'
		);
	},
	'flips padding': function() {
		assert.equal(
			flip( 'padding-left: bar' ),
			'padding-right: bar'
		);
		assert.equal(
			flip( 'padding-right: bar' ),
			'padding-left: bar'
		);
	},
	'flips margins': function() {
		assert.equal(
			flip( 'margin-right: bar' ),
			'margin-left: bar'
		);
		assert.equal(
			flip( 'margin-left: bar' ),
			'margin-right: bar'
		);
	},
	'flips borders': function() {
		assert.equal(
			flip( 'border-right: bar' ),
			'border-left: bar'
		);
		assert.equal(
			flip( 'border-left: bar' ),
			'border-right: bar'
		);
	},
	'flips cursors': function() {
		assert.equal(
			flip( 'cursor: w-resize' ),
			'cursor: e-resize'
		);
		assert.equal(
			flip( 'cursor: e-resize' ),
			'cursor: w-resize'
		);
		assert.equal(
			flip( 'cursor: sw-resize' ),
			'cursor: se-resize'
		);
		assert.equal(
			flip( 'cursor: se-resize' ),
			'cursor: sw-resize'
		);
		assert.equal(
			flip( 'cursor: nw-resize' ),
			'cursor: ne-resize'
		);
		assert.equal(
			flip( 'cursor: ne-resize' ),
			'cursor: nw-resize'
		);
	},
	'flips keyword background positions': function() {
		assert.equal(
			flip( 'background: url(/foo/bar.png) right top' ),
			'background: url(/foo/bar.png) left top'
		);
		assert.equal(
			flip( 'background: url(/foo/bar.png) left top' ),
			'background: url(/foo/bar.png) right top'
		);
		assert.equal(
			flip( 'background-position: right top' ),
			'background-position: left top'
		);
		assert.equal(
			flip( 'background-position: left top' ),
			'background-position: right top'
		);
		assert.equal(
			flip( 'background-position: left -5' ),
			'background-position: right -5'
		);
		assert.equal(
			flip( 'background-position: left 5' ),
			'background-position: right 5'
		);
	},
	'flips percentage background positions': function() {
		assert.equal(
			flip( 'background-position: 0% 40%' ),
			'background-position: 100% 40%'
		);
		assert.equal(
			flip( 'background-position: 100% 40%' ),
			'background-position: 0% 40%'
		);
		assert.equal(
			flip( 'background-position: 77% 0' ),
			'background-position: 23% 0'
		);
		assert.equal(
			flip( 'background-position: 77% auto' ),
			'background-position: 23% auto'
		);
		assert.equal(
			flip( 'background-position-x: 77%' ),
			'background-position-x: 23%'
		);
		assert.equal(
			flip( 'background-position-y: 23%' ),
			'background-position-y: 23%'
		);
		assert.equal(
			flip( 'background:url(../foo-bar_baz.2008.gif) no-repeat 25% 50%' ),
			'background:url(../foo-bar_baz.2008.gif) no-repeat 75% 50%'
		);
		assert.equal(
			flip( '.test { background: 90% 20% } .test2 { background: 60% 30% }' ),
			'.test { background: 10% 20% } .test2 { background: 40% 30% }'
		);
		assert.equal(
			flip( '.test { background: 100% 20% } .test2 { background: 60% 30% }' ),
			'.test { background: 0% 20% } .test2 { background: 40% 30% }'
		);
		assert.equal(
			flip( '.foo { background: 90% 20% } .bar { background: 60% 30% }' ),
			'.foo { background: 10% 20% } .bar { background: 40% 30% }'
		);
		assert.equal(
			flip( '.foo { background: 100% 20% } .bar { background: 60% 30% }' ),
			'.foo { background: 0% 20% } .bar { background: 40% 30% }'
		);
		// Test that it doesn't modify other styles
		assert.equal(
			flip( '.foo { background: #777 } .bar{ margin: 0 5% 4% 0 }' ),
			'.foo { background: #777 } .bar{ margin: 0 0 4% 5% }'
		);
		assert.equal(
			flip( '.foo { background: #777; margin: 0 5% 4% 0 }' ),
			'.foo { background: #777; margin: 0 0 4% 5% }'
		);
	},
	'leaves class names alone': function() {
		// Makes sure we don't unnecessarily destroy classnames with tokens in them.
		// Despite the fact that that is a bad classname in CSS, we don't want to
		// break anybody.
		assert.equal(
			flip( '.column-left { float: right }' ),
			'.column-left { float: left }'
		);
		assert.equal(
			flip( '#bright-light { float: right }' ),
			'#bright-light { float: left }'
		);
		assert.equal(
			flip( 'a.left:hover { float: right }' ),
			'a.left:hover { float: left }'
		);
		// Tests newlines
		assert.equal(
			flip( '#bright-left,\n.test-me { float: right }' ),
			'#bright-left,\n.test-me { float: left }'
		);
		// Tests newlines
		assert.equal(
			flip( '#bright-left, .test-me { float: right }' ),
			'#bright-left, .test-me { float: left }'
		);
		// Tests multiple names and commas
		assert.equal(
			flip( 'div.leftpill, div.leftpillon {margin-left: 0 !important}' ),
			'div.leftpill, div.leftpillon {margin-right: 0 !important}'
		);
		assert.equal(
			flip( 'div.left > span.right+span.left { float: right }' ),
			'div.left > span.right+span.left { float: left }'
		);
		assert.equal(
			flip( '.thisclass .left .myclass {background:#fff;}' ),
			'.thisclass .left .myclass {background:#fff;}'
		);
		assert.equal(
			flip( '.thisclass .left .myclass #myid {background:#fff;}' ),
			'.thisclass .left .myclass #myid {background:#fff;}'
		);
	},
	'works on multiple rules': function() {
		assert.equal(
			flip( 'body{direction:ltr;float:left}.b2{direction:ltr;float:left}' ),
			'body{direction:rtl;float:right}.b2{direction:rtl;float:right}'
		);
	},
	'does not flip rules or properties with @noflip comments': function() {
		// Tests the /* @noflip */ annotation on classnames
		assert.equal(
			flip( '/* @noflip */ div { float: left; }' ),
			'/* @noflip */ div { float: left; }'
		);
		assert.equal(
			flip( '/* @noflip */ div, .notme { float: left; }' ),
			'/* @noflip */ div, .notme { float: left; }'
		);
		assert.equal(
			flip( '/* @noflip */ div { float: left; } div { float: right; }' ),
			'/* @noflip */ div { float: left; } div { float: left; }'
		);
		assert.equal(
			flip( '/* @noflip */\ndiv { float: left; }\ndiv { float: right; }' ),
			'/* @noflip */\ndiv { float: left; }\ndiv { float: left; }'
		);
		// Test @noflip on single rules within classes
		assert.equal(
			flip( 'div { float: right; /* @noflip */ float: left; }' ),
			'div { float: left; /* @noflip */ float: left; }'
		);
		assert.equal(
			flip( 'div\n{ float: right;\n/* @noflip */\n float: left;\n }' ),
			'div\n{ float: left;\n/* @noflip */\n float: left;\n }'
		);
		assert.equal(
			flip( 'div\n{ float: right;\n/* @noflip */\n text-align: left\n }' ),
			'div\n{ float: left;\n/* @noflip */\n text-align: left\n }'
		);
		assert.equal(
			flip( 'div\n{ /* @noflip */\ntext-align: left;\nfloat: right\n	}' ),
			'div\n{ /* @noflip */\ntext-align: left;\nfloat: left\n	}'
		);
		assert.equal(
			flip( '/* @noflip */div{float:left;text-align:left;}div{float:right}' ),
			'/* @noflip */div{float:left;text-align:left;}div{float:left}'
		);
		assert.equal(
			flip( '/* @noflip */', 'div{float:left;text-align:left;}a{foo:right}' ),
			'/* @noflip */','div{float:left;text-align:left;}a{foo:left}'
		);
	},
	'flips border radius notation': function() {
		assert.equal(
			flip( 'border-radius: 15px .25em 0ex 0pt' ),
			'border-radius: .25em 15px 0pt 0ex'
		);
		assert.equal(
			flip( 'border-radius: 15px 10px 15px 0px' ),
			'border-radius: 10px 15px 0px 15px'
		);
		assert.equal(
			flip( 'border-radius: 8px 7px' ),
			'border-radius: 7px 8px'
		);
		assert.equal(
			flip( 'border-radius: 5px' ),
			'border-radius: 5px'
		);
		assert.equal(
			flip( 'border-radius: 5px 9px 7px' ),
			'border-radius: 9px 5px 9px 7px'
		);
		// Test horizontal / vertical radius rules
		assert.equal(
			flip( 'border-radius: 15px / 0 20px' ),
			'border-radius: 15px / 20px 0'
		);
		assert.equal(
			flip( 'border-radius: 15px 40px / 20px 15px' ),
			'border-radius: 40px 15px / 15px 20px'
		);
		assert.equal(
			flip( 'border-radius: 5px 9px 7px / 3px 4px' ),
			'border-radius: 9px 5px 9px 7px / 4px 3px'
		);
		assert.equal(
			flip( 'border-radius: 10px / 20px' ),
			'border-radius: 10px / 20px'
		);
		// Test correct position of !important after flip
		assert.equal(
			flip( 'div { border-radius: 0 !important }' ),
			'div { border-radius: 0 !important }'
		);
		assert.equal(
			flip( 'div { border-radius: 8px 7px !important }' ),
			'div { border-radius: 7px 8px !important }'
		);
	},
	'flips gradient notation': function() {
		assert.equal(
			flip( 'background-image: -moz-linear-gradient(#326cc1, #234e8c)' ),
			'background-image: -moz-linear-gradient(#326cc1, #234e8c)'
		);
		assert.equal(
			flip( 'background-image: -webkit-gradient(linear, 100% 0%, 0% 0%, from(#666666), to(#ffffff))' ),
			'background-image: -webkit-gradient(linear, 100% 0%, 0% 0%, from(#666666), to(#ffffff))'
		);
	}
};

console.log( 'Testing CSSJanus...' );
var failures = 0;
for ( var msg in tests ) {
	try {
		tests[msg]();
		console.log( applyStyle( '  ✓ ' + msg, 'ok' ) );
	} catch ( e ) {
		console.log( applyStyle('  ✗ ' + msg, 'error' ) );
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
