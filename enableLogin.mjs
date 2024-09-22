import {sack} from "sack.vfs" // Id()
export const config = (await import( "file://"+process.cwd()+  "/config.jsox" )).default;
//------------------------
// Login service hook.
import {handleRequest as socketHandleRequest} from "@d3x0r/socket-service";

//const loginCode = sack.HTTPS.get( { port:8089, hostname:"d3x0r.org", path:"serviceLogin.mjs" } );
//  eval( loginCode ); ... (sort-of)
//import {UserDbRemote} from "@d3x0r/user-database-remote";
import {UserDbRemote} from "./serviceLogin.mjs";

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
	config.loginRemote = loginServer.ws.connection.remoteAddress;
	config.loginRemotePort = loginServer.ws.connection.remotePort;
	loginServer.on( "close", ()=>{
		console.log( "Top level close on loginserver (result of userdbremote.open)" );
		
		//loginServer = null;
		setTimeout( async ()=>{
				console.log( "This should have been after 5 seconds..." );
				//loginServer = await UserDbRemote.open( { towers: config.loginTowers } );
				initServer( loginServer );
			}, 5000 );
	} );

}

export function getUser( id ) {
	const user = connections.get( id );
	connections.delete( id ); // one shot ID.
	return user;
}

function expect( msg ) {

	const id = sack.Id();
	const user = msg;
	console.trace( "Told to expect a user: does this result with my own unique ID?", msg, id );
	connections.set( id, user );
	
	// lookup my own user ? Prepare with right object?
	// connections.set( msg.something, msg ) ;	
	return id;
}

export function enableLogin( server, app, expectCb ) {
	if( expectCb )
		UserDbRemote.on( "expect", expectCb );
	else
		UserDbRemote.on( "expect", expect );

	server.addHandler( socketHandleRequest );
	// handle /internal/loginServer request
	app.get( /\/internal\//, (req,res)=>{
		const split = req.url.split( "/" );
		//console.log( "Resolve internal request:", split );
		switch( split[2] ) {
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
				res.writeHead( 503, {'Content-Type': "text/javascript" } );
				res.end( "export default "+JSON.stringify( {loginRemote:config.loginRemote, loginRemotePort:config.loginRemotePort} ) );

			}else {
				res.writeHead( 200, {'Content-Type': "text/javascript" } );
				res.end( "export default "+JSON.stringify( {loginRemote:config.loginRemote, loginRemotePort:config.loginRemotePort} ) );
			}
			return true;
		}
	} );

	UserDbRemote.open( { port:server.serverOpts.port, towers: config.loginTowers } ).then( (loginServer)=>{
		initServer(loginServer );
	});
	
}
