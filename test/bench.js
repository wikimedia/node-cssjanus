'use strict';
/* eslint no-process-exit:"off" */

const crypto = require( 'crypto' );
const fs = require( 'fs' );
const https = require( 'https' );
const cssjanus = require( '../' );

const baseBench = {
	name: '',
	started: NaN,
	start: function ( name ) {
		this.name = name;
		this.started = process.hrtime();
	},
	end: function ( ops ) {
		const elapsed = process.hrtime( this.started );
		if ( elapsed[ 0 ] === 0 && elapsed[ 1 ] === 0 ) {
			throw new Error( 'insufficient clock precision for short benchmark' );
		}
		const time = elapsed[ 0 ] + elapsed[ 1 ] / 1e9;
		const rate = ops / time;
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
	let redirects = 0;
	return new Promise( function ( resolve, reject ) {
		https.get( url, function handleResponse( res ) {
			let data = '';
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
		} ).on( 'error', function ( err ) {
			reject( err );
		} );
	} );
}

async function getFixture( name, sha1, url ) {
	const file = __dirname + '/fixture.' + name + '.dat';
	let data;

	try {
		data = fs.readFileSync( file, 'utf8' );
		if ( checksum( 'sha1', data ) === sha1 ) {
			return data;
		}
	} catch ( e ) {
		// Ignore
	}

	data = await fetch( url );
	data = Buffer.from( data, 'base64' ).toString( 'utf8' );

	if ( checksum( 'sha1', data ) !== sha1 ) {
		return Promise.reject( new Error( 'Checksum mis-match' ) );
	}

	fs.writeFileSync( file, data );

	return data;
}

async function benchFixture( fixture ) {
	const data = await getFixture( fixture.name, fixture.sha1, fixture.src );
	const ops = 10_000;
	const bench = Object.create( baseBench );
	let i = ops;
	bench.start( fixture.name );
	while ( i-- ) {
		cssjanus.transform( data );
	}
	bench.end( ops );
}

async function main() {
	const fixtures = [
		{
			name: 'mediawiki',
			sha1: '6277eb6b3ce25e2abcaa720f5da1b979686ea166',
			src: 'https://gerrit.wikimedia.org/g/mediawiki/core/+/10644263276ab941b19d2365e16813bd57e9d1f5/resources/src/mediawiki.legacy/shared.css?format=TEXT'
		},
		{
			name: 'ooui',
			sha1: 'b6f7ebc0e26c53617284d3f3a99552f9ffbf85fa',
			src: 'https://gerrit.wikimedia.org/g/mediawiki/core/+/130344b47ad939114400d2d0dfbc4018d6d2b5a9/resources/lib/oojs-ui/oojs-ui-core-wikimediaui.css?format=TEXT'
		}
	];
	for ( const fixture of fixtures ) {
		await benchFixture( fixture );
	}
}

main().catch( function ( err ) {
	console.error( err );
	process.exit( 1 );
} );
