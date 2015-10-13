/*!
 * Transforms CSS stylesheets between directions.
 * https://github.com/cssjanus/cssjanus
 *
 * Copyright 2008 Google Inc.
 * Copyright 2010 Trevor Parscal
 */

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
	 * @returns {string} Token to leave in the matched string's place
	 */
	function tokenizeCallback( match ) {
		matches.push( match );
		return token;
	}

	/**
	 * Get a match.
	 *
	 * @private
	 * @param {string} token Matched token
	 * @returns {string} Original matched string to restore
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
 * CSSJanus changes the directions of CSS rules so that a stylesheet can be transformed to a stylesheet
 * with a different direction and orientation automatically. Processing can be bypassed for an entire
 * rule or a single property by adding a / * @noflip * / comment above the rule or property.
 *
 * @author Trevor Parscal <trevorparscal@gmail.com>
 * @author Roan Kattouw <roankattouw@gmail.com>
 * @author Lindsey Simon <elsigh@google.com>
 * @author Roozbeh Pournader <roozbeh@gmail.com>
 * @author Bryon Engelhardt <ebryon77@gmail.com>
 * @author Yair Rand <yyairrand@gmail.com>
 *
 * @class
 * @constructor
 */
function CSSJanus() {

	var
		sides = [ 'top', 'right', 'bottom', 'left' ],
		cursors = [ 'n', 'e', 's', 'w' ],
		wmDirs = [ 'tb', 'rl', 'bt', 'lr' ],
		directions = {
			tb: 0,
			rl: 1,
			bt: 2,
			lr: 3
		},
		// Tokens
		noFlipSingleToken = '`NOFLIP_SINGLE`',
		noFlipClassToken = '`NOFLIP_CLASS`',
		commentToken = '`COMMENT`',
		// Patterns
		nonAsciiPattern = '[^\\u0020-\\u007e]',
		unicodePattern = '(?:(?:\\[0-9a-f]{1,6})(?:\\r\\n|\\s)?)',
		numPattern = '(?:[0-9]*\\.[0-9]+|[0-9]+)',
		unitPattern = '(?:em|ex|px|cm|mm|in|pt|pc|deg|rad|grad|ms|s|hz|khz|%)',
		directionPattern = 'direction\\s*:\\s*',
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
		fourNotationQuantPropsPattern = '((?:margin|padding|border-width|border-image-width|border-image-outset)\\s*:\\s*)',
		fourNotationColorPropsPattern = '((?:border-color|border-style)\\s*:\\s*)',
		colorPattern = '(#?' + nmcharPattern + '+|(?:rgba?|hsla?)\\([ \\d.,%-]+\\))',
		urlCharsPattern = '(?:' + urlSpecialCharsPattern + '|' + nonAsciiPattern + '|' + escapePattern + ')*',
		sidesPattern = 'top|right|bottom|left',
		edgesPattern = '(?:' + sidesPattern + '|center)',
		lookAheadNotLetterPattern = '(?![a-zA-Z])',
		lookAheadNotOpenBracePattern = '(?!(' + nmcharPattern + '|\\r?\\n|\\s|#|\\:|\\.|\\,|\\+|>|\\(|\\)|\\[|\\]|=|\\*=|~=|\\^=|\'[^\']*\'|"[^"]*")*?{)',
		lookAheadNotClosingParenPattern = '(?!' + urlCharsPattern + '?' + validAfterUriCharsPattern + '\\))',
		lookAheadForClosingParenPattern = '(?=' + urlCharsPattern + '?' + validAfterUriCharsPattern + '\\))',
		suffixPattern = '(\\s*(?:!important\\s*)?[;}])',
		// Regular expressions
		commentRegExp = new RegExp( commentPattern, 'gi' ),
		noFlipSingleRegExp = new RegExp( '(' + noFlipPattern + lookAheadNotOpenBracePattern + '[^;}]+;?)', 'gi' ),
		noFlipClassRegExp = new RegExp( '(' + noFlipPattern + charsWithinSelectorPattern + '})', 'gi' ),
		directionRegExp = new RegExp( '(' + directionPattern + ')(ltr|rtl)', 'gi' ),
		sidesRegExp = new RegExp( nonLetterPattern +
			'((?:float|clear|text-align|vertical-align)\\s*:\\s*|(vertical-align\\s*:\\s*(?:text-)?|text-orientation\\s*:\\s*sideways-))?(' + sidesPattern + ')' +
			lookAheadNotLetterPattern + lookAheadNotClosingParenPattern + lookAheadNotOpenBracePattern, 'gi' ),
		edgeInUrlRegExp = new RegExp( nonLetterPattern + '(' + sidesPattern + ')' + lookAheadNotLetterPattern + lookAheadForClosingParenPattern, 'gi' ),
		dirInUrlRegExp = new RegExp( nonLetterPattern + '(ltr|rtl|(?:tb|bt|vertical)-(?:lr|rl|inline)|(?:lr|rl|horizontal)-(?:tb|bt|inline))' + lookAheadNotLetterPattern + lookAheadForClosingParenPattern, 'gi' ),
		cursorRegExp = new RegExp( '(cursor\\s*:\\s*)(?:([ns])?([ew])?(s[ew])?-resize|(row-resize|col-resize|text|vertical-text))', 'gi' ),
		fourNotationQuantRegExp = new RegExp( fourNotationQuantPropsPattern + signedQuantPattern + '(\\s+)' + signedQuantPattern + '(?:(\\s+)' + signedQuantPattern + '(?:(\\s+)' + signedQuantPattern + ')?)?' + suffixPattern, 'gi' ),
		fourNotationColorRegExp = new RegExp( fourNotationColorPropsPattern + colorPattern + '(\\s+)' + colorPattern + '(?:(\\s+)' + colorPattern + '(?:(\\s+)' + colorPattern + ')?)?' + suffixPattern, 'gi' ),
		// Background-positions.
		bgRegExp = new RegExp( '(background(?:-position)?)(\\s*:\\s*)([^;{}]+)', 'gi' ),
		bgXYRegExp = new RegExp( '(background-position-[xy])(?:(\\s*:\\s*)([^;{}]+)' + suffixPattern + ')?', 'gi' ),
		bgPositionValuesRegExp = new RegExp(
			'(^|\\s|,)' +
			'((' + edgesPattern + '(?:\\s+-?' + quantPattern + '(?=\\s+' + edgesPattern + '))?)|-?' + quantPattern + ')' +
			'(?:(\\s+)((' + edgesPattern + '(?:\\s+-?' + quantPattern + ')?)|-?' + quantPattern + '))?' +
			'(?:(\\s*\\/\\s*)(' + quantPattern + ')(\\s+)(' + quantPattern + '))?' + // background-size
			'(?![^()]*\\))' +
			lookAheadNotClosingParenPattern, 'gi' ),
		bgPositionSingleValueRegExp = new RegExp(
			'(^|\\s|,)' +
			'(-?' + numPattern + '%)' +
			lookAheadNotClosingParenPattern, 'gi' ),
		bgRepeatRegExp = new RegExp( '(background-repeat\\s*:\\s*)([A-z-, ]+)' + suffixPattern ),
		bgRepeatValueRegExp = new RegExp( '(?:repeat-[xy]|((?:no-)?repeat|space|round)(\\s+)((?:no-)?repeat|space|round))' + lookAheadNotClosingParenPattern, 'gi' ),
		bgSizeRegExp = new RegExp( '(background-size\\s*:\\s*)([^;{}]+)' ),
		bgSizeValueRegExp = new RegExp( '(auto|' + quantPattern + ')(\\s+)(auto|' + quantPattern + ')', 'gi' ),
		borderImageRegExp = new RegExp( '(border-image(?:-slice)?\\s*:\\s*[^;}]*?)' +
			signedQuantPattern + '(?:(\\s+(?:fill\\s+)?)' + signedQuantPattern + '(?:(\\s+(?:fill\\s+)?)' + signedQuantPattern + '(?:(\\s+(?:fill\\s+)?)' + signedQuantPattern + ')?)?)?' +
			'(?:((?:\\s+fill)?\\s*/\\s*)(?:' + signedQuantPattern + '(?:(\\s+)' + signedQuantPattern + '(?:(\\s+)' + signedQuantPattern + '(?:(\\s+)' + signedQuantPattern + ')?)?)?)?' +
				'(?:(\\s*/\\s*)(?:' + signedQuantPattern + '(?:(\\s+)' + signedQuantPattern + '(?:(\\s+)' + signedQuantPattern + '(?:(\\s+)' + signedQuantPattern + ')?)?)?)?)?' +
			')?' +
			lookAheadNotClosingParenPattern, 'gi' ),
		borderImageRepeatRegExp = new RegExp( '(border-image(?:-repeat)?\\s*\\:\\s*[^;}]*?)(stretch|repeat|round|space)(\\s+)(stretch|repeat|round|space)' + lookAheadNotLetterPattern + lookAheadNotClosingParenPattern, 'gi' ),
		// border-radius: <length or percentage>{1,4} [optional: / <length or percentage>{1,4} ]
		borderRadiusRegExp = new RegExp( '(border-radius\\s*:\\s*)' + signedQuantPattern + '(?:(?:(\\s+)' + signedQuantPattern + ')(?:(\\s+)' + signedQuantPattern + ')?(?:(\\s+)' + signedQuantPattern + ')?)?' +
			'(?:(?:(\\s*\\/\\s*)' + signedQuantPattern + ')(?:(\\s+)' + signedQuantPattern + ')?(?:(\\s+)' + signedQuantPattern + ')?(?:(\\s+)' + signedQuantPattern + ')?)?' + suffixPattern, 'gi' ),
		borderRadiusCornerRegExp = new RegExp( 'border-(left|right)-(top|bottom)-radius(?:(\\s*:\\s*)(' + quantPattern + ')(\\s+)(' + quantPattern + '))?' + lookAheadNotOpenBracePattern + lookAheadNotClosingParenPattern, 'gi' ),
		shadowRegExp = new RegExp( '((?:box|text)-shadow\\s*:\\s*)([^;{}]+)', 'gi' ),
		shadowValueRegExp = new RegExp( signedQuantPattern + '(\\s+)' + signedQuantPattern + '([^,;}]*)', 'gi' ),
		sizeRegExp = new RegExp( '(max-|min-|[^-a-z])(height|width)' + lookAheadNotLetterPattern + lookAheadNotClosingParenPattern + lookAheadNotOpenBracePattern, 'gi' ),
		writingModeRegExp = new RegExp( '(writing-mode\\s*:\\s*)(tb|bt|rl|lr|horizontal|vertical)-(tb|bt|rl|lr)', 'gi' ),
		resizeRegExp = new RegExp( '(resize\\s*:\\s*)(horizontal|vertical)', 'gi' ),
		xyPropRegExp = new RegExp( '(overflow|scroll-snap-points|scroll-snap-type)-([xy])' + lookAheadNotClosingParenPattern + lookAheadNotOpenBracePattern, 'gi' ),
		mediaQueryRegExp = new RegExp( '(@media\\s+)([^{]+)(\\{)', 'gi' ),
		mediaFeatureRegExp = new RegExp( '(width|height|aspect-ratio|orientation)(\\s*:\\s*)([^{/()\\s]+)(?:(\\s*/\\s*)(\\d+))?', 'gi' );

	/**
	 * Generates an array containing numeric versions of the inline-start and block-start of the given direction.
	 * The standard top>right>bottom>left order is used, so lr-tb would be [ 3, 0 ], for example.
	 *
	 * @private
	 * @param {string} dir
	 * @return {array}
	 */
	function orientationArray( dir ) {
		return dir.split( '-' ).map( function ( dir ) {
			return directions[ dir ];
		} );
	}

	/**
	 * Invert the value of a background position property.
	 *
	 * @private
	 * @param {string} value
	 */
	function flipBackgroundPositionValue( value ) {
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
		return value;
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
	 * Swap horizontal and vertical values for various background properties.
	 *
	 * @private
	 * @param {string} match
	 * @param {string} x
	 * @param {string} space
	 * @param {string} y
	 */
	function backgroundTwoPointSwap( match, x, space, y ) {
		// y will only be absent on background-repeat: repeat-[xy]; or background: [...] repeat-[xy] [...];
		return y ? y + space + x : ( match === 'repeat-x' ? 'repeat-y' : 'repeat-x' );
	}

	/**
	 * @private
	 * @param {number} dir
	 * @param {string} X
	 * @param {string} Y
	 * @return {string}
	 */
	function flipXYPositions( dir, X, Y ) {
		switch ( dir ) {
			case 0:
				return flipSign( Y );
			case 1:
				return X;
			case 2:
				return Y;
			case 3:
				return flipSign( X );
		}
	}

	/**
	 * @private
	 * @param {object} pointMap
	 * @param {array} array
	 * @param {boolean} turned Whether transformation is such that a three-point value would become four-point.
	 * @return {string}
	 */
	function processFourNotationArray( pointMap, array, turned ) {
		function fourNotationMap( val, index, all ) {
			if ( index & 1 ) {
				// If turned, add a space to fit the duplicate final value.
				return val || ( ( index === 5 && turned && all[ 4 ] ) ? ' ' : '' );
			} else {
				if ( !val ) {
					return ( index === 6 && turned && all[ 4 ] ) ? all[ pointMap[ index / 2 ] * 2 ] : '';
				} else {
					var d = ( index / 2 );
					return ( all[ pointMap[ d ] * 2 ] || all[ ( pointMap[ d ] * 2 ) ^ 4 ] || all[ 0 ] );
				}
			}
		}
		return array.map( fourNotationMap ).join( '' );
	}

	return {
		/**
		 * Transform a stylesheet to from one direction to another.
		 *
		 * @param {string} css Stylesheet to transform
		 * @param {boolean} transformDirInUrl Transform directions and writing modes (such as 'ltr', 'rtl', 'vertical-lr', 'rl-tb', 'horizontal-inline', etc) in URLs
		 * @param {boolean} transformEdgeInUrl Transform edges ('left', 'right', 'top', and 'bottom') in URLs
		 * @param {string} sourceDir The source direction and writing mode
		 * @param {string} targetDir The target direction and writing mode
		 * @return {string} Transformed stylesheet
		 */
		transform: function ( css, transformDirInUrl, transformEdgeInUrl, sourceDir, targetDir ) {
			// Default values
			sourceDir = sourceDir || 'lr-tb';
			targetDir = targetDir || 'rl-tb';

			if ( sourceDir === targetDir ) {
				return css;
			}

			var source = orientationArray( sourceDir ),
				target = orientationArray( targetDir ),
				map = {},
				cornersMap = {},
				textChanges = { '': '', undefined: '' },
				// Determine if direction (ltr/rtl) is flipped.
				dirFlipped = ( ( source[ 0 ] ^ target[ 0 ] ) % 3 ) !== 0,
				// Determine if rotated 90deg or 270deg, with or without mirroring.
				// That is, whether height and width are swapped.
				quarterTurned = ( source[ 0 ] & 1 ) !== ( target[ 0 ] & 1 ),
				// Determine whether corner axes (ne/sw, nw/se) remain constant.
				cornersFlipped = ( source[ 0 ] + source[ 1 ] ) % 3 !== ( target[ 0 ] + target[ 1 ] ) % 3,
				// Actually flipped, as opposed to just rotated.
				reflected = ( ( source[ 0 ] - source[ 1 ] ) & 3 ) !== ( ( target[ 0 ] - target[ 1 ] ) & 3 ),
				// Tokenizers
				noFlipSingleTokenizer = new Tokenizer( noFlipSingleRegExp, noFlipSingleToken ),
				noFlipClassTokenizer = new Tokenizer( noFlipClassRegExp, noFlipClassToken ),
				commentTokenizer = new Tokenizer( commentRegExp, commentToken ),
				i;

			for ( i = 0; i < 4; i++ ) {
				map[ target[ i & 1 ] ^ ( i & 2 ) ] = source[ i & 1 ] ^ ( i & 2 );
				cornersMap[ target[ i & 1 ] ^ ( i & 2 ) ] = ( ( ( source[ i & 1 ] ^ ( i & 2 ) ) + reflected ) & 3 );
			}
			for ( i = 0; i < 4; i++ ) {
				textChanges[ sides[ map[ i ] ] ] = sides[ i ];
				textChanges[ cursors[ map[ i ] ] ] = cursors[ i ];
				textChanges[ wmDirs[ map[ i ] ] ] = wmDirs[ i ];
			}

			if ( quarterTurned ) {
				textChanges[ 'background-position-y' ] = 'background-position-x';
				textChanges[ 'background-position-x' ] = 'background-position-y';
				textChanges.horizontal = 'vertical';
				textChanges.vertical = 'horizontal';
				textChanges.text = 'vertical-text';
				textChanges[ 'vertical-text' ] = 'text';
				textChanges[ 'row-resize' ] = 'col-resize';
				textChanges[ 'col-resize' ] = 'row-resize';
				textChanges.width = 'height';
				textChanges.height = 'width';
				textChanges.landscape = 'portrait';
				textChanges.portrait = 'landscape';
			}

			if ( dirFlipped ) {
				textChanges.ltr = 'rtl';
				textChanges.rtl = 'ltr';
			}

			function fourNotation( match, pre, q1, s1, q2, s2, q3, s3, q4, s4 ) {
				return pre + processFourNotationArray( map, [].slice.call( arguments, 2, 9 ), quarterTurned ) + s4;
			}

			function borderImages( match, pre ) {
				return pre +
					processFourNotationArray( map, [].slice.call( arguments,  2,  9 ), quarterTurned ) + ( arguments[ 9 ] || '' ) +
					processFourNotationArray( map, [].slice.call( arguments, 10, 17 ), quarterTurned ) + ( arguments[ 17 ] || '' ) +
					processFourNotationArray( map, [].slice.call( arguments, 18, 25 ), quarterTurned );
			}

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
			if ( transformDirInUrl ) {
				// Transform directions and writing-modes in background URLs.
				css = css.replace( dirInUrlRegExp, function ( match, pre, dir ) {
					// Valid directions:
					//   ltr, rtl, tb-lr, tb-rl, lr-tb, lr-bt, rl-tb, rl-bt, bt-lr, bt-rl
					//   horizontal-tb, horizontal-bt, vertical-lr, vertical-rl,
					//   tb-inline, bt-inline, lr-inline, rl-inline, horizontal-inline, vertical-inline,

					return pre + dir.split( '-' ).map( function ( val ) {
						return textChanges[ val ] || val;
					} ).join( '-' );
				} );
			}
			if ( transformEdgeInUrl ) {
				// Replace 'left', 'top', 'right', and 'bottom' with the appropriate side in background URLs
				css = css.replace( edgeInUrlRegExp, function ( match, pre, edge ) {
					return pre + textChanges[ edge ];
				} );
			}

			// Transform rules
			css = css
				// Flip rules like left: , padding-right: , etc.
				.replace( sidesRegExp, function ( match, prefix, norotate, suppressChange, side ) {
					return norotate ?
						prefix + norotate +
							( !suppressChange && dirFlipped && ( side === 'right' ? 'left' : ( side === 'left' && 'right' ) ) || side )
						:
						prefix + textChanges[ side ];
				} )
				// Transform North/East/South/West in rules like cursor: nw-resize;
				.replace( cursorRegExp, function ( match, pre, ns, ew, nesw, otherCursor ) {
					return pre + (
						otherCursor ?
							( textChanges[ otherCursor ] || otherCursor )
							:
							( nesw ?
								( cornersFlipped ? nesw === 'sw' ? 'nwse' : 'nesw' : ns + ew + nesw ) :
								textChanges[ quarterTurned ? ew : ns ] + textChanges[ quarterTurned ? ns : ew ]
							) + '-resize'
					);
				} )
				// Border radius
				.replace( borderRadiusRegExp, function ( match, pre ) {
					var preSlash = processFourNotationArray( cornersMap, [].slice.call( arguments, 2, 9 ), cornersFlipped ),
						postSlash = processFourNotationArray( cornersMap, [].slice.call( arguments, 10, 17 ), cornersFlipped );
					return pre +
						( quarterTurned ? postSlash + ( arguments[ 9 ] || '' ) + preSlash : preSlash + ( arguments[ 9 ] || '' ) + postSlash ) +
						( arguments[ 17 ] || '' );
				} )
				// Shadows
				.replace( shadowRegExp, function ( match, prop, value ) {
					return prop + value.replace( shadowValueRegExp, function ( match, X, space, Y, end ) {
						return ( flipXYPositions( map[ 1 ], X, Y ) + space + flipXYPositions( map[ 2 ], X, Y ) ) + end;
					} );
				} )
				// Switch around parts in two-, three-, and four-part notation rules
				// like padding: 1px 2px 3px 4px;
				.replace( fourNotationQuantRegExp, fourNotation )
				.replace( fourNotationColorRegExp, fourNotation )
				// Transform background positions, and shorthands for background-size and background-repeat.
				.replace( bgRegExp, function ( match, prop, space, val ) {

					if ( quarterTurned ) {
						val = val.replace( bgRepeatValueRegExp, backgroundTwoPointSwap );
					}

					return ( textChanges[ prop ] || prop ) + space + val.replace( bgPositionValuesRegExp, function ( match, pre, xPos, xEdge, space1, yPos, yEdge, slash, sizeX, sizeSpace, sizeY ) {
						// Edge offsets are not supported in IE8, so don't switch to it unless it was already being used.
						var position;
						if ( !xEdge || !yEdge ) {
							// There are quantities that are not edge-offsets.
							if ( !yPos ) {
								// Only one value given.
								if ( quarterTurned && !xEdge ) {
									// Only the horizontal value was provided, and we're converting it to vertical.
									// Default new horizontal to "center".
									yPos = 'center';
									space1 = ' ';
								} else {
									yPos = space1 = '';
								}
							} else {
								if ( !yEdge && ( map[ 2 ] === 0 || map[ 1 ] === 0 ) ) {
									yPos = flipBackgroundPositionValue( yPos );
								}
							}
							if ( !xEdge && ( map[ 3 ] === 1 || map[ 0 ] === 1 ) ) {
								xPos = flipBackgroundPositionValue( xPos );
							}
						}

						position = quarterTurned ?
							yPos + space1 + xPos :
							xPos + space1 + yPos;

						return pre + position +
							( sizeY ?
								slash + ( quarterTurned ?
									sizeY + sizeSpace + sizeX :
									sizeX + sizeSpace + sizeY ) :
								'' );
					} );
				} )
				// Background-position-x and background-position-y
				.replace( bgXYRegExp, function ( match, prop, space, val, suffix ) {
					return ( textChanges[ prop ] || prop ) + ( space ? space + val.replace( bgPositionSingleValueRegExp, function ( match, pre, position ) {
						if ( prop === 'background-position-x' ?
							( map[ 3 ] === 1 || map[ 0 ] === 1 ) :
							( map[ 2 ] === 0 || map[ 1 ] === 0 )
						) {
							position = flipBackgroundPositionValue( position );
						}

						return pre + position;
					} ) + suffix : '' );
				} )

				// Border images
				.replace( borderImageRegExp, borderImages )
				// Writing mode
				.replace( writingModeRegExp, function ( match, prop, inline, block ) {
					return prop + ( textChanges[ inline ] || inline ) + '-' + ( textChanges[ block ] || block );
				} );

			if ( dirFlipped ) {
				// Replace direction: ltr; with direction: rtl; and vice versa.
				css = css.replace( directionRegExp, function ( match, pre, dir ) {
					return pre + ( dir === 'ltr' ? 'rtl' : 'ltr' );
				} );
			}

			if ( quarterTurned ) {
				css = css
					.replace( resizeRegExp, function ( match, prop, value ) {
						return prop + ( textChanges[ value ] || value );
					} )
					.replace( xyPropRegExp, function ( match, prop, value ) {
						return prop + '-' + ( value === 'x' ? 'y' : 'x' );
					} )
					.replace( sizeRegExp, function ( match, prefix, prop ) {
						return prefix + textChanges[ prop ];
					} )
					.replace( bgRepeatRegExp, function ( match, prop, value, suffix ) {
						return prop + value.replace( bgRepeatValueRegExp, backgroundTwoPointSwap ) + suffix;
					} )
					.replace( bgSizeRegExp, function ( match, prop, value ) {
						return prop + value.replace( bgSizeValueRegExp, backgroundTwoPointSwap );
					} )
					.replace( mediaQueryRegExp, function ( match, prop, value, suffix ) {
						return prop + value.replace( mediaFeatureRegExp, function ( match, prop, space, value, slash, vPixels ) {
							return ( textChanges[ prop ] || prop ) + space +
								( slash ? vPixels + slash + value : ( textChanges[ value ] || value ) );
						} ) + suffix;
					} )
					.replace( borderImageRepeatRegExp, '$1$4$3$2' )
					.replace( borderRadiusCornerRegExp, 'border-$2-$1-radius$3$6$5$4' );
			}

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

var cssjanus = new CSSJanus();

/* Exports */

/**
 * Transform a stylesheet to from one direction to another.
 *
 * This function is a static wrapper around the transform method of an instance of CSSJanus.
 *
 * @param {string} css Stylesheet to transform
 * @param {boolean} [transformDirInUrl=false] Transform directions and writing modes (such as 'ltr', 'rtl', 'vertical-lr', 'rl-tb', 'horizontal-inline', etc) in URLs
 * @param {boolean} [transformEdgeInUrl=false] Transform edges ('left', 'right', 'top', and 'bottom') in URLs
 * @param {string} [sourceDir='lr-tb'] The source direction and writing mode
 * @param {string} [targetDir='rl-tb'] The target direction and writing mode
 * @return {string} Transformed stylesheet
 */
exports.transform = function ( css, transformDirInUrl, transformEdgeInUrl, sourceDir, targetDir ) {
	return cssjanus.transform( css, transformDirInUrl, transformEdgeInUrl, sourceDir, targetDir );
};
