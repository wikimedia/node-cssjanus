/*!
 * Converts CSS stylesheets between left-to-right and right-to-left.
 * https://github.com/cssjanus/cssjanus
 *
 * Copyright 2008 Google Inc.
 * Copyright 2010 Trevor Parscal
 */

var cssjanus;

/**
 * Create a tokenizer object.
 *
 * This utility class is used by CSSJanus to protect strings by replacing them temporarily with
 * tokens and later transforming them back.
 *
 * @author Trevor Parscal
 * @author Roan Kattouw
 *
 * @class
 * @constructor
 * @param {RegExp} regex Regular expression whose matches to replace by a token
 * @param {string} token Placeholder text
 */
function Tokenizer( regex, token ) {

	var matches = [],
		index = 0;

	/**
	 * Add a match.
	 *
	 * @private
	 * @param {string} match Matched string
	 * @return {string} Token to leave in the matched string's place
	 */
	function tokenizeCallback( match ) {
		matches.push( match );
		return token;
	}

	/**
	 * Get a match.
	 *
	 * @private
	 * @return {string} Original matched string to restore
	 */
	function detokenizeCallback() {
		return matches[ index++ ];
	}

	return {
		/**
		 * Replace matching strings with tokens.
		 *
		 * @param {string} str String to tokenize
		 * @return {string} Tokenized string
		 */
		tokenize: function ( str ) {
			return str.replace( regex, tokenizeCallback );
		},

		/**
		 * Restores tokens to their original values.
		 *
		 * @param {string} str String previously run through tokenize()
		 * @return {string} Original string
		 */
		detokenize: function ( str ) {
			return str.replace( new RegExp( '(' + token + ')', 'g' ), detokenizeCallback );
		}
	};
}

/**
 * Create a CSSJanus object.
 *
 * CSSJanus transforms CSS rules with horizontal relevance so that a left-to-right stylesheet can
 * become a right-to-left stylesheet automatically. Processing can be bypassed for an entire rule
 * or a single property by adding a / * @noflip * / comment above the rule or property.
 *
 * @author Trevor Parscal <trevorparscal@gmail.com>
 * @author Roan Kattouw <roankattouw@gmail.com>
 * @author Lindsey Simon <elsigh@google.com>
 * @author Roozbeh Pournader <roozbeh@gmail.com>
 * @author Bryon Engelhardt <ebryon77@gmail.com>
 *
 * @class
 * @constructor
 */
