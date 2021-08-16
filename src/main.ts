
// Helper function that returns the config object
import {getConfig} from './getConfig';
// Jamf API call functions lib
import * as jac from './JamfAPIcalls'


// Get config object
const config = (_ => {
	let config = getConfig();
	// Check and return the config
	if(config) {
		if(!config.classUserGroupRegEx) {
			console.log('config.classUserGroupRegEx undefined!');
			process.exit(1);
		}
		if(config.teacherGroupID == null) {
			console.log('config.teacherGroupID undefined!');
			process.exit(1);
		}
		if(!config.createdClassDescription) {
			console.log('config.createdClassDescription undefined!');
			process.exit(1);
		}
		if(config.verboseMode == null) {
			console.log('config.verboseMode undefined!');
			process.exit(1);
		}
		if(config.minValidGroupCount == null) {
			console.log('config.minValidGroupCount undefined!');
			process.exit(1);
		}
		return config;
	}
	console.log('Error: Console object undefined!');
	process.exit(1);
})();

// Prints a message if verbose mode is active
function verbosePrint(message: any, condition: boolean = true) {
	if(config.verboseMode && condition) console.log(message);
}


/*-< main() >--------------------------------------------------------------------+
| Contains the program's main logic.                                             |
| Requests all classes and relevant groups, deletes classes without a respective |
| group, adds missing classes and removes / adds users to correct classes.       |
+-------------------------------------------------------------------------------*/
async function main(): Promise<number> {
	try {
		// Get all classes and relevant groups
		console.log(`Requesting classes and groups...`);
		let groups = await getValidGroups();
		let classes = await jac.getAllClasses();
		console.log(`Received ${groups.length} class groups and ${classes.length} classes.`);

		// Create an array of group-class pairs
		verbosePrint(`Creating class-group pair array...`);
		let classGroupPairs = combineGroupsAndClasses(groups, classes);

		// Delete all classes that shouldn't exist
		verbosePrint(`Deleting ${classes.length} classes...`, classes.length > 0);
		let nDeletedClasses = 0;
		for(const cls of classes) {
			verbosePrint(`Deleting class ${cls.name}...`);
			nDeletedClasses++;
			let res = await jac.deleteClass(cls.uuid);
			// Display warning if response message isn't 'ClassDeleted'
			if(res != 'ClassDeleted') console.log(
				`Warning: Received response ${res} while trying to delete class ${cls.name}`
			);
		}
		console.log(`Deleted ${nDeletedClasses} classes.`);
	
		// Check all group-class pairs and create / correct missing / incorrect classes
		await checkClassGroups(classGroupPairs);
		
		// Return 0 if the execution was successful
		return 0;
	}
	catch(e) {
		// TODO: Error handling
		console.error(e);
		return 1;
	}
}

// An object storing the the class/group name and the classes uuid + group's id
interface GroupClassPairObject { name: string, groupID: number, classUUID: string }

/*-< combineGroupsAndClasses(groups, classes) >-------------------------------------+
| Creates an Array of group-class pairs. If no class with an identical name exists, |
| only the group id and name will be stored and the class uuid will be undefined.   |
+----------------------------------------------------------------------------------*/
function combineGroupsAndClasses(groups: {name: string, id: number}[], classes: jac.ClassArrayObject[]) {
	// The groupsClasses array stores the group-class pairs
	let groupsClasses: GroupClassPairObject[] = [];
	// getClass(name) returns and removes the first class with the given name
	// from the classes array. Returns undefined if none exists.
	const getClass = ((name: string) => {
		let pos = classes.map(c => c.name).indexOf(name);
		return pos < 0 ? void 0 : classes.splice(pos, 1)[0];
	});

	// Find the respective class for every group and return the array
	groups.forEach(g => {
		let cls = getClass(g.name);
		groupsClasses.push({
			name: g.name,
			groupID: g.id,
			classUUID: cls?.uuid,
		})
	})

	return groupsClasses;
}

