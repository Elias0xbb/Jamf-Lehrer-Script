
import * as hf from './helperFunctions'
import {getConfig} from './getConfig'
import {sendRequest} from './httpsRequests';
import * as logFile from './logFile';

/*=======================⊞
ǁ ----- Interfaces ----- ǁ
⊞=======================*/

// Object that is returned when requesting  a list of 
// all classes (GET 'https://api.zuludesk.com/classes')
interface ClassArrayObject {
	uuid: string,
	name: string,
	description: string,
	locationId: number,
	source: string,
	image: string,
	classAsmIdentifier: string,
	userGroupId: number,
	studentCount: number,
	teacherCount: number,
	deviceGroupId: number,
	deviceCount: number,
	passcodeLockGracePeriod: object,
	wallpaperId: number
}

// Object representing a class, returned by the 'find a class'
// API call (GET 'https://api.zuludesk.com/classes/:uuid')
interface DetailedClassObject extends ClassArrayObject {
	students: UserObject[],
	teachers: UserObject[]
}

// User representation in the students
// and teachers array of 'DetailedClassObject'
interface UserObject {
	id: number,
	name: string,
	email: string,
	username: string,
	firstName: string,
	lastName: string,
	photo: string
}

// The response Object to the 'list users' API call
// (GET 'https://api.zuludesk.com/users') contains
// an array of objects storing the following data: 
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

// Objects returned by the list all groups API call
interface GroupObject {
	id: number,                                      
    locationId: number,                 
    name: string,
    description: string,
    userCount: number,
    acl: { teacher: string, parent: string },
    modified: string
}



/*========================================================================⊞
ǁ  ----- ----- ----- ----- ----- FUNCTIONS ----- ----- ----- ----- -----  ǁ
⊞========================================================================*/



/*-< getAllClasses() >-------------------------------------------+
| Requests and returns all classes.                              |
| If the request fails five times, the program will be crashed.  |
+---------------------------------------------------------------*/
async function getAllClasses(): Promise<ClassArrayObject[]> {
	for(let i = 0; i < 5; ++i) {
		try {
			// Send API request for all classes
			let clss = <{classes: ClassArrayObject[]}> await sendRequest('/classes', 'GET', null);

			// If the returned value or its 'classes' property is not defined, throw an error
			if(!clss) throw new Error(`Undefined response [Function call: getAllClasses()].`);
			if(!clss.classes) throw new Error("Classes Property undefined");
			// Return classes if the request was successful
			return clss.classes;
		}
		catch(e) { var err = e }
	}
	
	// Crash program after five errors 
	console.log(`Failed to receive classes.\n${hf.toRed('Error')} = ${err}`);
	process.exit(1)
}

/*-< getClass(uuid) >-------------------------------------------------------------------------+
| Requests and returns the class specified by the uuid.                                       |
| Crashes after five unsuccessful tries but ignores "ClassNotFound" error (returns undefined). |
+--------------------------------------------------------------------------------------------*/
async function getClass(uuid: string): Promise<DetailedClassObject> {
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
	console.log(`Failed to get Class ${uuid}\n${hf.toRed('Error')} = ${err}`);
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
	
	console.log(`Failed to delete class ${uuid}\n${hf.toRed('Error')} = ${err}`);
	process.exit(1)
}

async function testIfClassExists(name: string) {
	const classes = await getAllClasses();
	return classes.map(c => c.name).indexOf(name) > -1;
}

/*-< createClass(name, studentIDs, teacherIDs) >-----------------------------------------------------+
| Creates a new class with the given name and members and returns the uuid.                          |
| For the class description the value specified in the scriptConfig file will be used.               |
| Null will be returned if the name is invalid and the process will be crashed if the request fails  |
| five times in a row.                                                                               |
+---------------------------------------------------------------------------------------------------*/
async function createClass(name: string, studentIDs: string[], teacherIDs: string[]): Promise<string> {
	for(let i = 0; i < 5; ++i) {
		try {
			// If the request failed check if the class exists
			if(i && await testIfClassExists(name)) {
				logFile.appendToBuffer(`[jac.createClass] Warning: Tried to create existing class '${name}'`);
				return null;
			}
			
			// Return Null and print a warning if the name is invalid
			if(!name) {
				logFile.appendToBuffer(`Failed to create new class {name missing} [Function: createClass].`);
				return null;
			}
			// TODO: Check validity (RegEx)
			if(name == '') {
				logFile.appendToBuffer(`Failed to create new class {Invalid name '${name}'} [Function call:`+
				` createClass(name: ${name}, studentIDs: ${studentIDs}, teacherIDs: ${teacherIDs})]`);
				return null;
			}

			// Log a warning if teacherIDs and/or studentIDs is empty. No error will be thrown and the execution
			// of the function will continue
			if(teacherIDs.length + studentIDs.length === 0) {
				logFile.appendToBuffer(`Warning: Failed to create new class '${name}'. Reason: No members`);
				return null;
			}
			if(teacherIDs.length === 0) logFile.appendToBuffer(`Warning: ` +
				`Created new class "${name}" without any teachers!`);
			if(studentIDs.length === 0) logFile.appendToBuffer(`Warning: ` +
				`Created new class "${name}" without any students!`);

			// Make the API request with the given parameters and the description specified in scriptConfig.json
			const descr = getConfig().createdClassDescription;
			const params = {
				name: name,
				description: descr,
				students: studentIDs,
				teachers: teacherIDs,
			}
			const response = <{uuid: string}> await sendRequest('/classes', 'POST', params);
			// Return the uuid of the new class
			return response.uuid;
		}
		catch(e) { var err = e }
	}

	// Crash after five errors
	console.log(`Failed to create Class "${name}"/n${hf.toRed('Error')} = ${err}`);
	process.exit(1)
}


