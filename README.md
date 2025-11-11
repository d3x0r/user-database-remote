# User Database Remote

This is a Node package to connect a node service to login services.

Service client code for https://github.com/d3x0r/user-database https://npmjs.com/package/@d3x0r/user-database

This reads configuration files 'service.jsox' and 'badges.jsox' and connects to login services.

```
import {UserDbRemote} from "user-database-remote"

const socket = UserDbRemote.open( );
socket.on( "expect", expect );
socket.on( "authorize", authorize );


function expect( msg ) {
	/* called when a user is going to connect */
	return true; // returning false will abort the client's request.
}

function authorize( user ) {
	/* something? */
	return true;  
}

// socket will have methods available for communicating with login service.


```

# Simple Server Modifications

`enableLogin` uses `@d3x0r/user-database-remote` internally... but this ends
up being a lot of boiler plate code which can be simplified to a simple function
or two.

``` js
import {sack} from "sack.vfs";
import {getUser, enableLogin} from "@d3x0r/user-database-remote/enableLogin.mjs";

// equate the unique ID I return with the user 
// information given....
// later on connection, the client will somehow
// pass the expect ID for authentication with the
// service.
const connections = new Map(); 

// this is the user information that was 
// given to the service on expect
// key[0] is the ID that should be the one 
// expect resulted with.
const user = getUser( msg.key.svc.key[0] );

// this.server is a sack server from
//    sack.vfs/apps/http-ws/server.mjs
//    or protocol.mjs
const app = this.server.app


// optional expect handler, otherwise use getUser on the key....
// default expect handler (null for last callback)
// does this same operation.
enableLogin( this.server, app, (user)=>{
	const uid = sack.Id();
	connections.set( uid, user );
	return uid;
} );


```

# Simple Client Modifications



``` js

import {requestService,firstConnect} from "/node_modules/@d3x0r/user-database-remote/requestService.js" 


// at some point later, 
requestService( "d3x0r.org", "Chain Reaction", (token)=>{
	// callback when the service requst and login have completed.
	// the login socket will have closed...(probably?)
	// and token is all the information the login server
	//   gave this servicether to connect to the server.
	// token = {
	//	name : "username to show",  
	//	svc: {
	//		port: #,
	//		addr:[ {Address} ]
	//		key: [expect result]
	//	}
	//}
	// Address is a network address with `family`, `addr`,
	//   `cidr`, `internal`, `mac`, `netmask`
	//   nor all information may be valid, 
	//   and mac may come back as 00:00:00:00:00:00 if it iss off 
	//   of a local segment.  family is 'IPv4' or 'IPv6', 
	//   addr may be a text name or IP address.  cidr is
	//   the IP/bits mask type and netmask is the typical IP netmask .

	// openSocket to the service can use the information for the address, port to connect to
	// it may also send the key on the open request, or hold onto it until a later negotiation point.

	// `openSocket(token)` is just an example and should be replace with appropriate code for the module.
	return openSocket( token )
})



// when the connection closes, and a new socket should be requested
// the above callback will be called again when authentication completes.

firstConnect();  // reinitialzes the login, which connect, 
                 // and requests the service as approprite.


```

---

# Changelog
- 1.0.2
  - major functionality fixes, basically worked.
- 1.0.1
  - minor fixes
- 1.0.0
  - Initial Version