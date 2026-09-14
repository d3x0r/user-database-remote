import {sack} from "sack.vfs" // Id()
import {Events} from "sack.vfs/Events2" 

const disk = sack.Volume();
//const parts = import.meta.url.split('/'); 
//console.log( "split:", parts );

export const config = (await (import( "file://"+process.cwd()+  "/config-login-service.jsox" ).catch(err=>{ return {default:{}}; }))).default;
//------------------------
// Login service hook.
import {handleRequest as socketHandleRequest} from "@d3x0r/socket-service";

const towers = process.env.LOGIN_TOWERS?sack.JSOX.parse( process.env.LOGIN_TOWERS ): config.loginTowers;
//const loginCode = sack.HTTPS.get( { port:8089, hostname:"d3x0r.org", path:"serviceLogin.mjs" } );
//  eval( loginCode ); ... (sort-of)
//import {UserDbRemote} from "@d3x0r/user-database-remote";
import {UserDbRemote} from "./serviceLogin.mjs";
export {UserDbRemote}

UserDbRemote.import = (a)=>{ return import(a)} ;

// request for user to get unique ID from service.
//UserDbRemote.on( "expect", expect );

const connections = new Map();

function initServer( loginServer ) {
	// this = undefind
	// loginServer is class Socket
	//console.log( "So login server close I should be able to on?", this, loginServer );
	//console.log( "loginserver:", loginServer, loginServer&&loginServer.ws&&loginServer.ws.connection );
	if( !loginServer ) {
		console.trace( "login server isn't passed to us?", loginServer );
		return;
	}
	if( !loginServer.ws ) {
		console.log( "It disconnected even as it was created?");
		return;
	}
	//console.log( "init Server got us:", loginServer.ws.connnection, config )
	config.loginRemote = config.loginRemote || loginServer.ws.connection.remoteAddress;
	config.loginRemotePort = config.loginRemotePort || loginServer.ws.connection.remotePort;

}

export function getUser( id ) {
	const user = connections.get( id );
	connections.delete( id ); // one shot ID.
	return user;
}

function expect( msg ) {
	const id = sack.Id();
	connections.set( id, msg );
	return id;
}

export function enableLogin( server, app, expectCb ) {

	server.addHandler( socketHandleRequest );
	// handle /internal/loginServer request
	app = app || server.app;
	app.get( /\/internal\//, (req,res,next)=>{
		const split = req.url.split( "/" );
		console.log( "Resolve internal request:", split, config );
		switch( split[2] ) {
		case "requestService.js" : {
			// The provider-neutral entry a page imports: one requestService()
			// whose defaults are this service's own identity (service.jsox),
			// so the page need not know it is talking to the user database.
			// The real module is the package file, served from node_modules.
			const svc = serviceIdentity();
			const wrapper = [ 'import { requestService as udbRequestService, firstConnect, reConnect, wait, wsc } from "/node_modules/@d3x0r/user-database-remote/requestService.js";'
			                , 'export const domain = ' + JSON.stringify( svc.domain ) + ';'
			                , 'export const service = ' + JSON.stringify( svc.service ) + ';'
			                , 'export function requestService( d, s, cb ) { return udbRequestService( d || domain, s || service, cb ); }'
			                , 'export { firstConnect, reConnect, wait, wsc };'
			                , '' ].join( "\n" );
			res.writeHead( 200, {'Content-Type': "text/javascript", 'Cache-Control': "no-cache", 'Access-Control-Allow-Origin' : req.connection.headers.Origin || "*" } );
			res.end( wrapper );
			return true;
		}
		case "gsi-client":
			console.log( "fetching google client api?" );

			const googleLoginResponse = sack.HTTPS.get( {hostname:"accounts.google.com", path:"/gsi/client", preferV4:true, version:"1.1", headers:{
				Accept: "*/*",
				"Accept-Encoding": "identity",
				Connection: "close",
				//"User-Agent":"Wget/1.21.4",
				"User-Agent":req.headers["User-Agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
			} });
			const googleLoginOrig = googleLoginResponse.content;
			const googleLogin = ["export default function (document) {\n", googleLoginOrig, "}"].join('');
			
			res.writeHead( 200, {'Content-Type': "text/javascript", 'Access-Control-Allow-Origin' : req.connection.headers.Origin  } );
			res.end( googleLogin );
			return true;
		case "towers":
			res.writeHead( 200, {'Content-Type': "text/json", 'Access-Control-Allow-Origin' : req.connection.headers.Origin } );
			res.end( JSON.stringify( towers ) );
			return true;
		case "loginServer":
			if( !config.loginRemote ) {
				if( UserDbRemote.connecting ) {
					console.log( "Still connecting... need to defer getting results");
				}else if( UserDbRemote.connected ) {
					console.log( "connected, and should be negatiating already... " );
				} else if( UserDbRemote.timeout ) {
					console.log( "my connection is waiting in a timeout");
				}else
					console.log( "Not Connecting??");
				console.log( "I don't have a good connection?", config );
				res.writeHead( 503, {'Content-Type': "text/javascript", 'Access-Control-Allow-Origin' : req.connection.headers.Origin } );
				res.end( "export default "+JSON.stringify( {loginRemote:config.loginRemote, loginRemotePort:config.loginRemotePort} ) );

			}else {
				res.writeHead( 200, {'Content-Type': "text/javascript", 'Access-Control-Allow-Origin' : req.connection.headers.Origin } );
				res.end( "export default "+JSON.stringify( {loginRemote:config.loginRemote, loginRemotePort:config.loginRemotePort} ) );
			}
			return true;
		}
		return next();
	} );
	const loginInterface = new LoginInterface(server);
	if( "function" === typeof( expectCb ) )
		loginInterface.expect = expectCb;	
	else
		loginInterface.expect = expect;	
	return loginInterface;
}


// This service's own name for the user database: service.jsox in the working
// directory, the same file serviceDbMethods registers with.  Absent, the
// wrapper served above has no defaults and a page has to name the service.
function serviceIdentity() {
	try {
		const src = disk.read( "service.jsox" );
		if( src ) {
			const svc = sack.JSOX.parse( src.toString() );
			return { domain: svc.domain || null, service: svc.service || null };
		}
	} catch( err ) {
		console.log( "service.jsox not readable for login defaults:", err.message || err );
	}
	return { domain: null, service: null };
}

class LoginInterface extends Events {
	#expect = null;;
	set expect( val ) {
		UserDbRemote.off( "expect", this.#expect );
		UserDbRemote.on( "expect", val );
		this.#expect = val;
	}
	get expect() {
		return this.#expect;
	}

	constructor(server) {
		super();

		UserDbRemote.open( { port:server.serverOpts.port, towers } ).then( initServer );

	}

	// Same call on every provider: who is this key?  Here the answer is
	// already local - the expect handler stored it when the login server asked
	// us to expect the user - so this is just the one-shot lookup, async for
	// parity with providers that have to go and ask.
	async getUser( id ) {
		return getUser( id ) || null;
	}
}