/*-< getAllGroups() >-------------------------------------------+
| Requests and returns all groups.                              |
| If the request fails five times, the program will be crashed. |
+---------------------------------------------------------------*/
async function getAllGroups(): Promise<GroupObject[]> {
	for(let i = 0; i < 5; ++i) {
		try {
			// Send API request for all groups
			let response = <{groups: GroupObject[]}> await sendRequest('/users/groups', 'GET', null);

			// If the returned value or its 'groups' property is not defined, throw an error
			if(!response) throw new Error(`Undefined response [Function call: getAllGroups()].`);
			if(!response.groups) throw new Error(`
				Groups property of response undefined [Function call: getAllGroups()]`
			);
			// Return groups if the request was successful
			return response.groups;
		}
		catch(e) { var err = e }
	}
	
	// Crash program after five errors 
	console.log(`Failed to receive Groups.\n${hf.toRed("Error")} = ${err}`);
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
	console.log(`Failed to get users of group with ID ${groupID}.\n${hf.toRed('Error')} = ${err}`);
	process.exit(1)
}


/*-< addUsersToClass(uuid, studentIDs, teacherIDs) >-------------------------------------------------+
| Adds the students and teachers to the class specified by its uuid. If the studentIDs / teacherIDs  |
| list is empty, no teachers / students will be added to the class.                                  |
| Example: addUsersToClass('xyz', ['1234', '1235'], []) will add two students and 0 teachers to the  |
| class with uuid 'xyz'.                                                                             |
| After five errors in a row the process will be stopped and an error message displayed.             |
+---------------------------------------------------------------------------------------------------*/
async function addUsersToClass(uuid: string, studentIDs: string[], teacherIDs: string[]): Promise<string> {
	for(let i = 0; i < 5; ++i) {
		try {
			// Check uuid and throw error if null / empty
			if(!uuid || uuid === '') throw new Error(
				`Missing uuid. [Function call: addUserToClass(${uuid}, ${studentIDs}, ${teacherIDs})]`
			);
			// Create an object with the userIDs of the students and teachers
			let params = {
				teachers: teacherIDs,
				students: studentIDs,
			}
			// Send the API request and check if the response is defined
			const res = <{message: string}> await sendRequest(`/classes/${uuid}/users`, 'PUT', params);
			if(!res) throw new Error(
				`Undefined response [Function call: addUserToClass(${uuid}, ${studentIDs}, ${teacherIDs})].`
			);
			// Return response message (should be 'ClassSaved')
			return res.message;
		}
		catch(e) { var err = e }
	}

	// Crash after five errors
	console.log(
		`Failed to add students ${studentIDs} and teachers ${teacherIDs} to class ${uuid}.` +
		`\n${hf.toRed('Error')} = ${err}`
	);
	process.exit(1)
}


/*-< removeUsersFromClass(uuid, studentIDs, teacherIDs) >-------------------------------------+
| Removes given students and teachers from the class specified by its uuid.                   |
| Returns the message responded by the Jamf Server if the request was send successfully,      |
| returns null if the teacherIDs and studentIDs arrays are both empty and displays a warning. |
| After five unsuccessful attempts to send the request, the program will be crashed.          |
+--------------------------------------------------------------------------------------------*/
async function removeUsersFromClass(uuid: string, studentIDs: string[], teacherIDs: string[]) {
	for(let i = 0; i < 5; ++i) {
		try {
			//check if studentIDs and teacherIDs are defined
			if(!studentIDs || !teacherIDs) throw new Error(
				`Undefined parameter (teacherIDs or studentIDs) [Function call: rem..FromClass(${uuid},...)`
			);

			// If both studentIDs and teacherIDs are empty, display warning and return null
			if(studentIDs.length + teacherIDs.length === 0) {
				logFile.appendToBuffer(`Warning: Tried to remove 0 users from class ${uuid}`);
				return null;
			}

			// -< strArrayToList(arr) >-----------------------------------------------------------------+
			// Converts a string array into a single string where the array items are seperated by commas
			const strArrayToList = (arr: string[]):string => {
				return arr.reduce((total: string, current: string): string => (`${total},${current}`));
			}

			// Create a (correctly formatted) string containing the array(s)
			// The arrays have to be send as part of the URL
			// (see 'https://api.zuludesk.com/docs/#api-Classes')
			let params = studentIDs.length > 0
				? `?students=${strArrayToList(studentIDs)}`
				: '';
			params += teacherIDs.length > 0
				? `${params === '' ? '?' : '&'}teachers=${strArrayToList(teacherIDs)}`
				: '';

			// Send the request and return the response message
			// If the deletion was successful, the message should be 'ClassUsersDeleted'
			let path = `/classes/${uuid}/users${params}`;
			let response = <{message: string}> await sendRequest(path, 'DELETE', null);

			return response.message;
		}
		catch(e) { var err = e }
	}

	// Crash after five errors
	console.log(
		`Failed to assign ${studentIDs.length+teacherIDs.length} new users to class ${uuid}.` +
		`\n${hf.toRed('Error')} = ${err}`
	);
	process.exit(1)
}


export {
	getAllClasses, getClass, deleteClass, createClass, addUsersToClass, removeUsersFromClass,
	getMembersOf, getAllGroups, 
	// interfaces
	ClassArrayObject, GroupObject, UserObject, DetailedUserObject, DetailedClassObject,
}
