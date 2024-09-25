//import {openSocket as ChainProtocol} from "./chainreact.js"
import {popups} from "/node_modules/@d3x0r/popups/popups.mjs"
const l = {
	login : null,
};

//import {connection,Alert,openSocket} from "/login/webSocketClient.js";
import loginServer from "/internal/loginServer";
const loginInterface = ( ("https://"+loginServer.loginRemote+":"+loginServer.loginRemotePort) || "https://d3x0r.org:8089" ) + "/login/webSocketClient.js";

let n = 0;
let loginDone = false;

let requestedDomain = null;
let requestedService = null;
let gotService = null;

export async function firstConnect() {
	if( wsc ) {
		beginLogin( requestedDomain, requestedService, wsc.openSocket, wsc.connection );
		return wsc;
	}
	return await import( loginInterface+"?"+n++ ).then( (module)=>{
		//console.log("Thing:", module );
		beginLogin( requestedDomain, requestedService, module.openSocket, module.connection );
		return module;
	} ).catch( (err)=>{
		//console.log( "err:", err );
		return new Promise( (res,rej)=>{
			setTimeout( ()=>firstConnect().then( res ), 5000 );
		} );
	} );
}
// gets login interface from login server
// blocks until a connection happens - should be a temporary thing that it blocks...
let wsc = null;

export function reConnect() {
	if( !requestedDomain || !requestedService ) throw new Error( "Please request a service before reconnecting!");
	beginLogin( requestedDomain, requestedService, wsc.openSocket, wsc.connection );
}
//import {connection,Alert,openSocket} from "/login/webSocketClient.js";
export async function requestService( domain, service, onGotService ) {
	gotService = onGotService;
	requestedDomain = domain; requestedService = service;
	if( !wsc ) {
		wsc = await firstConnect();
	} else {
		console.log( "This should be a reconnect....")
	}
	//return beginLogin( requestedDomain = domain, requestedService = service, wsc.openSocket, wsc.connection );
}


function beginLogin( domain, service, openSocket, connection ) {
	// uses socket-service websocket connection to login to the server.
	return openSocket().then( (socket)=>{
		//console.log( "Open socket finally happened?", socket );
		socket.setUiLoader();
		connection.on( "close", (code, reason)=>{
			if( !l.login ) {
				console.log( "Closed login before login; refresh page" );
				location.href=location.href;
			} else {
				console.log( "Let GC have this socket, auth is already done" );
			}
		} ) 

		connection.loginForm = popups.makeLoginForm( (token)=>{
			if( !token ) {
				console.log( "login failed, or service lookup failed, or request to service instance was disconnected...")
				return;
			}
			let tries = 0;
				function retry() {
					tries++;
					if( tries > 3 ){ console.log( "stop trying?" );return;}
					console.log( "login completed...", token.name, token.svc&&token.svc.key );
					connection.request( domain, service ).then( (token)=>{
						;
						console.log( "module request:", token );
						l.login = token; // this is 'connection' also.
						connection.loginForm.hide();
						socket.close( 1000, "Thank You."); // close the login socket.
						if( token.svc ) {
							if( gotService )
								gotService( token );
							else
								console.log( "event callback for a new service request wasn't configured!" );
						}else {
							console.log( "Service wasn't given to us?")
							retry();
						}
							// failed to get service, try again.
					} );
				}
				retry();
			}
			
			, {wsLoginClient:connection ,
				useForm: (location.protocol + "//"+loginServer.loginRemote+":"+loginServer.loginRemotePort) + "/login/loginForm.html",
				parent: document.getElementById( "game" )
				
			} );
	
		
		connection.resume( ()=>{
			// on fail
			// else is a good login, and form events should trigger.
			connection.loginForm.show();
			connection.loginForm.center();
		})
		return socket;
	} );

}
