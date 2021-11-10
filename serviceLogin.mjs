
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

/*
function expectUser( ws, msg ){
	const id = sack.Id();
	l.expect.set( id, msg );
	ws.send( JSOX.stringify( {op:"expect", rid:msg.id, id:id, addr:config.publicAddress } ) );
}
*/

function retryOpen( opts ) {
			if( l.tryAddr < extraAddrs.length ) {
				const newOpts = Object.assign( {}, opts );
				newOpts.server = extraAddrs[l.tryAddr++];				
				return UserDbRemote.open(newOpts );
			} else l.tryAddr = 0; 
	
}

function open( opts ) {
	const protocol = opts?.protocol || "protocol";
	const server = opts.server;
	console.log( "connect with is:", server, protocol );
	var client = sack.WebSocket.Client( server, protocol, { perMessageDeflate: false } );
        let opened = false;
	if( client.readyState < 0 ) {
		//console.log( "Think this is already failed...; part of this is synchronous..." );
		return retryOpen( opts );			
	}
	client.on("open", function ()  {
		const ws = this;
		opened = true;
		console.log( "Connected (service identification in process; consult config .jsox files)" );
		//console.log( "ws: ", this ); //  ws is also this
		this.onmessage = ( msg_ )=> {
			const msg = sack.JSOX.parse( msg_ );
			if( msg.op === "addMethod" ) {
				try {
					var f = new AsyncFunction( "Import", "on",  msg.code );
					const p = f.call( ws, (m)=>(Import?Import(m):import(m)), UserDbRemote.on );
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
	client.on("error", function( a,b){
		console.log( "Is this an error?", a, b );
	} );
	client.on( "close", function( code,reason ) {
		console.log( "Closed..." );
		if( !opened ) {
			console.log( "failed..." );
			retryOpen( opts );			
		} else {
	      		console.log( "connection closed" );
		}
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
		if( !realOpts.server ) realOpts.server = extraAddrs[l.tryAddr++];	
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