function CSSJanus() {

	var
		// Tokens
		noFlipSingleToken = '`NOFLIP_SINGLE`',
		noFlipClassToken = '`NOFLIP_CLASS`',
		commentToken = '`COMMENT`',
		// Patterns
		nonAsciiPattern = '[^\\u0020-\\u007e]',
		unicodePattern = '(?:(?:\\[0-9a-f]{1,6})(?:\\r\\n|\\s)?)',
		numPattern = '(?:[0-9]*\\.[0-9]+|[0-9]+)',
		unitPattern = '(?:em|ex|px|cm|mm|in|pt|pc|deg|rad|grad|ms|s|hz|khz|%)',
		// Whitespace
		_ = '(?:\\s|' + commentToken + ')*',
		ws = '(?:\\s|' + commentToken + ')+',
		sws = '(' + ws + ')',
		colon = _ + ':' + _,
		slash = _ + '/' + _,
		comma = _ + ',' + _,
		directionPattern = 'direction' + colon,
		urlSpecialCharsPattern = '[!#$%&*-~]',
		validAfterUriCharsPattern = '[\'"]?\\s*',
		nonLetterPattern = '(^|[^a-zA-Z])',
		charsWithinSelectorPattern = '[^\\}]*?',
		noFlipPattern = '\\/\\*\\!?\\s*@noflip\\s*\\*\\/',
		commentPattern = '\\/\\*[^*]*\\*+([^\\/*][^*]*\\*+)*\\/',
		escapePattern = '(?:' + unicodePattern + '|\\\\[^\\r\\n\\f0-9a-f])',
		nmstartPattern = '(?:[_a-z]|' + nonAsciiPattern + '|' + escapePattern + ')',
		nmcharPattern = '(?:[_a-z0-9-]|' + nonAsciiPattern + '|' + escapePattern + ')',
		identPattern = '-?' + nmstartPattern + nmcharPattern + '*',
		quantPattern = numPattern + '(?:\\s*' + unitPattern + '|' + identPattern + ')?',
		signedQuantPattern = '((?:-?' + quantPattern + ')|(?:inherit|auto))',
		fourNotationQuantPropsPattern = '((?:margin|padding|border-width)' + colon + ')',
		fourNotationColorPropsPattern = '((?:-color|border-style)' + colon + ')',
		colorPattern = '(#?' + nmcharPattern + '+|(?:rgba?|hsla?)\\([ \\d.,%-]+\\))',
		urlCharsPattern = '(?:' + urlSpecialCharsPattern + '|' + nonAsciiPattern + '|' + escapePattern + ')*',
		sidesPattern = 'right|left',
		lookAheadNotLetterPattern = '(?![a-zA-Z])',
		lookAheadNotOpenBracePattern = '(?!(' + nmcharPattern + '|\\r?\\n|\\s|#|\\:|\\.|\\,|\\+|>|\\(|\\)|\\[|\\]|=|\\*=|~=|\\^=|\'[^\']*\'])*?{)',
		lookAheadNotClosingParenPattern = '(?!' + urlCharsPattern + '?' + validAfterUriCharsPattern + '\\))',
		lookAheadForClosingParenPattern = '(?=' + urlCharsPattern + '?' + validAfterUriCharsPattern + '\\))',
		suffixPattern = '(' + _ + '(?:!important' + _ + ')?[;}])',
		// Regular expressions
		commentRegExp = new RegExp( commentPattern, 'gi' ),
		noFlipSingleRegExp = new RegExp( '(' + noFlipPattern + lookAheadNotOpenBracePattern + '[^;}]+;?)', 'gi' ),
		noFlipClassRegExp = new RegExp( '(' + noFlipPattern + charsWithinSelectorPattern + '})', 'gi' ),
		fourNotationQuantRegExp = new RegExp( fourNotationQuantPropsPattern + signedQuantPattern + sws + signedQuantPattern + sws + signedQuantPattern + sws + signedQuantPattern + suffixPattern, 'gi' ),
		fourNotationColorRegExp = new RegExp( fourNotationColorPropsPattern + colorPattern + sws + colorPattern + sws + colorPattern + sws + colorPattern + suffixPattern, 'gi' ),
		bgHorizontalPercentageRegExp = new RegExp( '(background(?:-position)?' + colon + '(?:[^:;}\\s]+\\s+)*?)(' + quantPattern + ')', 'gi' ),
		bgHorizontalPercentageXRegExp = new RegExp( '(background-position-x' + colon + ')(-?' + numPattern + '%)', 'gi' ),
		directionRegExp = new RegExp( '(' + directionPattern + ')(ltr|rtl)' + lookAheadNotLetterPattern, 'gi' ),
		sidesRegExp = new RegExp( nonLetterPattern +
			'(' + sidesPattern + ')' +
			lookAheadNotLetterPattern + lookAheadNotClosingParenPattern + lookAheadNotOpenBracePattern, 'gi' ),
		edgeInUrlRegExp = new RegExp( nonLetterPattern + '(' + sidesPattern + ')' + lookAheadNotLetterPattern + lookAheadForClosingParenPattern, 'gi' ),
		dirInUrlRegExp = new RegExp( nonLetterPattern + '(ltr|rtl)' + lookAheadNotLetterPattern + lookAheadForClosingParenPattern, 'gi' ),
		cursorRegExp = new RegExp( '(cursor' + colon + ')(?:([ns])?([ew])?(s[ew])?-resize)', 'gi' ),
		// border-radius: <length or percentage>{1,4} [optional: / <length or percentage>{1,4} ]
		borderRadiusRegExp = new RegExp( '(border-radius' + colon + ')' + signedQuantPattern + '(?:(?:' + ws + signedQuantPattern + ')(?:' + ws + signedQuantPattern + ')?(?:' + ws + signedQuantPattern + ')?)?' +
			'(?:(?:(?:' + slash + ')' + signedQuantPattern + ')(?:' + ws + signedQuantPattern + ')?(?:' + ws + signedQuantPattern + ')?(?:' + ws + signedQuantPattern + ')?)?' + suffixPattern, 'gi' ),
		boxShadowRegExp = new RegExp( '(box-shadow' + colon + '(?:inset\\s*)?)' + signedQuantPattern, 'gi' ),
		textShadow1RegExp = new RegExp( '(text-shadow' + colon + ')' + signedQuantPattern + '(\\s*)' + colorPattern, 'gi' ),
		textShadow2RegExp = new RegExp( '(text-shadow' + colon + ')' + colorPattern + '(\\s*)' + signedQuantPattern, 'gi' ),
		textShadow3RegExp = new RegExp( '(text-shadow' + colon + ')' + signedQuantPattern, 'gi' ),
		translateXRegExp = new RegExp( '(transform' + _ + ':[^;]*)(translateX\\s*\\(\\s*)' + signedQuantPattern + '(\\s*\\))', 'gi' ),
		translateRegExp = new RegExp( '(transform' + _ + ':[^;]*)(translate\\s*\\(\\s*)' + signedQuantPattern + '((?:' + comma + signedQuantPattern + '){0,2}\\s*\\))', 'gi' );

	/**
	 * Invert the horizontal value of a background position property.
	 *
	 * @private
	 * @param {string} match Matched property
	 * @param {string} pre Text before value
	 * @param {string} value Horizontal value
	 * @return {string} Inverted property
	 */
	function calculateNewBackgroundPosition( match, pre, value ) {
		var idx, len;
		if ( value.slice( -1 ) === '%' ) {
			idx = value.indexOf( '.' );
			if ( idx !== -1 ) {
				// Two off, one for the "%" at the end, one for the dot itself
				len = value.length - idx - 2;
				value = 100 - parseFloat( value );
				value = value.toFixed( len ) + '%';
			} else {
				value = 100 - parseFloat( value ) + '%';
			}
		}
		return pre + value;
	}

	/**
	 * Invert a set of border radius values.
	 *
	 * @private
	 * @param {Array} values Matched values
	 * @return {string} Inverted values
	 */
	function flipBorderRadiusValues( values ) {
		switch ( values.length ) {
			case 4:
				values = [ values[ 1 ], values[ 0 ], values[ 3 ], values[ 2 ] ];
				break;
			case 3:
				values = [ values[ 1 ], values[ 0 ], values[ 1 ], values[ 2 ] ];
				break;
			case 2:
				values = [ values[ 1 ], values[ 0 ] ];
				break;
			case 1:
				values = [ values[ 0 ] ];
				break;
		}

		return values.join( ' ' );
	}

	/**
	 * Invert a set of border radius values.
	 *
	 * @private
	 * @param {string} match Matched property
	 * @param {string} pre Text before value
	 * @param {string} [firstGroup1]
	 * @param {string} [firstGroup2]
	 * @param {string} [firstGroup3]
	 * @param {string} [firstGroup4]
	 * @param {string} [secondGroup1]
	 * @param {string} [secondGroup2]
	 * @param {string} [secondGroup3]
	 * @param {string} [secondGroup4]
	 * @param {string} [post] Text after value
	 * @return {string} Inverted property
	 */
	function calculateNewBorderRadius( match, pre ) {
		var values,
			args = [].slice.call( arguments ),
			firstGroup = args.slice( 2, 6 ).filter( function ( val ) { return val; } ),
			secondGroup = args.slice( 6, 10 ).filter( function ( val ) { return val; } ),
			post = args[ 10 ] || '';

		if ( secondGroup.length ) {
			values = flipBorderRadiusValues( firstGroup ) + ' / ' + flipBorderRadiusValues( secondGroup );
		} else {
			values = flipBorderRadiusValues( firstGroup );
		}

		return pre + values + post;
	}

	/**
	 * Flip the sign of a CSS value, possibly with a unit.
	 *
	 * We can't just negate the value with unary minus due to the units.
	 *
	 * @private
	 * @param {string} value
	 * @return {string}
	 */
	function flipSign( value ) {
		if ( parseFloat( value ) === 0 ) {
			// Don't mangle zeroes
			return value;
		}

		if ( value[ 0 ] === '-' ) {
			return value.slice( 1 );
		}

		return '-' + value;
	}

	/**
	 * @private
	 * @param {string} match
	 * @param {string} property
	 * @param {string} offset
	 * @return {string}
	 */
	function calculateNewShadow( match, property, offset ) {
		return property + flipSign( offset );
	}

	/**
	 * @private
	 * @param {string} match
	 * @param {string} property
	 * @param {string} prefix
	 * @param {string} offset
	 * @param {string} suffix
	 * @return {string}
	 */
	function calculateNewTranslate( match, property, prefix, offset, suffix ) {
		return property + prefix + flipSign( offset ) + suffix;
	}

	/**
	 * @private
	 * @param {string} match
	 * @param {string} property
	 * @param {string} color
	 * @param {string} space
	 * @param {string} offset
	 * @return {string}
	 */
	function calculateNewFourTextShadow( match, property, color, space, offset ) {
		return property + color + space + flipSign( offset );
	}

	return {
		/**
		 * Transform a left-to-right stylesheet to right-to-left.
		 *
		 * @param {string} css Stylesheet to transform
		 * @param {Object} options Options
		 * @param {boolean} [options.transformDirInUrl=false] Transform directions in URLs (e.g. 'ltr', 'rtl')
		 * @param {boolean} [options.transformEdgeInUrl=false] Transform edges in URLs (e.g. 'left', 'right')
		 * @return {string} Transformed stylesheet
		 */
		transform: function ( css, options ) {
			var swapText,
				// Tokenizers
				noFlipSingleTokenizer = new Tokenizer( noFlipSingleRegExp, noFlipSingleToken ),
				noFlipClassTokenizer = new Tokenizer( noFlipClassRegExp, noFlipClassToken ),
				commentTokenizer = new Tokenizer( commentRegExp, commentToken );

			swapText = ( function () {
				var textChanges = {
					left: 'right',
					right: 'left',
					e: 'w',
					w: 'e',
					nesw: 'nwse',
					nwse: 'nesw',
					ltr: 'rtl',
					rtl: 'ltr'
				};

				/**
				 * Transform certain property names and values, ex "left" -> "right".
				 *
				 * @param {string} text Text to be transformed.
				 * @return {string}
				 */
				return function swapText( text ) {
					// CSS property names are case insensitive.
					var lcText = text && text.toLowerCase();
					return textChanges[ lcText ] || text || '';
				};
			}() );

			// Tokenize
			css = commentTokenizer.tokenize(
				noFlipClassTokenizer.tokenize(
					noFlipSingleTokenizer.tokenize(
						// We wrap tokens in ` , not ~ like the original implementation does.
						// This was done because ` is not a legal character in CSS and can only
						// occur in URLs, where we escape it to %60 before inserting our tokens.
						css.replace( '`', '%60' )
					)
				)
			);

			// Transform URLs
			if ( options.transformDirInUrl ) {
				// Replace 'ltr' with 'rtl' and vice versa in background URLs
				css = css.replace( dirInUrlRegExp, function ( match, pre, dir ) {
					return pre + swapText( dir );
				} );
			}
			if ( options.transformEdgeInUrl ) {
				// Replace 'left' with 'right' and vice versa in background URLs
				css = css.replace( edgeInUrlRegExp, function ( match, pre, edge ) {
					return pre + swapText( edge );
				} );
			}

			// Transform rules
			css = css
				// Replace direction: ltr; with direction: rtl; and vice versa.
				.replace( directionRegExp, function ( match, pre, dir ) {
					return pre + swapText( dir );
				} )
				// Flip rules like left: , padding-right: , etc.
				.replace( sidesRegExp, function ( match, prefix, side ) {
					return prefix + swapText( side );
				} )
				// Flip East and West in rules like cursor: nw-resize;
				.replace( cursorRegExp, function ( match, pre, ns, ew, nesw ) {
					if ( nesw && ( !ns || !ew ) ) {
						// Invalid cursor value. Return unchanged.
						return match;
					}
					return pre + (
						( nesw ?
							swapText( ns + ew + nesw ) :
							( ns || '' ) + swapText( ew )
						) + '-resize'
					);
				} )
				// Border radius
				.replace( borderRadiusRegExp, calculateNewBorderRadius )
				// Shadows
				.replace( boxShadowRegExp, calculateNewShadow )
				.replace( textShadow1RegExp, calculateNewFourTextShadow )
				.replace( textShadow2RegExp, calculateNewFourTextShadow )
				.replace( textShadow3RegExp, calculateNewShadow )
				// Translate
				.replace( translateXRegExp, calculateNewTranslate )
				.replace( translateRegExp, calculateNewTranslate )
				// Swap the second and fourth parts in four-part notation rules
				// like padding: 1px 2px 3px 4px;
				.replace( fourNotationQuantRegExp, '$1$2$3$8$5$6$7$4$9' )
				.replace( fourNotationColorRegExp, '$1$2$3$8$5$6$7$4$9' )
				// Flip horizontal background percentages
				.replace( bgHorizontalPercentageRegExp, calculateNewBackgroundPosition )
				.replace( bgHorizontalPercentageXRegExp, calculateNewBackgroundPosition );

			// Detokenize
			css = noFlipSingleTokenizer.detokenize(
				noFlipClassTokenizer.detokenize(
					commentTokenizer.detokenize( css )
				)
			);

			return css;
		}
	};
}

/* Initialization */

cssjanus = new CSSJanus();

/* Exports */

/**
 * Transform a left-to-right stylesheet to right-to-left.
 *
 * This function is a static wrapper around the transform method of an instance of CSSJanus.
 *
 * @param {string} css Stylesheet to transform
 * @param {Object|boolean} [options] Options object, or transformDirInUrl option (back-compat)
 * @param {boolean} [options.transformDirInUrl=false] Transform directions in URLs (e.g. 'ltr', 'rtl')
 * @param {boolean} [options.transformEdgeInUrl=false] Transform edges in URLs (e.g. 'left', 'right')
 * @param {boolean} [transformEdgeInUrl] Back-compat parameter
 * @return {string} Transformed stylesheet
 */
exports.transform = function ( css, options, transformEdgeInUrl ) {
	var norm;
	if ( typeof options === 'object' ) {
		norm = options;
	} else {
		norm = {};
		if ( typeof options === 'boolean' ) {
			norm.transformDirInUrl = options;
		}
		if ( typeof transformEdgeInUrl === 'boolean' ) {
			norm.transformEdgeInUrl = transformEdgeInUrl;
		}
	}
	return cssjanus.transform( css, norm );
};
