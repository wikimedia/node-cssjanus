/*!
 * Transforms CSS stylesheets between directions.
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
		calcToken = '`CALC$1`',
		calcPattern = '-?`CALC\\d+`',
		// Patterns
		nonAsciiPattern = '[^\\u0020-\\u007e]',
		unicodePattern = '(?:(?:\\[0-9a-f]{1,6})(?:\\r\\n|\\s)?)',
		numPattern = '(?:[0-9]*\\.[0-9]+|[0-9]+)(?:[eE][-+]?[0-9+])?',
		unitPattern = '(?:em|ex|px|cm|mm|in|pt|pc|deg|rad|grad|ms|s|hz|khz|%)',
		// Whitespace
		_ = '(?:\\s|' + commentToken + ')*',
		ws = '(?:\\s|' + commentToken + ')+',
		sws = '(' + ws + ')',
		colon = _ + ':' + _,
		slash = _ + '/' + _,
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
		quantPattern = '[-+]?(?:' + numPattern + '(?:\\s*' + unitPattern + '|' + identPattern + ')?|' + calcPattern + ')',
		posQuantPattern = '(?:\\+?' + numPattern + '(?:\\s*' + unitPattern + '|' + identPattern + ')?|' + calcPattern + ')',
		signedQuantPattern = '((?:' + quantPattern + ')|(?:inherit|auto))',
		fourNotationQuantPropsPattern = '((?:margin|padding|border-width|border-image-width|border-image-outset)' + colon + ')',
		fourNotationColorPropsPattern = '((?:border-color|border-style)' + colon + ')',
		colorPattern = '(#?' + nmcharPattern + '+|(?:rgba?|hsla?)\\([ \\d.,%+-]+\\))',
		urlCharsPattern = '(?:' + urlSpecialCharsPattern + '|' + nonAsciiPattern + '|' + escapePattern + ')*',
		sidesPattern = 'top|right|bottom|left',
		edgesPattern = '(?:' + sidesPattern + '|center)',
		lookAheadNotLetterPattern = '(?![a-zA-Z])',
		lookAheadNotOpenBracePattern = '(?!(' + nmcharPattern + '|\\r?\\n|\\s|#|\\:|\\.|\\,|\\+|>|\\(|\\)|\\[|\\]|=|\\*=|~=|\\^=|\'[^\']*\'|"[^"]*"|' + commentToken + ')*?{)',
		lookAheadNotClosingParenPattern = '(?!' + urlCharsPattern + '?' + validAfterUriCharsPattern + '\\))',
		lookAheadForClosingParenPattern = '(?=' + urlCharsPattern + '?' + validAfterUriCharsPattern + '\\))',
		suffixPattern = '(' + _ + '(?:!important' + _ + ')?[;}])',
		anglePattern = '(?:([-+]?' + numPattern + ')((?:deg|g?rad|turn)?))',
		colorStopsPattern = colorPattern + '(?:' + ws + quantPattern + ')?' +
			'(?:' + _ + ',' + _ + colorPattern + '(?:' + ws + quantPattern + ')?)+',
		// Regular expressions
		commentRegExp = new RegExp( commentPattern, 'gi' ),
		noFlipSingleRegExp = new RegExp( '(' + noFlipPattern + lookAheadNotOpenBracePattern + '[^;}]+;?)', 'gi' ),
		noFlipClassRegExp = new RegExp( '(' + noFlipPattern + charsWithinSelectorPattern + '})', 'gi' ),
		directionRegExp = new RegExp( '(' + directionPattern + ')(ltr|rtl)', 'gi' ),
		sidesRegExp = new RegExp( nonLetterPattern +
			'((?:float|clear|text-align|vertical-align)' + colon + '|(vertical-align' + colon + '(?:text-)?|text-orientation' + colon + 'sideways-))?(' + sidesPattern + ')' +
			lookAheadNotLetterPattern + lookAheadNotClosingParenPattern + lookAheadNotOpenBracePattern, 'gi' ),
		edgeInUrlRegExp = new RegExp( nonLetterPattern + '(' + sidesPattern + ')' + lookAheadNotLetterPattern + lookAheadForClosingParenPattern, 'gi' ),
		dirInUrlRegExp = new RegExp( nonLetterPattern + '(ltr|rtl|(?:tb|bt|vertical)-(?:lr|rl|inline)|(?:lr|rl|horizontal)-(?:tb|bt|inline))' + lookAheadNotLetterPattern + lookAheadForClosingParenPattern, 'gi' ),
		cursorRegExp = new RegExp( '(cursor' + colon + ')(?:([ns])?([ew])?(s[ew])?-resize|(row-resize|col-resize|text|vertical-text))', 'gi' ),
		fourNotationQuantRegExp = new RegExp( fourNotationQuantPropsPattern + signedQuantPattern + sws + signedQuantPattern + '(?:' + sws + signedQuantPattern + '(?:' + sws + signedQuantPattern + ')?)?' + suffixPattern, 'gi' ),
		fourNotationColorRegExp = new RegExp( fourNotationColorPropsPattern + colorPattern + sws + colorPattern + '(?:' + sws + colorPattern + '(?:' + sws + colorPattern + ')?)?' + suffixPattern, 'gi' ),
		quantPlainUnitRegex = new RegExp( '[-+]?' + numPattern + unitPattern, 'gi' ),
		// Background-positions.
		bgRegExp = new RegExp( '(background(?:-position)?)(' + colon + ')([^;{}]+)', 'gi' ),
		bgXYRegExp = new RegExp( '(background-position-[xy])(?:(' + colon + ')([^;{}]+)' + suffixPattern + ')?', 'gi' ),
		positionValuesRegExp = new RegExp(
			'(^|\\s|,)' +
			'((' + edgesPattern + '(?:' + ws + quantPattern + '(?=' + ws + edgesPattern + '))?)|' + quantPattern + ')' +
			'(?:' + sws + '((' + edgesPattern + '(?:' + ws + quantPattern + ')?)|' + quantPattern + '))?' +
			'(?:(' + slash + ')(' + posQuantPattern + ')' + sws + '(' + posQuantPattern + '))?' + // background-size
			'(?![^()]*\\))' +
			lookAheadNotClosingParenPattern, 'gi' ),
		bgPositionSingleValueRegExp = new RegExp(
			'(^|\\s|,)' +
			'([-+]?' + numPattern + '%)' +
			lookAheadNotClosingParenPattern, 'gi' ),
		bgRepeatRegExp = new RegExp( '(background-repeat' + colon + ')([A-z-, ]+)' + suffixPattern ),
		bgRepeatValueRegExp = new RegExp( '(?:repeat-[xy]|((?:no-)?repeat|space|round)' + sws + '((?:no-)?repeat|space|round))' + lookAheadNotClosingParenPattern, 'gi' ),
		bgSizeRegExp = new RegExp( '(background-size' + colon + ')([^;{}]+)' ),
		twoQuantsRegExp = new RegExp( '(auto|' + posQuantPattern + ')' + sws + '(auto|' + posQuantPattern + ')', 'gi' ),
		linearGradientRegExp = new RegExp(
			'((?:repeating-)?linear-gradient\\(' + _ + ')' +
			'(?:' + anglePattern + '(' + _ + ',' + _ + '))?' +
			'(' + colorStopsPattern + _ + '\\))',
			'gi'
		),
		radialGradientRegExp = new RegExp(
			'((?:repeating-)?radial-gradient\\(' + _ + ')' +
			'((?:' + _ + '(?:(?:closest|farthest)-(?:corner|side)|circle|ellipse|' + posQuantPattern + ')(?=\\s|,))*)' +
			'(' + ws + 'at(?:' + ws + '(?:' + edgesPattern + '|' + quantPattern + ')){1,4})?' + // positon
			'(' + _ + ',' + _ + colorStopsPattern + _ + '\\))',
			'gi'
		),
		borderImageRegExp = new RegExp( '(border-image(?:-slice)?' + colon + '[^;}]*?)' +
			signedQuantPattern + '(?:(' + ws + '(?:fill' + ws + ')?)' + signedQuantPattern + '(?:(' + ws + '(?:fill' + ws + ')?)' + signedQuantPattern + '(?:(' + ws + '(?:fill' + ws + ')?)' + signedQuantPattern + ')?)?)?' +
			'(?:((?:' + ws + 'fill)?' + slash + ')(?:' + signedQuantPattern + '(?:' + sws + signedQuantPattern + '(?:' + sws + signedQuantPattern + '(?:' + sws + signedQuantPattern + ')?)?)?)?' +
				'(?:(' + slash + ')(?:' + signedQuantPattern + '(?:' + sws + signedQuantPattern + '(?:' + sws + signedQuantPattern + '(?:' + sws + signedQuantPattern + ')?)?)?)?)?' +
			')?' +
			lookAheadNotClosingParenPattern, 'gi' ),
		borderImageRepeatRegExp = new RegExp( '(border-image(?:-repeat)?' + colon + '[^;}]*?)(stretch|repeat|round|space)' + sws + '(stretch|repeat|round|space)' + lookAheadNotLetterPattern + lookAheadNotClosingParenPattern, 'gi' ),
		// border-radius: <length or percentage>{1,4} [optional: / <length or percentage>{1,4} ]
		borderRadiusRegExp = new RegExp( '(border-radius' + colon + ')' + signedQuantPattern + '(?:(?:' + sws + signedQuantPattern + ')(?:' + sws + signedQuantPattern + ')?(?:' + sws + signedQuantPattern + ')?)?' +
			'(?:(?:(' + slash + ')' + signedQuantPattern + ')(?:' + sws + signedQuantPattern + ')?(?:' + sws + signedQuantPattern + ')?(?:' + sws + signedQuantPattern + ')?)?' + suffixPattern, 'gi' ),
		borderRadiusCornerRegExp = new RegExp( 'border-(left|right)-(top|bottom)-radius(?:(' + colon + ')(' + posQuantPattern + ')' + sws + '(' + posQuantPattern + '))?' + lookAheadNotOpenBracePattern + lookAheadNotClosingParenPattern, 'gi' ),
		shadowRegExp = new RegExp( '((?:box|text)-shadow' + colon + ')([^;{}]+)', 'gi' ),
		shadowValueRegExp = new RegExp( signedQuantPattern + sws + signedQuantPattern + '([^,;}]*)', 'gi' ),
		transformRegExp = new RegExp( '(transform' + colon + ')([^;{}]+)' + suffixPattern, 'gi' ),
		transformFunctionRegExp = new RegExp( '((?:rotate|translate|skew|scale|matrix)(?:x|y|z|3d)?)(\\(' + _ + ')([^\\)]*?)(' + _ + '\\))', 'gi' ),
		transformOriginRegExp = new RegExp( '(transform-origin' + colon + ')' +
			'(?=((?:top|bottom)' + ws + quantPattern + '|' + quantPattern + ws + '(?:left|right))?)' +
			'(?=((?:left|right)' + ws + quantPattern + '|' + quantPattern + ws + '(?:top|bottom))?)' +
			'(' + edgesPattern + '(?=' + ws + quantPattern + ')|' + quantPattern + ')' +
			'(?:' + sws + '(' + edgesPattern + '|' + quantPattern + '))?', 'gi' ),
		perspectiveOriginRegExp = new RegExp( '(perspective-origin' + colon + ')([^;{}]+)', 'gi' ),
		sizeRegExp = new RegExp( '(max-|min-|[^-a-z])(height|width)' + lookAheadNotLetterPattern + lookAheadNotClosingParenPattern + lookAheadNotOpenBracePattern, 'gi' ),
		writingModeRegExp = new RegExp( '(writing-mode' + colon + ')(tb|bt|rl|lr|horizontal|vertical)-(tb|bt|rl|lr)', 'gi' ),
		resizeRegExp = new RegExp( '(resize' + colon + ')(horizontal|vertical)', 'gi' ),
		xyPropRegExp = new RegExp( '(overflow|scroll-snap-points|scroll-snap-type)-([xy])' + lookAheadNotClosingParenPattern + lookAheadNotOpenBracePattern, 'gi' ),
		mediaQueryRegExp = new RegExp( '(@media' + ws + ')([^{]+)(\\{)', 'gi' ),
		mediaFeatureRegExp = new RegExp( '(width|height|aspect-ratio|orientation)(' + colon + ')([^{/()\\s]+)(?:(' + slash + ')(\\d+))?', 'gi' ),
		// Angle units and their values for full circles.
		angleMaxes = {
			deg: 360,
			grad: 400,
			rad: Math.PI * 2,
			turn: 1
		};

	/**
	 * Generates an array containing numeric versions of the inline-start and block-start of the given direction.
	 * The standard top>right>bottom>left order is used, so lr-tb would be [ 3, 0 ], for example.
	 *
	 * @private
	 * @param {string} dir
	 * @return {Array}
	 */
	function orientationArray( dir ) {
		return dir.split( '-' ).map( function ( dir ) {
			return directions[ dir ];
		} );
	}

	/**
	 * Get the number of digits after the decimal point of a number.
	 *
	 * @private
	 * @param {string|number} value
	 * @return {number}
	 */
	function getPrecision( value ) {
		var valueString = value.toString(),
			decimalIndex = valueString.indexOf( '.' );
		return decimalIndex === -1 ? 0 : valueString.length - decimalIndex - 1;
	}

	/**
	 * Invert the value of a property with a value of the CSS datatype "position".
	 *
	 * @private
	 * @param {string} value
	 */
	function flipPositionValue( value ) {
		var number, precision;
		if ( value.slice( -1 ) === '%' ) {
			number = value.slice( 0, -1 );
			precision = getPrecision( number );
			if ( precision !== 0 ) {
				value = ( 100 - number ).toFixed( precision ) + '%';
			} else {
				value = 100 - number + '%';
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

		return '-' + ( value[ 0 ] === '+' ? value.slice( 1 ) : value );
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
	 * @param {Object} pointMap
	 * @param {Array} array
	 * @param {boolean} turned Whether transformation is such that a three-point value would become four-point.
	 * @return {string}
	 */
	function processFourNotationArray( pointMap, array, turned ) {
		function fourNotationMap( val, index, all ) {
			var d;
			if ( index & 1 ) {
				// If turned, add a space to fit the duplicate final value.
				return val || ( ( index === 5 && turned && all[ 4 ] ) ? ' ' : '' );
			} else {
				if ( !val ) {
					return ( index === 6 && turned && all[ 4 ] ) ? all[ pointMap[ index / 2 ] * 2 ] : '';
				} else {
					d = ( index / 2 );
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
			var source,
				target,
				map,
				cornersMap,
				dirFlipped,
				quarterTurned,
				cornersFlipped,
				reflected,
				flipX,
				flipY,
				noFlipSingleTokenizer,
				noFlipClassTokenizer,
				commentTokenizer,
				calcTokenizer,
				i,
				swapText;

			// Default values
			sourceDir = sourceDir || 'lr-tb';
			targetDir = targetDir || 'rl-tb';

			if ( sourceDir === targetDir ) {
				return css;
			}

			source = orientationArray( sourceDir );
			target = orientationArray( targetDir );
			map = {};
			cornersMap = {};
			// Determine if direction (ltr/rtl) is flipped.
			dirFlipped = ( ( source[ 0 ] ^ target[ 0 ] ) % 3 ) !== 0;
			// Determine if rotated 90deg or 270deg, with or without mirroring.
			// That is, whether height and width are swapped.
			quarterTurned = ( source[ 0 ] & 1 ) !== ( target[ 0 ] & 1 );
			// Determine whether corner axes (ne/sw, nw/se) remain constant.
			cornersFlipped = ( source[ 0 ] + source[ 1 ] ) % 3 !== ( target[ 0 ] + target[ 1 ] ) % 3;
			// Actually flipped, as opposed to just rotated.
			reflected = ( ( source[ 0 ] - source[ 1 ] ) & 3 ) !== ( ( target[ 0 ] - target[ 1 ] ) & 3 );
			// Tokenizers
			noFlipSingleTokenizer = new Tokenizer( noFlipSingleRegExp, noFlipSingleToken );
			noFlipClassTokenizer = new Tokenizer( noFlipClassRegExp, noFlipClassToken );
			commentTokenizer = new Tokenizer( commentRegExp, commentToken );

			for ( i = 0; i < 4; i++ ) {
				map[ target[ i & 1 ] ^ ( i & 2 ) ] = source[ i & 1 ] ^ ( i & 2 );
				cornersMap[ target[ i & 1 ] ^ ( i & 2 ) ] = ( ( ( source[ i & 1 ] ^ ( i & 2 ) ) + reflected ) & 3 );
			}

			// Whether X/Y properties should be flipped (pre-rotation, if applicable).
			flipX = ( map[ 3 ] === 1 || map[ 0 ] === 1 );
			flipY = ( map[ 2 ] === 0 || map[ 1 ] === 0 );

			swapText = ( function () {
				var textChanges = {};

				for ( i = 0; i < 4; i++ ) {
					textChanges[ sides[ map[ i ] ] ] = sides[ i ];
					textChanges[ cursors[ map[ i ] ] ] = cursors[ i ];
					textChanges[ wmDirs[ map[ i ] ] ] = wmDirs[ i ];
				}

				if ( quarterTurned ) {
					textChanges[ 'background-position-y' ] = 'background-position-x';
					textChanges[ 'background-position-x' ] = 'background-position-y';
					textChanges.scaley = 'scalex';
					textChanges.scalex = 'scaley';
					textChanges.skewy = 'skewx';
					textChanges.skewx = 'skewy';
					textChanges.rotatey = 'rotatex';
					textChanges.rotatex = 'rotatey';
					textChanges.translatey = 'translatex';
					textChanges.translatex = 'translatey';
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

				/**
				 * Transform certain property names and values, ex "width" -> "height".
				 *
				 * @param {string} text Text to be transformed.
				 * @return {string}
				 */
				return function swapText( text ) {
					// CSS property names are case insensitive.
					var lcText = text && text.toLowerCase();
					return textChanges[ lcText ] || text || '';
				};
			} )();

			function fourNotation( match, pre, q1, s1, q2, s2, q3, s3, q4, s4 ) {
				return pre + processFourNotationArray( map, [].slice.call( arguments, 2, 9 ), quarterTurned ) + s4;
			}

			function borderImages( match, pre ) {
				return pre +
					processFourNotationArray( map, [].slice.call( arguments,  2,  9 ), quarterTurned ) + ( arguments[ 9 ] || '' ) +
					processFourNotationArray( map, [].slice.call( arguments, 10, 17 ), quarterTurned ) + ( arguments[ 17 ] || '' ) +
					processFourNotationArray( map, [].slice.call( arguments, 18, 25 ), quarterTurned );
			}

			function positionFormat( val ) {
				return val.replace( positionValuesRegExp, function ( match, pre, xPos, xEdge, space1, yPos, yEdge, slash, sizeX, sizeSpace, sizeY ) {
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
								yPos = flipPositionValue( yPos );
							}
						}
						if ( !xEdge && ( map[ 3 ] === 1 || map[ 0 ] === 1 ) ) {
							xPos = flipPositionValue( xPos );
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
			}

			// Tokenize

			// calc() is more complicated than comments, because they can be
			// nested, which can't be handled by normal regular expressions.
			calcTokenizer = ( function ( token ) {
				var matches = [];

				return {
					tokenize: function ( css ) {
						var calcIndex,
							depth,
							lastBracket,
							nextOpen,
							nextClose,
							regex = /(?=((?:-moz-|-webkit-)?calc\())/gi,
							lastCalc;

						outer: for ( ; ( lastCalc = regex.exec( css ) ); ) {
							calcIndex = lastCalc.index;
							lastBracket = calcIndex + lastCalc[ 1 ].length;
							depth = 1;
							for ( ; depth > 0; ) {
								nextOpen = css.indexOf( '(', lastBracket );
								nextClose = css.indexOf( ')', lastBracket );
								if ( nextOpen !== -1 && nextOpen < nextClose ) {
									lastBracket = nextOpen + 1;
									depth++;
								} else if ( nextClose !== -1 ) {
									lastBracket = nextClose + 1;
									depth--;
								} else {
									// Unclosed calc(). Abort.
									continue outer;
								}
							}
							css = css.substring( 0, calcIndex ) +
								// Tokenize the calc(), recording it's index in the token.
								// This is necessary because calcs may be moved around.
								token.replace( /\$1/, matches.push( css.substring( calcIndex, lastBracket ) ) - 1 ) +
								css.substring( lastBracket );
						}
						return css;
					},
					detokenize: function ( str ) {
						var regex = new RegExp( '(-?)' + token.replace( /\$1/, '(\\d+)' ), 'g' );
						return str.replace( regex, function ( match, negative, index ) {
							var calc = matches[ index ];
							if ( negative ) {
								// Flip all values with units.
								calc = calc.replace( quantPlainUnitRegex, flipSign );
							}
							return calc;
						} );
					}
				};
			} )( calcToken );

			css = calcTokenizer.tokenize(
				commentTokenizer.tokenize(
					noFlipClassTokenizer.tokenize(
						noFlipSingleTokenizer.tokenize(
							// We wrap tokens in ` , not ~ like the original implementation does.
							// This was done because ` is not a legal character in CSS and can only
							// occur in URLs, where we escape it to %60 before inserting our tokens.
							css.replace( '`', '%60' )
						)
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
						return swapText( val );
					} ).join( '-' );
				} );
			}
			if ( transformEdgeInUrl ) {
				// Replace 'left', 'top', 'right', and 'bottom' with the appropriate side in background URLs
				css = css.replace( edgeInUrlRegExp, function ( match, pre, edge ) {
					return pre + swapText( edge );
				} );
			}

			// Transform rules
			css = css
				// Flip rules like left: , padding-right: , etc.
				.replace( sidesRegExp, function ( match, prefix, dontRotate, suppressChange, side ) {
					return dontRotate ?
						prefix + dontRotate +
							( !suppressChange && dirFlipped && ( side === 'right' ? 'left' : ( side === 'left' && 'right' ) ) || side )
						:
						prefix + swapText( side );
				} )
				// Transform North/East/South/West in rules like cursor: nw-resize;
				.replace( cursorRegExp, function ( match, pre, ns, ew, nesw, otherCursor ) {
					return pre + (
						otherCursor ?
							swapText( otherCursor )
							:
							( nesw ?
								( cornersFlipped ? nesw === 'sw' ? 'nwse' : 'nesw' : ns + ew + nesw ) :
								swapText( quarterTurned ? ew : ns ) + swapText( quarterTurned ? ns : ew )
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

					return swapText( prop ) + space + positionFormat( val );
				} )
				// Background-position-x and background-position-y
				.replace( bgXYRegExp, function ( match, prop, space, val, suffix ) {
					return (
						// When switching between horizontal and vertical writing, replace
						// background-position-x with -y and vice versa.
						swapText( prop ) +
						// If there's a value, transform it. (No value if in transition statement.)
						( space ? space + val.replace( bgPositionSingleValueRegExp, function ( match, pre, position ) {
							if ( prop === 'background-position-x' ?
								flipX :
								flipY
							) {
								position = flipPositionValue( position );
							}

							return pre + position;
						} ) + suffix : '' )
					);
				} )
				// Background gradients.
				.replace( linearGradientRegExp, function ( match, pre, angleQuant, angleUnitText, space, post ) {
					var angleQuantFloat = parseFloat( angleQuant || 180 ),
						angleUnit = angleUnitText || 'deg',
						angleText = '',
						max = angleMaxes[ angleUnit ],
						addedRotation = map[ 0 ] * max / 4,
						precision;

					if ( angleQuantFloat === 0 && angleUnitText ) {
						// Invalid angle.
						return match;
					}

					precision = Math.max( getPrecision( angleQuant || '0' ), getPrecision( addedRotation ) );
					angleQuant = ( max + ( reflected ? 1 : -1 ) * ( addedRotation - angleQuantFloat ) ) % max;

					// If no angle given, and no necessary angle change, leave unchanged.
					if ( space || angleQuant !== 180 ) {
						angleText = angleQuant.toFixed( precision ) + ( angleQuant === 0 ? angleUnitText : angleUnit ) + ( space || ', ' );
					}

					return pre + angleText + post;
				} )
				.replace( radialGradientRegExp, function ( match, pre, shape, position, post ) {

					if ( shape.indexOf( 'ellipse' ) !== -1 && quarterTurned ) {
						// Swap X and Y sizes.
						shape = shape.replace( twoQuantsRegExp, '$3$2$1' );
					}

					position = position ? positionFormat( position ) : '';

					return pre + shape + position + post;
				} )

				// Border images
				.replace( borderImageRegExp, borderImages )
				// Transforms
				.replace( transformRegExp, function ( match, prop, value, suffix ) {
					return prop + value.replace( transformFunctionRegExp,
						function ( match, prop, start, value, end ) {
							var lcProp = prop.toLowerCase(),
								newProp = swapText( prop ),
								fallbackFirstArg,
								isR3d,
								vals = value.split( /\s*,\s*/g ),
								n;

							switch ( lcProp ) {
								case 'rotate3d':
									isR3d = true;
									if ( vals.length !== 4 ) {
										// Wrong number of arguments, leave it alone.
										return match;
									}
									if ( reflected ) {
										vals[ 2 ] = flipSign( vals[ 2 ] );
									}
									/* falls through */
								case 'translate':
								case 'translate3d':
								case 'skew':
								case 'skewx':
								case 'skewy':
									// Flip/swap first two args
									fallbackFirstArg = '0';

									if ( lcProp.indexOf( 'skew' ) === 0 ) {
										// skew, skewx, skewy.
										if ( flipX ^ flipY ) {
											vals[ 0 ] = flipSign( vals[ 0 ] );
											if ( lcProp === 'skew' ) {
												if ( vals[ 1 ] ) {
													vals[ 1 ] = flipSign( vals[ 1 ] );
												}
											}
										}
										if ( lcProp !== 'skew' ) {
											// skewx and skewy have only one argument, no need to
											// continue on to the swap of vals[ 0 ] and vals[ 1 ].
											break;
										}
									} else {
										// rotate3d, translate, and translate3d.
										// Order is backward for rotate3d.
										// [ 0 ] is _around_ the X axis, meaning only relevant when
										// the Y axis changes, [ 1 ] is around Y, thus only flipped
										// when flipX === true. Also, r3d goes around X and Y in
										// different directions, so quarterTurned requires another
										// flip back sometimes.
										if ( isR3d ? flipY ^ quarterTurned : flipX ) {
											vals[ 0 ] = flipSign( vals[ 0 ] );
										}
										if ( isR3d ? flipX ^ quarterTurned : flipY && vals[ 1 ] ) {
											vals[ 1 ] = flipSign( vals[ 1 ] );
										}
									}

									/* falls through */
								case 'scale':
								case 'scale3d':
									// Just swap first two args

									// scale( 1 ) is null, as opposed to translate( 0 )
									fallbackFirstArg = fallbackFirstArg || '1';

									if ( quarterTurned ) {
										vals[ 0 ] = [ vals[ 1 ], vals[ 1 ] = vals[ 0 ] ][ 0 ] || fallbackFirstArg;
									}
									break;
								case 'rotate':
								case 'rotatez':
									// Just flip, if reflected === true
									if ( reflected === true ) {
										vals[ 0 ] = flipSign( vals[ 0 ] );
									}
									break;
								case 'translatex':
								case 'translatey':
									if ( lcProp.slice( -1 ) === 'x' ? flipX : flipY ) {
										vals[ 0 ] = flipSign( vals[ 0 ] );
									}
									break;
								case 'rotatex':
								case 'rotatey':
									if ( ( ( lcProp.slice( -1 ) === 'x' ) ? flipY : flipX ) ^ quarterTurned ) {
										vals[ 0 ] = flipSign( vals[ 0 ] );
									}
									break;
								case 'skewx':
								case 'skewy':
									if ( flipX ^ flipY ) {
										vals[ 0 ] = flipSign( vals[ 0 ] );
									}
									break;
								case 'matrix':
									n = vals.slice( 0 );
									// Flip translation.
									if ( flipX ) {
										n[ 4 ] = flipSign( n[ 4 ] );
									}
									if ( flipY ) {
										n[ 5 ] = flipSign( n[ 5 ] );
									}
									if ( quarterTurned ) {
										// Swap scale dimensions
										n[ 0 ] = vals[ 3 ];
										n[ 3 ] = vals[ 0 ];
										// Swap translate directions.
										n[ 1 ] = [ n[ 2 ], n[ 2 ] = n[ 1 ] ][ 0 ];
										n[ 4 ] = [ n[ 5 ], n[ 5 ] = n[ 4 ] ][ 0 ];
									}
									// Flip skew values.
									if ( flipX ^ flipY ) {
										n[ 1 ] = flipSign( n[ 1 ] );
										n[ 2 ] = flipSign( n[ 2 ] );
									}

									vals = n;
									break;
							}

							return newProp + start + vals.join( ', ' ) + end;
						}
					) + suffix;
				} )
				.replace( transformOriginRegExp, function ( match, prop, reverseOrder, reverseOrderQT, v1, space, v2 ) {
					var temp,
						isReverseOrder = quarterTurned ? reverseOrderQT : reverseOrder,
						x = isReverseOrder ? v2 : v1,
						y = isReverseOrder ? v1 : v2;

					if ( flipX ) {
						x = flipPositionValue( x );
					}
					if ( flipY && y ) {
						y = flipPositionValue( y );
					}
					if ( quarterTurned ) {
						temp = y;
						y = x;
						x = temp;
					}

					return prop + ( isReverseOrder ?
						( y ? y + space : 'center ' ) + x :
						( x ? x + ( y ? space + y : '' ) : 'center ' + y )
					);
				} )
				.replace( perspectiveOriginRegExp, function ( match, prop, val ) {
					return prop + positionFormat( val );
				} )
				// Writing mode
				.replace( writingModeRegExp, function ( match, prop, inline, block ) {
					return prop +
						// Inline direction
						swapText( inline ) + '-' +
						// Block direction
						swapText( block );
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
						return prop + swapText( value );
					} )
					.replace( xyPropRegExp, function ( match, prop, value ) {
						return prop + '-' + ( value === 'x' ? 'y' : 'x' );
					} )
					.replace( sizeRegExp, function ( match, prefix, prop ) {
						return prefix + swapText( prop );
					} )
					.replace( bgRepeatRegExp, function ( match, prop, value, suffix ) {
						return prop + value.replace( bgRepeatValueRegExp, backgroundTwoPointSwap ) + suffix;
					} )
					.replace( bgSizeRegExp, function ( match, prop, value ) {
						return prop + value.replace( twoQuantsRegExp, backgroundTwoPointSwap );
					} )
					.replace( mediaQueryRegExp, function ( match, prop, value, suffix ) {
						return prop + value.replace( mediaFeatureRegExp, function ( match, prop, space, value, slash, vPixels ) {
							return swapText( prop ) + space +
								( slash ? vPixels + slash + value : swapText( value ) );
						} ) + suffix;
					} )
					.replace( borderImageRepeatRegExp, '$1$4$3$2' )
					.replace( borderRadiusCornerRegExp, 'border-$2-$1-radius$3$6$5$4' );
			}

			// Detokenize
			css = noFlipSingleTokenizer.detokenize(
				noFlipClassTokenizer.detokenize(
					commentTokenizer.detokenize(
						calcTokenizer.detokenize( css )
					)
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
