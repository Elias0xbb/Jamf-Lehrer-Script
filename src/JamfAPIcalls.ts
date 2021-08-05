
import {sendRequest} from './httpsRequests';


/*-< getAllClasses() >-------------------------------------------+
| Requests and returns all classes.                              |
| If the request fails five times, the program will be crashed.  |
+---------------------------------------------------------------*/
async function getAllClasses() {
	for(let i = 0; i < 5; ++i) {
		try {
			// Send API request for all classes
			let clss = <{classes: any}> await sendRequest('/classes', 'GET', null);

			// If the returned value or its 'classes' property is not defined, throw an error
			if(!clss) throw new Error("Undefined response");
			if(!clss.classes) throw new Error("Classes Property undefined");
			// Return classes if the request was successful
			return clss.classes;
		}
		catch(e) { var err = e }
	}
	
	// Crash program after five errors 
	console.log(`Failed to receive classes.\nError = ${err}`);
	process.exit(1)
}

/*-< getClass(uuid) >------------------------------------------------------------------------+
| Requests and returns the class specified by the uuid.                                      |
| Crashs after five unsuccessful tries but ignores "ClassNotFound" error (returns undefined) |
+-------------------------------------------------------------------------------------------*/
async function getClass(uuid: string) {
	for(let i = 0; i < 5; ++i) {
		try {
			// Send API request for the class
			let cls = <{class: any}> await sendRequest(`/classes/${uuid}`, 'GET', null);
			// Check if the response is valid and return class
			if(!cls)       throw new Error('Undefined response');
			return cls.class;
		}
		catch(e) { var err = e }
	}
	
	// Crash after five errors
	console.log(`Failed to get Class ${uuid}\nError = ${err}`);
	process.exit(1)
}

export { getAllClasses, getClass }
