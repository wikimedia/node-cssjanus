/* eslint one-var:["error","never"], no-console:"off" */
/* global Promise */
var crypto = require( 'crypto' );
var fs = require( 'fs' );
var https = require( 'https' );
var cssjanus = require( '../' );

var baseBench = {
	name: '',
	started: NaN,
	start: function ( name ) {
		this.name = name;
		this.started = process.hrtime();
	},
	end: function ( ops ) {
		var time;
		var rate;
		var elapsed = process.hrtime( this.started );
		if ( elapsed[ 0 ] === 0 && elapsed[ 1 ] === 0 ) {
			throw new Error( 'insufficient clock precision for short benchmark' );
		}
		time = elapsed[ 0 ] + elapsed[ 1 ] / 1e9;
		rate = ops / time;
		this.report( rate, time );
	},
	report: function ( rate, time ) {
		console.log( 'Bench ' + this.name +
			': ' + rate.toFixed( 0 ) + ' op/s in ' +
			time.toFixed( 1 ) + 's'
		);
	}
};

function checksum( algorithm, str ) {
	return crypto
		.createHash( algorithm )
		.update( str, 'utf8' )
		.digest( 'hex' );
}

function fetch( url ) {
	var redirects = 0;
	return new Promise( function ( resolve, reject ) {
		https.get( url, function handleResponse( res ) {
			var data = '';
			// Handle redirect
			if ( res.statusCode === 301 || res.statusCode === 302 ) {
				if ( !res.headers.location ) {
					reject( new Error( 'Redirect without location' ) );
					return;
				}
				redirects++;
				if ( redirects > 1 ) {
					reject( new Error( 'Too many redirects' ) );
					return;
				}
				https.get( res.headers.location, handleResponse );
				res.resume();
				return;
			}
			// Handle http error
			if ( res.statusCode !== 200 ) {
				reject( new Error( 'HTTP ' + res.statusCode ) );
				res.resume();
				return;
			}
			res.setEncoding( 'utf8' );
			res.on( 'data', function ( chunk ) {
				data += chunk;
			} );
			res.on( 'end', function () {
				resolve( data );
			} );
		} ).on( 'end', function ( err ) {
			reject( err );
		} );
	} );
}

function getFixture( name, sha1, url ) {
	var data;
	var pData;
	var fetched;
	var file = __dirname + '/fixture.' + name + '.dat';
	try {
		data = fs.readFileSync( file, 'utf8' );
		if ( checksum( 'sha1', data ) !== sha1 ) {
			fetched = true;
			pData = fetch( url );
		} else {
			// re-use cached fixture
			pData = Promise.resolve( data );
		}
	} catch ( e ) {
		fetched = true;
		pData = fetch( url );
	}
	return pData.then( function ( data ) {
		if ( fetched ) {
			if ( checksum( 'sha1', data ) !== sha1 ) {
				return Promise.reject( new Error( 'Checksum mis-match' ) );
			}
			fs.writeFileSync( file, data );
		}
		return data;
	} );
}

function benchFixture( fixture ) {
	return getFixture( fixture.name, fixture.sha1, fixture.src )
		.then( function ( data ) {
			var ops = 1000;
			var i = ops;
			var bench = Object.create( baseBench );
			bench.start( fixture.name );
			while ( i-- ) {
				cssjanus.transform( data );
			}
			bench.end( ops );
		} );
}

function benchFixtures() {
	var fixtures = [
		{
			name: 'mediawiki',
			sha1: '6277eb6b3ce25e2abcaa720f5da1b979686ea166',
			src: 'https://github.com/wikimedia/mediawiki/raw/1064426/resources/src/mediawiki.legacy/shared.css'
		},
		{
			name: 'ooui',
			sha1: 'b6f7ebc0e26c53617284d3f3a99552f9ffbf85fa',
			src: 'https://github.com/wikimedia/mediawiki/raw/130344b/resources/lib/oojs-ui/oojs-ui-core-wikimediaui.css'
		}
	];
	function next( fixture ) {
		return benchFixture( fixture ).then( function () {
			if ( fixtures[ 0 ] ) {
				return next( fixtures.shift() );
			}
		} );
	}
	return next( fixtures.shift() );
}

benchFixtures().catch( function ( err ) {
	console.error( err );
	process.exit( 1 );
} );
