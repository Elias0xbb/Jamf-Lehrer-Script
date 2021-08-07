
import {sendRequest} from './httpsRequests';

// Interfaces
interface ClassArrayObject {
	uuid: string,
	name: string,
	description: string,
	locationId: number,
	source: string,
	image: string,
	classAsmIdentifier: number,
	userGroupId: number,
	studentCount: number,
	teacherCount: number,
	deviceGroupId: number,
	deviceCount: number,
	passcodeLockGracePeriod: object,
	wallpaperId: number
}

interface DetailedClass extends ClassArrayObject {
	students: UserObject[],
	teachers: UserObject[]
}

interface UserObject {
	id: number,
	name: string,
	email: string,
	username: string,
	firstName: string,
	lastName: string,
	photo: string
}

interface DetailedUserObject {
	id: number,
    locationId: number,
    status: string,
    deviceCount: number,
    email: string,
    username: string,
    domain: string,
    firstName: string,
    lastName: string,
    name: string,
    groupIds: number[]
}

/*-< getAllClasses() >-------------------------------------------+
| Requests and returns all classes.                              |
| If the request fails five times, the program will be crashed.  |
+---------------------------------------------------------------*/
async function getAllClasses(): Promise<ClassArrayObject[]> {
	for(let i = 0; i < 5; ++i) {
		try {
			// Send API request for all classes
			let clss = <{classes: any}> await sendRequest('/classes', 'GET', null);

			// If the returned value or its 'classes' property is not defined, throw an error
			if(!clss) throw new Error(`Undefined response [Function call: getAllClasses()].`);
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

/*-< getClass(uuid) >-------------------------------------------------------------------------+
| Requests and returns the class specified by the uuid.                                       |
| Crashs after five unsuccessful tries but ignores "ClassNotFound" error (returns undefined). |
+--------------------------------------------------------------------------------------------*/
async function getClass(uuid: string): Promise<DetailedClass> {
	for(let i = 0; i < 5; ++i) {
		try {
			// Send API request for the class
			let cls = <{class: any}> await sendRequest(`/classes/${uuid}`, 'GET', null);
			// Check if the response is valid and return class
			if(!cls) throw new Error(`Undefined response [Function call: getClass(${uuid})].`);
			return cls.class;
		}
		catch(e) { var err = e }
	}
	
	// Crash after five errors
	console.log(`Failed to get Class ${uuid}\nError = ${err}`);
	process.exit(1)
}

/*-< deleteClass(uuid) >------------------------------------------+
| Deletes specified class, crashes after five unsuccessful tries. |
+----------------------------------------------------------------*/
async function deleteClass(uuid: string): Promise<string> {
	for(let i = 0; i < 5; ++i) {
		try {
			// Check if uuid is defined and send API request to delete the class
			if(!uuid || uuid == '') throw new Error('Failed to delete Class {UUID missing} [Function: deleteClass].');
			let response = <{message: string}> await sendRequest(`/classes/${uuid}`, 'DELETE', null);

			// Throw an error if the response is undefined
			if(!response) throw new Error(`Undefined response [Function call: deleteClass(${uuid})].`);
			// Return message (expected value: 'ClassDeleted')
			return response.message;
		}
		catch(e) { var err = e }
	}
	
	console.log(`Failed to delete class ${uuid}\nError = ${err}`);
	process.exit(1)
}

/*-< getMembersOf(groupID) >---------------------------------------------+
| Requests and returns all users of the specified group.                 |
| If no group is specified, a list of all global users will be returned. |
| Crashes if the request fails five times in a row.                      |
+-----------------------------------------------------------------------*/
async function getMembersOf(groupID: string): Promise<DetailedUserObject[]> {
	for(let i = 0; i < 5; ++i) {
		try {
			// Check if groupID is defined and send API request
			let group = groupID ? `?memberOf=${groupID}` : '';
			let users = <{users: DetailedUserObject[]}> await sendRequest(`/users${group}`, 'GET', null);

			// Throw error if the response or the 'users' property of the response is undefined
			if(!users) throw new Error(`Undefined response [Function call: getMembersOf(${groupID})].`);
			if(!users.users) throw new Error(`Failed to receive users of group ${groupID}.\n(users property undefined)`);

			return users.users
		} 
		catch(e) { var err = e }
	}

	// Crash after five errors
	console.log(`Failed to get users of group with ID ${groupID}.\nError = ${err}`);
	process.exit(1)
}

export { getAllClasses, getClass, deleteClass, getMembersOf }
