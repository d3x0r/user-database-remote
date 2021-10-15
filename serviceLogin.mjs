
import {sack} from "sack.vfs";
//import config from "./config.jsox";

const AsyncFunction = Object.getPrototypeOf( async function() {} ).constructor;

//open( { protocol: "userDatabaseClient"
//      , server : "ws://localhost:8089/"
//    } );

const l = {
	expect : new Map(),
	events : {},
};

let Import = null;

/*
function expectUser( ws, msg ){
	const id = sack.Id();
	l.expect.set( id, msg );
	ws.send( JSOX.stringify( {op:"expect", rid:msg.id, id:id, addr:config.publicAddress } ) );
}
*/

function open( opts ) {
	const protocol = opts?.protocol || "protocol";
	const server = opts.server;
	console.log( "connect with is:", server, protocol );
	var client = sack.WebSocket.Client( server, protocol, { perMessageDeflate: false } );
        
	client.on("open", function ()  {
		const ws = this;
		console.log( "Connected (service identification in process; consult config .jsox files)" );
		//console.log( "ws: ", this ); //  ws is also this
		this.onmessage = ( msg_ )=> {
			const msg = sack.JSOX.parse( msg_ );
			if( msg.op === "addMethod" ) {
				try {
					var f = new AsyncFunction( "Import", msg.code );
					const p = f.call( ws, (m)=>(Import?Import(m):import(m)) );
					p.then( ()=>{
						ws.on( "connect", ws );
					} );
				} catch( err ) {
					console.log( "Function compilation error:", err,"\n", msg.code );
				}
			}
			else {
				if( this.processMessage && !this.processMessage( msg )  ){
					if( msg.op === "authorize" ) {
						// expect a connection from a user.
						ws.on( "authorize", msg.user );
					}
					else {
						console.log( "unknown message Received:", msg );
					}
				}
			}
       		};
		this.on( "close", function( code,reason ) {
			UserDbRemote.on("close", {ws:ws, code:code, reason:reason } );
	        } );
	} );

	client.on( "close", function( msg ) {
      		console.log( "unopened connection closed" );
	} );
	return client;
} 




function handleMessage( ws, msg ) {
	if( msg.op === "addMethod" ) {
		
	}
}

export const UserDbRemote = {
	open(opts) {
		const realOpts = Object.assign( {}, opts );
		realOpts.protocol= "userDatabaseClient";
		if( !realOpts.server ) realOpts.server = "wss://d3x0r.org:8089/";	
		realOpts.authorize = (a)=>{
			console.log( "authorize argument:", a );
		}
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
