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