/*-< getValidGroups() >-----------------------------------------------+
| Requests all groups and returns an array of all relevant groups for |
| which a class (should) exist(s).                                    |
+--------------------------------------------------------------------*/
async function getValidGroups(): Promise<{name: string, id: number}[]> {
	// Get config properties
	const clsNameRegEx = new RegExp(config.classUserGroupRegEx);
	const ignoredDescr = config.createdClassDescription;
	if(!ignoredDescr || ignoredDescr === '') throw new Error(
		'ignoredDescr undefined [Function call: getValidGroups].'
	);

	// Request all groups
	const allGroups = await jac.getAllGroups();

	// Create and return an array of the relevant groups
	let validGroups = <{ name: string, id: number }[]> [];
	// Loop over all groups and test names and description
	// If the name isn't a valid class name or the description is
	// equal to config.createdClassDescription, the group will not be
	// added to the validGroups array
	allGroups.forEach(({name, id, description}) => {
		if(description != ignoredDescr && clsNameRegEx.test(name)) {
			validGroups.push({name: name, id: id});
		}
	})
	
	// Throw error if less valid classes than expected were found (to prevent unwanted deletion)
	if(validGroups.length < config.minValidGroupCount) {
		throw new Error(
			`Only ${validGroups.length} valid groups were found. If this is correct, increase 'minValidGroupCount' in the config file.`
		);
	}
	return validGroups;
}

/*-< createClassFromGroupMembers(clsName, members) >-+
| Creates a new class from an array of user objects. |
+---------------------------------------------------*/
async function createClassFromGroupMembers(clsName: string, members: jac.DetailedUserObject[]) {
	// Get the id of every teacher and student
	let teachers: string[] = [];
	let students: string[] = [];

	for(const user of members) {
		let isTeacher = user.groupIds.indexOf(config.teacherGroupID) > -1;
		// If the user is part of the teachers group, add them to the teachers array
		if(isTeacher) teachers.push(`${user.id}`);
		// Otherwise add the user to the students array
		else students.push(`${user.id}`);
	}

	// Create the new class
	await jac.createClass(clsName, students, teachers);
}

/*-< checkClassGroups(grpClsArray, teacherGroupID) >-----------------------------------+
| Checks if a corresponding class exists for every group and if the class has the same |
| members as the group. Creates all missing classes and adds / removes class members   |
| if necessary.                                                                        |
+-------------------------------------------------------------------------------------*/
async function checkClassGroups(grpClsArray: GroupClassPairObject[]) {
	// Loop over the group-class pair array
	let viewedClasses = 0;
	let nCorrectedClasses = 0; // # of classes that had to be corrected due to missing / incorrect members
	let nCreatedClasses = 0;   // # of classes that were missing and thus had to be created 

	let tenPercentOfCG = Math.ceil(grpClsArray.length / 10);

	for(const e of grpClsArray) {
		// Create a new class if none exists
		if(!e.classUUID) {
			nCreatedClasses++;
			// Get all group members and create the class
			let group = await jac.getMembersOf(`${e.groupID}`);
			createClassFromGroupMembers(e.name, group);
			
			verbosePrint(`Created new class '${e.name}'.`);
		} 
		// Check class to see if the students and teachers match the corresponding group's members
		else {
			const corrections = await correctClass(e);
			if(corrections > 0) nCorrectedClasses++;
		}
		
		viewedClasses++;
		if(viewedClasses % tenPercentOfCG === 0) {
			console.log(
				`Viewed ${viewedClasses} / ${grpClsArray.length} classes ` +
				`(${Math.floor(viewedClasses/grpClsArray.length * 100)}%)`
			);
		}
	}
	console.log(`Created ${nCreatedClasses} missing classes.`);
	console.log(`Corrected ${nCorrectedClasses} classes.`);
}

