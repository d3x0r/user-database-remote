
import {sack} from "sack.vfs";
//import config from "./config.jsox";

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

const extraAddrs = ["wss://d3x0r.org:8089/","wss://www.d3x0r.org:8089/"/*,"wss://d3x0r-user-database.herokuapp.com/"*/];
const towers = ["ws://64.23.144.139:8600","wss://d3x0r.org:8089/","wss://www.d3x0r.org:8089/"/*,"wss://d3x0r-user-database.herokuapp.com/"*/];

console.log( "Service Login started..." );
/*
function expectUser( ws, msg ){
	const id = sack.Id();
	l.expect.set( id, msg );
	ws.send( JSOX.stringify( {op:"expect", rid:msg.id, id:id, addr:config.publicAddress } ) );
}
*/

class Socket {
	ws = null;
	#events = { open:[],message:[],close:[],error:[],connect:[] };
	#tower = 0;
	#url = null;
	#protocol = null;
	#opts = null;
	constructor( url,protocol,opts ) {
		this.#url = url;
		this.#protocol = protocol;
		this.#opts = opts;
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
		this.ws.send(m);
	}
	on(e,f,g) {
		if( "function" === typeof f ) {
			this.#events[e].push(f);
		} else {
			if( e in this.#events ) this.#events[e].forEach( evt=>evt(f,g) );
		}
	}
}

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
						var f = new AsyncFunction( "Import", "on", "opts", msg.code );
						const p = f.call( ws, (m)=>(Import?Import(m):import(m)), UserDbRemote.on, opts );
						p.then( ()=>{
							client.on( "connect", ws );
						} );
					} catch( err ) {
						console.log( "Function compilation error:", err,"\n", msg.code );
					}
				}
				else {
					if( ws.processMessage && !ws.processMessage( msg )  ){
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
			ws.on( "close", function( code,reason ) {
				client.on("close", {ws:ws, code:code, reason:reason } );
		        } );
		} );

		client.on( "close", function( msg ) {
			
			console.log( "(maybe we don't do this? unopened connection closed" );
			tryOne();
		
		} );
		if( !resolve )
			return new Promise((res,rej)=>{
				resolve=res;
			} );

	}
	//res(client );
	
	return client;

} 





function handleMessage( ws, msg ) {
	if( msg.op === "addMethod" ) {
		
	}
}

export const UserDbRemote = {
	open(opts) {
		const realOpts = Object.assign( {server:towers}, opts );
		realOpts.protocol= "userDatabaseClient";
		//if( !realOpts.server ) realOpts.server = extraAddrs[l.tryAddr++];	
		realOpts.authorize = (a)=>{
			console.log( "authorize argument:", a );
		}
		console.log( "Open with real opts?", realOpts );
		return open(realOpts);
	},
	on( evt, d ) {
		if( "function" === typeof d ) {
			if( evt in l.events ) l.events[evt].push(d);
			else l.events[evt] = [d];
		}else {
			if( evt in l.events ) l.events[evt].forEach( cb=>cb() );
		}
	},
	set import(val) {
		Import = val;
	}
}

// return
// return UserDbRemote;//"this usually isn't legal?";
