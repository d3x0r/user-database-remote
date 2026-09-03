//import {openSocket as ChainProtocol} from "./chainreact.js"
import {popups} from "/node_modules/@d3x0r/popups2/popups.js"
const l = {
	login : null,
};

//import {connection,Alert,openSocket} from "/login/webSocketClient.js";
import loginServer from "/internal/loginServer";
const loginEndpoint = ("https://"+loginServer.loginRemote+":"+loginServer.loginRemotePort) || "https://d3x0r.org:8089";
const loginInterface = loginEndpoint + "/login/webSocketClient.js";
const {makeLoginForm} = await ( import( loginEndpoint + "/login/login-form.js" ).catch( (err)=>{
		return import( loginEndpoint.replace("https", "http" )+ "/login/login-form.js" );
	} ) );

let n = 0;
let loginDone = false;

let requestedDomain = null;
let requestedService = null;
let gotService = null;

export async function firstConnect() {
	if( wsc ) {
		beginLogin( requestedDomain, requestedService, wsc.openSocket, wsc.connection ).then( ( arg )=>{
			console.log( "login completed?", arg );
		});
		return wsc;
	}
	return await import( loginInterface+"?"+n++ ).then( (module)=>{
		//console.log("Thing:", module );
		return beginLogin( requestedDomain, requestedService, module.openSocket, module.connection ).then( ()=>{return module} );
	} ).catch( (err)=>{
		//console.log( "err:", err );
		return new Promise( (res,rej)=>{
			setTimeout( ()=>firstConnect().then( res ), 5000 );
		} );
	} );
}
// gets login interface from login server
// blocks until a connection happens - should be a temporary thing that it blocks...
let waitFail = null;
let waitOk = null;
export let wait = new Promise( (res,rej)=>{
	waitOk = res; waitFail = rej;
});
export let wsc = null;

export function reConnect() {
	if( !requestedDomain || !requestedService ) throw new Error( "Please request a service before reconnecting!");
	beginLogin( requestedDomain, requestedService, wsc.openSocket, wsc.connection ).then( (arg)=>{
		console.log( "Reconnected, login resolved?", arg );
	} );
}
//import {connection,Alert,openSocket} from "/login/webSocketClient.js";
export async function requestService( domain, service, onGotService ) {
	gotService = onGotService;
	requestedDomain = domain; requestedService = service;
	if( !wsc ) {
		wsc = await firstConnect();
		waitOk( wsc );
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

		connection.on( "login", (arg)=>{
			// login completed OK... we don't know anything other then "yes", but now request.
			console.log( "Login with arg:", arg );
			connection.loginForm.login(arg);
		})
		connection.on( "create", (arg)=>{
			// login completed OK... we don't know anything other then "yes", but now request.
			console.log( "create with arg:", arg );
			connection.loginForm.login(arg);
		})
		connection.on( "guest", (name)=>{
			// login completed OK... we don't know anything other then "yes", but now request.
			//console.log( "guest with arg:", name );
			connection.loginForm.login(name);
		})
		connection.loginForm = makeLoginForm( (passFail)=>{
			if( !passFail ) {
				console.log( "login failed, or service lookup failed, or request to service instance was disconnected...")
				return;
			}
			let tries = 0;
				function retry() {
					tries++;
					if( tries > 3 ){ console.log( "stop trying?" );return;}
					connection.request( domain, service ).then( (token)=>{
						;
						// token.name
						// token.svc: { addr:{addr:[ {address},... ], port:"1234"},key:[] }
						//console.log( "module request:", token );
						l.login = token; // this is 'connection' also.
						connection.loginForm.hide();
						if( token.svc ) {
							socket.close( 1000, "Thank You."); // done with the login socket only once we have a service
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
			
			, { wsLoginClient:connection
			  , useForm: (location.protocol + "//"+loginServer.loginRemote+":"+loginServer.loginRemotePort) + "/login/loginForm.html"
			  , parent: document.getElementById( "game" )
			  , addScriptsToBody : true
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
