
import {sack} from "sack.vfs";
const JSOX = sack.JSOX;
import {Events} from "sack.vfs/Events";

const AsyncFunction = Object.getPrototypeOf( async function() {} ).constructor;

//open( { protocol: "userDatabaseClient"
//      , server : "ws://localhost:8089/"
//    } );

const l = {
	expect : new Map(),
	events : {},
	tryAddr:0,
};

let Import = null;

const towers = ["ws://64.23.144.139:8600","wss://d3x0r.org:31337/","wss://www.d3x0r.org:31337/","ws://sp1.d3x0r.org:31337/" /*,"wss://d3x0r-user-database.herokuapp.com/"*/];

console.log( "Service Login started..." );
/*
function expectUser( ws, msg ){
	const id = sack.Id();
	l.expect.set( id, msg );
	ws.send( JSOX.stringify( {op:"expect", rid:msg.id, id:id, addr:config.publicAddress } ) );
}
*/

class Socket extends Events{
	ws = null;
	#towers = [];
	#tower = 0;
	#url = null;
	#protocol = null;
	#opts = null;
	processMessage = null; // default message handler
	constructor( url,protocol,opts ) {
		super();
		this.#url = url;
		this.#protocol = protocol;
		this.#opts = opts;
		this.#towers = opts.towers||towers;
		//console.log( "Constructing new socket..." );
		this.open();
		//console.log( "this opened?" );
	}
	set onmessage(f) { this.on("message",f ) }
	set onclose(f) { this.on("close",f ) }
	set onerror(f) { this.on("error",f ) }
	set onopen(f) { this.on("open",f ) }
	open() {
		// try multiple hosts... 
		const self = this;
		//console.log( "Connecting to URL (from tower?):", this.#url, towers[this.#tower] );
		//console.log( "calling sack open client..", towers );
		if( this.ws ) {
			console.trace( "At least wait until it closes..." );
			return;
		}
	console.trace( "Socket re-open" );
		if( !this.#url ) {
			let tries = 0
			do {
				while( !towers[this.#tower] && this.#tower < towers.length ) this.#tower++;
				if( this.#tower === towers.length ) { if(!tries ) tries++; else { console.log( "No Available Towers..." ); return; } this.#tower = 0; continue;  }
				break;
			} while( 1 );
			console.log( "Trying:", towers[this.#tower], this.#protocol );
			this.ws = sack.WebSocket.Client( towers[this.#tower++], this.#protocol, this.#opts );
		} else      {
			console.log( "opening with a single URL:", this.#url );
			this.ws = sack.WebSocket.Client( this.#url, this.#protocol, this.#opts );
		}

		this.ws.on('open', function(  ) {
			const ws = this;
			self.on( "open", this );
			console.log( "websocket open." );
		} );
		this.ws.on('close', function( a,b) {
			self.on( "close",a,b );
			// if this didn't connect?
			console.log( "websocket closed.",a,b );
		} );
		this.ws.on('error', function(a,b) {
			self.on( "error", a,b );
			console.log( "websocket error." );
		} );
		this.ws.on('message', function( msg ) {
			self.on( "message", msg );
		} );
	}

	send(m) {
		if( "string" === typeof( m ) )
			this.ws.send(m);
		else
			this.ws.send(JSOX.stringify( m ) );
	}
}

/**
* returns a promise that eventualy resolves into a connected client socket
*/
async function open( opts ) {
	const protocol = opts?.protocol || "protocol";
	let resolve;

	return tryOne(  );

	// the call to Socket() steps through the towers to onnect to....
	function tryOne(  ) {

		console.log( "connect protocol:", protocol );
	

		const client = new Socket( null, protocol, { perMessageDeflate: false } );
		//var client = sack.WebSocket.Client( server, protocol, { perMessageDeflate: false } );
		client.on("open", function (ws)  {
			//const ws = this;
			if( resolve )  {
				resolve( client );
				resolve = null; 
			}
			console.log( "Connected (service identification in process; consult config .jsox files)" );
			//console.log( "ws: ", this ); //  ws is also this
			ws.onmessage = ( msg_ )=> {
				const msg = sack.JSOX.parse( msg_ );
				if( msg.op === "addMethod" ) {
					try {
						var f = new AsyncFunction( "Import", "on", "opts", "socket", msg.code );
						const p = f.call( ws, (m)=>(Import?Import(m):import(m)), UserDbRemote.on.bind(UserDbRemote), opts, client );
						p.then( ()=>{
							client.on( "connect", ws );
						} );
						//console.log( "Added methods to socket" )
					} catch( err ) {
						console.log( "Function compilation error:", err,"\n", msg.code );
					}
				}
				else {
					if( client.processMessage && !client.processMessage( msg )  ){
						if( msg.op === "authorize" ) {
							// expect a connection from a user.
							client.on( "authorize", msg.user );
						}
						else {
							console.log( "unknown message Received:", msg );
						}
					}
				}
    		};
		} );

 
		client.on( "close", function( msg ) {
			console.log( "(maybe we don't do this? unopened connection closed, but added timer)" );
			setTimeout( tryOne, 5000 );
		} );


		if( !resolve )
			return new Promise((res,rej)=>{
				resolve=res;
			} );

		return client;
	}
	

} 





function handleMessage( ws, msg ) {
	if( msg.op === "addMethod" ) {
		
	}
}

export class DbRemote extends Events {
	static open(opts) {
		const realOpts = Object.assign( {server:towers}, opts );
		realOpts.protocol= "userDatabaseClient";
		realOpts.authorize = (a)=>{
			console.log( "authorize argument:", a );
		}
		console.log( "Open with real opts? (long promise)", realOpts );
		return open(realOpts);
	}
	set import(val) {
		Import = val;
	}
	
}

export const UserDbRemote = DbRemote;

// return
// return UserDbRemote;//"this usually isn't legal?";
