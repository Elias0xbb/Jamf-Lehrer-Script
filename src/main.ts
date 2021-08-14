
// Helper function that returns the config object
import {getConfig} from './getConfig';
// Jamf API call functions lib
import * as jac from './JamfAPIcalls'


/*-< main() >--------------------------------------------------------------------+
| Contains the program's main logic.                                             |
| Requests all classes and relevant groups, deletes classes without a respective |
| group, adds missing classes and removes / adds users to correct classes.       |
+-------------------------------------------------------------------------------*/
async function main(): Promise<number> {
	try {
		// Get all classes and relevant groups
		let groups = await getValidGroups();
		let classes = await jac.getAllClasses();

		// Create an array of group-class pairs
		let classGroupPairs = combineGroupsAndClasses(groups, classes);

		// Delete all classes that shouldn't exist
		for(const cls of classes) {
			let res = await jac.deleteClass(cls.uuid);
			// Display warning if response message isn't 'ClassDeleted'
			if(res != 'ClassDeleted') console.log(
				`Warning: Received response ${res} while trying to delete class ${cls.name}`
			);
		}
	
		// Check all group-class pairs and create / correct missing / incorrect classes
		const teacherGroupID = getConfig().teacherGroupID;
		await checkClassGroups(classGroupPairs, teacherGroupID);
		
		// Return 0 if the execution was successful
		return 0;
	}
	catch(e) {
		// TODO: Error handling
		console.error(e);
		return 1;
	}
}

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
		if(pos < 0) return void 0;
		return classes.splice(pos, 1)[0];
	});

	// Find the respective class for every group and return the array
	groups.forEach(g => {
		let cls = getClass(g.name);
		let uuid = cls ? cls.uuid : void 0;
		groupsClasses.push({
			name: g.name,
			groupID: g.id,
			classUUID: uuid,
		})
	})

	return groupsClasses;
}

/*-< getValidGroups() >-----------------------------------------------+
| Requests all groups and returns an array of all relevant groups for |
| which a class (should) exist(s).                                    |
+--------------------------------------------------------------------*/
async function getValidGroups(): Promise<{name: string, id: number}[]> {
	// Get the config for the class name regex and ignored class description
	const config = getConfig();
	if(!config) throw new Error('Config object undefined [Function call: getValidGroups].');
	if(!config.classUserGroupRegEx || config.classUserGroupRegEx === '') throw new Error(
		'config.classUserGroupRegEx undefined [Function call: getValidGroups].'
	);
	
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
	
	if(validGroups.length < config.minValidGroupCount) {
		throw new Error(
			`Only ${validGroups.length} valid groups were found. If this is correct, increase 'minValidGroupCount' in the config file.`
		);
	}
	return validGroups;
}

/*-< checkClassGroups(grpClsArray, teacherGroupID) >-----------------------------------+
| Checks if a corresponding class exists for every group and if the class has the same |
| members as the group. Creates all missing classes and adds / removes class members   |
| if necessary.                                                                        |
+-------------------------------------------------------------------------------------*/
async function checkClassGroups(grpClsArray: GroupClassPairObject[], teacherGroupID: number) {
	// Loop over the group-class pair array
	for(const e of grpClsArray) {
		// Create a new class if none exists
		if(!e.classUUID) {
			// Get all group members
			let group = await jac.getMembersOf(`${e.groupID}`);

			// Get the id of every teacher and student
			let teachers: string[] = [];
			let students: string[] = [];

			for(const user of group) {
				// If the user is part of the teachers group, add them to the teachers array
				let isTeacher = user.groupIds.indexOf(teacherGroupID) > -1;
				if(isTeacher) {
					teachers.push(`${user.id}`);
				}
				// Otherwise add the user to the students array
				else students.push(`${user.id}`);
			}

			// Create the new class
			let res = await jac.createClass(e.name, students, teachers);
		}
	}
}


// Call main function
(async _ => {
	const err = await main();
	process.exit(err);
})()