async function correctClass(clsGroupPair: GroupClassPairObject) {
	// Get detailed information on the class and the group
	const cls = await jac.getClass(clsGroupPair.classUUID);
	const grpUsers = await jac.getMembersOf(`${clsGroupPair.groupID}`);

	// Find all the teachers and students that are members of the group but cannot be found in the class.
	// The missing users are then stored in 'clsMissing' so that they can be added to the class.
	// While searching for the group members in cls.students / -.teachers, the users that are found
	// will be removed from cls.students / -.teachers so that any incorrect class members can be removed
	// from the class after all the correct users have been found and removed from the arrays.
	let misStudents: string[] = [];
	let misTeachers: string[] = [];
	
	// Finds a user and removes it from the array. Returns the user object.
	const findUser = (src: jac.UserObject[], id: number) => {
		const pos = src.map(e => e.id).indexOf(id);
		// If the user does not exist, return undefined
		return pos > -1 ? src.splice(pos, 1)[0] : void 0;
	}

	for(const usr of grpUsers) {
		// Check if the user is a teacher
		const isTeacher = usr.groupIds.indexOf(config.teacherGroupID) > -1;
		// If the user is a teacher, search the teachers array of cls to see if their id is included
		if(isTeacher) {
			const teacher = findUser(cls.teachers, usr.id);
			// If the teacher's id wasn't found in cls.teachers, add the id to the missing teachers array
			if(!teacher) misTeachers.push(`${usr.id}`);
		}
		// If the user is a student, search the students array of cls for their id
		else {
			const student = findUser(cls.students, usr.id);
			// If the id wasn't found, add usr.id to the missing students array
			if(!student) misStudents.push(`${usr.id}`);
		}
	}

	// Check if the class changed and return if not
	let nChangedUsers = misStudents.length + misTeachers.length;
	nChangedUsers += cls.students.length = cls.teachers.length;
	if(nChangedUsers <= 0) return 0;
	
	// If the teacher changed or many of the students, delete the class and create a new one
	let isNewClass = misStudents.length + cls.students.length > config.changedStudentsLimit;
	isNewClass ||= misTeachers.length + cls.teachers.length > config.changedTeachersLimit;
	if(isNewClass) {
		verbosePrint(`Rebuiling class ${cls.name}`);
		// Delete the old class
		const res = await jac.deleteClass(cls.uuid);
		// If the response is not 'ClassDeleted', print a warning
		if(res != 'ClassDeleted') {
			console.log(
				`Warning: Class ${cls.name} might not have been deleted successfully (response: ${res}).`
			);
			const {name, groupID, classUUID} = clsGroupPair;
			console.log(`[Function call: correctClass({${name}, ${groupID}, ${classUUID}})]`);
			
			// TODO: Error handling
		}

		// Create a new class
		await createClassFromGroupMembers(cls.name, grpUsers);
	}
	// If it is not a new class, correct users if necessary
	else {
		// Create arrays with the ids of the incorrect students / teachers and remove them from the class
		const incStdIds = cls.students.map(s => `${s.id}`);
		const incTchIds = cls.teachers.map(t => `${t.id}`);
		
		// Delete users if necessary
		if(incStdIds.length + incTchIds.length > 0) {
			verbosePrint(
				`Removing ${incStdIds.length} students and ${incTchIds.length} teacher from class ${cls.name}`
			);

			let res = await jac.removeUsersFromClass(cls.uuid, incStdIds, incTchIds);
			// If the response is not ClassUsersDeleted, print a warning
			if(res != 'ClassUsersDeleted') {
				console.log(
					`Warning: Possible error after removing users from class '${cls.name}'. Response = '${res}'`
				);
				console.log(`[Function: correctClass]`);

				// TODO: error handling
			}
		}

		// Add missing users to the class if necassar
		if(misStudents.length + misTeachers.length > 0) {
			verbosePrint(
				`Adding ${misStudents.length} students and ${misTeachers.length} ` +
				`teachers to ${cls.name}`
			);
			const res = await jac.addUsersToClass(cls.uuid, misStudents, misTeachers);
			// Print warning if response is unexpected
			if(res != 'ClassSaved') {
				console.log(
					`Warning: Possible error after adding users to class '${cls.name}'. Response = '${res}'`
				);
				console.log(`[Function: correctClass]`);

				// TODO: error handling
			}
		}
	}

	return nChangedUsers;
}


// Call main function
(async _ => {
	const err = await main();
	process.exit(err);
})()
