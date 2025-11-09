//import {openSocket as ChainProtocol} from "./chainreact.js"
//import {popups} from "/node_modules/@d3x0r/popups/popups.mjs"
import {Protocol} from "sack.vfs/client-protocol"

const l = {
	login : null,
	ws : null,
};
import {sack} from "sack.vfs"
const JSOX=sack.JSOX;
//import {connection,Alert,openSocket} from "/login/webSocketClient.js";
let loginServer = (await import( "http://localhost:5542/internal/loginServer" )).default;
console.log( "Server:", loginServer );
//import loginServer from "/internal/loginServer";
const defaultServer = ("https://"+loginServer.loginRemote+":"+loginServer.loginRemotePort);
const loginInterface = defaultServer + "/login/webSocketClient.js";

let n = 0;
let loginDone = false;


//import {popups,AlertForm} from "../popups.mjs"
//const JSOX = JSON;

// right now this gets loaded via proxy, and sent from the origin website, 
// this means any dependancies are from the client website, unless otherwise hardcoded here.
// 

//const origin = "https://d3x0r.org:8089"

const here = new URL(import.meta.url);
// file:/// isn't going to work... 

//console.log( "Origin? Meta?", location, import.meta, here );

//console.log( "location:", location, import.meta );

const towers = [defaultServer.replace('http','ws'),
	//location.protocol.replace("http", "ws") + "//" + location.host + "/",
	//"wss://app.d3x0r.org:8399/",
	"wss://poopfixer.com:8399/",

];

const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

function Alert( message ) {
	//console.trace( "Alert called?", message );
}

class LocalStorage {
	map = new Map();
	constructor() {
	}
	setItem(a,b) {
		this.map.set(a,b);
	}
	getItem(a,b) {
		this.map.get(a,b);
	}
}

const localStorage = new LocalStorage();

export class LoginClient extends Protocol {
	waitRes = null;
	wait = new Promise( (res,rej)=>{
		this.waitRes = res;
	} );
	#connecting = [];

	constructor(  ) {
		super( null, "login" );
		console.log( "Login Client created!" );
		super.processMessage = (ws,msg, _msg)=>{
			//const _msg = JSOX.parse( msg );
			//console.log( "new process message:", ws, msg );
			if( ws.processMessage && ws.processMessage( ws, msg ) ) return true;
			//console.log( "op:", msg.op, this );
			if( !this.on( msg.op, [ws,msg] ) ){
				console.log( "serviceClientLogin.mjs:Unhandled message:", msg );
			}
			return true;
		}
		this.on( "open", (ws, evt)=>{
			let idx = this.#connecting.findIndex( c=>c.ws===ws );
			console.log( "login client connected to something..." );
			if( idx >= 0 ) {
				this.ws = ws;
				l.ws = ws;
				this.address = this.#connecting[idx].tower;
				//console.log( "remove myself from list of connecting", ws );
				this.#connecting.splice( idx, 1 );
			}
			//console.log( "and close remaining..." );
			for( let ws of this.#connecting ) {
				ws.ws.close( 3000, "nevermind" );
			}
			this.#connecting.length = 0;
		} );
		this.on( "close", (ws, code, reason)=>{
			console.log( "Close happened?", ws, code, reason );
			let idx = this.#connecting.findIndex( c=>c.ws===ws );
			if( idx >= 0 )
				this.#connecting.splice( idx, 1 );
		} );

		this.on( "addMethod", (ws,msg)=> {
			try {
				// why is this not in a module?
				//console.log( "add Method was given to us...", msg.code );
				var f = new AsyncFunction("JSON", "Import", "connector", "Alert", "localStorage", msg.code);
				const p = f.call(ws, JSOX, (i) => import(defaultServer+ i), l, Alert, localStorage);
				l.connected = true;
				l.ws = ws;
				l.ws.on("close", (code,reason)=>{
					console.log( "Connection ended... ", code, reason ); 
					console.log( "Suppose we still need to connect?" );
					this.on( "close", [code,reason] );
	   
				})
				if (l.loginForm) l.loginForm.connect();
				// result should trigger normal events in login form to close.
				p.then( ()=>{
					ws.resume();
					this.waitRes( true );
				});
			} catch (err) {
				console.log("Function compilation error:", err, "\n", msg.code);
			}
		} );

		this.beginConnect();
	}

	beginConnect() {
		// one of the tower servers should answer...
		// but we want to try them all...

		// as they fail they will fall off or auto reconnect...
		// also need to be able to close this connection once connected.
		//console.log( "connecting to all towers..." );

		for( let tower of towers ) {
			this.address = tower;
			const ws = this.connect();
			if( ws )  this.#connecting.push( {tower,ws} );
			this.ws = null;  // have to clear this or next connect will close the first...
		}
		
	}

	idle() {
		this.ws.close( 3001, "Going to Idle." );
	}

	guestLogin( name ) {
		return this.wait.then( ()=>{
			return this.ws.doGuest(name);
		} );
	}

	login( name, pass ) {
		return this.wait.then( ()=>{
			//console.log( "this is what?", this );
			return this.ws.doLogin(name, pass);
		} );
	}

	create( display, account, password, email ) {
		return this.wait.then( ()=>{
			return this.ws.doCreate( display, account, password, email );
		} );
	}	

	request(domain, service) {
		return this.wait.then( ()=>{
			return this.ws.request(domain, service);
		} );
	}

}

async function pickSash(ws, choices) {
	if (l.loginForm && l.loginForm.pickSash) {
		const choice = await l.loginForm.pickSash(msg.choices);
		if (choice)
			ws.send({ op: "pickSash", ok: true, sash: choice });
		else
			ws.send({ op: "pickSash", ok: false, sash: "User Declined Choice." });
	}
	ws.send({ op: "pickSash", ok: false, sash: "Choice not possible." });
}

function status( msg, arg ) {
	if( "string" ===typeof( msg ) ) {
		console.log( "Service worker sent status:", msg );
	} else if( msg === true ) {
		console.log( "Opening socketid:", arg );
	}
}


export default LoginClient; 