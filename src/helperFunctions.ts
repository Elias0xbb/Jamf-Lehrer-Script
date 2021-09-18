// Helper function that returns the getConfig() object
import {getConfig} from './getConfig';
// Https wrapper functions
import * as jac from './JamfAPIcalls';
// Progress bar
import {displayProgressBar} from './ProgressBar';
// Log File
import * as logFile from './logFile';

// Change the color of text in the console:
const toRed = (msg: string) => getConfig().coloredConsoleOutputs ? `\x1b[31m${msg}\x1b[0m` : msg;
const toGreen = (msg: string) => getConfig().coloredConsoleOutputs ? `\x1b[32m${msg}\x1b[0m` : msg;
const toYellow = (msg: string) => getConfig().coloredConsoleOutputs ? `\x1b[33m${msg}\x1b[0m` : msg;
const toBlue = (msg: string) => getConfig().coloredConsoleOutputs ? `\x1b[34m${msg}\x1b[0m` : msg;
const toMagenta = (msg: string) => getConfig().coloredConsoleOutputs ? `\x1b[35m${msg}\x1b[0m` : msg;
const toCyan = (msg: string) => getConfig().coloredConsoleOutputs ? `\x1b[36m${msg}\x1b[0m` : msg;

// An object storing the the class/group name and the classes uuid + group's id
interface GroupClassPairObject { name: string, groupID: number, classUUID: string }

/*-< combineGroupsAndClasses(groups, classes) >-------------------------------------+
| Creates an Array of group-class pairs. If no class with an identical name exists, |
| only the group id and name will be stored and the class uuid will be undefined.   |
+----------------------------------------------------------------------------------*/
function combineGroupsAndClasses(groups: {name: string, id: number}[], classes: jac.ClassArrayObject[]) {
	console.log(toCyan('\nFinding group-class pairs...'));
	// The groupsClasses array stores the group-class pairs
	let groupsClasses: GroupClassPairObject[] = [];
	// getClass(name) returns and removes the first class with the given name
	// from the classes array. Returns undefined if none exists.
	const getClass = ((name: string) => {
		let pos = classes.map(c => c.name).indexOf(name);
		return pos < 0 ? void 0 : classes.splice(pos, 1)[0];
	});

	// Find the respective class for every group and return the array
	groups.forEach((g, idx) => {
		let cls = getClass(g.name);
		groupsClasses.push({
			name: g.name,
			groupID: g.id,
			classUUID: cls?.uuid,
		})
		displayProgressBar((++idx)/groups.length, true, '.');
	})

	return groupsClasses;
}

/*-< getValidGroups() >-----------------------------------------------+
| Requests all groups and returns an array of all relevant groups for |
| which a class (should) exist(s).                                    |
+--------------------------------------------------------------------*/
async function getValidGroups(): Promise<{name: string, id: number}[]> {
	// Get getConfig() properties
	const clsNameRegEx = new RegExp(getConfig().classUserGroupRegEx);
	const iPadKNameRegEx = new RegExp(getConfig().iPadGroupRegEx);

	const ignoredDescr = getConfig().createdClassDescription;
	if(!ignoredDescr || ignoredDescr === '') throw new Error(
		'ignoredDescr undefined [Function call: getValidGroups].'
	);

	// Request all groups
	const allGroups = await jac.getAllGroups();

	// Create and return an array of the relevant groups
	let validGroups = <{ name: string, id: number }[]> [];
	// Stores # of groups that aren't valid class-groups
	let nIgnoredGroups = { total: 0, noMembers: 0 };
	// Loop over all groups and test names and description
	// If the name isn't a valid class name or the description is
	// equal to getConfig().createdClassDescription, the group will not be
	// added to the validGroups array
	allGroups.forEach(({name, id, description, userCount}) => {
		if(description != ignoredDescr && (clsNameRegEx.test(name) || iPadKNameRegEx.test(name))) {
			// Check if the group has any members
			if(userCount > 0) {
				validGroups.push({name: name, id: id});
			}
			else nIgnoredGroups.noMembers++;
		}
		else nIgnoredGroups.total++;
	})
	// Calculate total # of ignored groups
	nIgnoredGroups.total += nIgnoredGroups.noMembers;
	// Log how many groups were ignored
	logFile.appendToBuffer(`[getValidGroups] Ignored ${nIgnoredGroups.total} groups.`);
	if(nIgnoredGroups.noMembers) {
		logFile.appendToBuffer(`[getValidGroups] Ignored ${nIgnoredGroups.noMembers} empty groups.`);
	}
	
	// Throw error if less valid classes than expected were found (to prevent unwanted deletion)
	if(validGroups.length < getConfig().minValidGroupCount) {
		throw new Error(
			`Only ${validGroups.length} valid groups were found. ` +
			`If this is correct, increase 'minValidGroupCount' in the getConfig() file.`
		);
	}
	return validGroups;
}

/*-< createClassFromGroupMembers(clsName, members) >-+
| Creates a new class from an array of user objects. |
+---------------------------------------------------*/
async function createClassFromGroupMembers(clsName: string, 
										   members: jac.DetailedUserObject[], 
										   teacherGroupID: number) {
	// Get the id of every teacher and student
	let teachers: string[] = [];
	let students: string[] = [];

	members.forEach(user => {
		let isTeacher = user.groupIds.indexOf(teacherGroupID) > -1;
		// If the user is part of the teachers group, add them to the teachers array
		if(isTeacher) teachers.push(`${user.id}`);
		// Otherwise add the user to the students array
		else students.push(`${user.id}`);
	});

	// Create the new class
	const res = await jac.createClass(clsName, students, teachers);
	return res;
}

/*-< checkClassGroups(grpClsArray) >---------------------------------------------------+
| Checks if a corresponding class exists for every group and if the class has the same |
| members as the group. Creates all missing classes and adds / removes class members   |
| if necessary.                                                                        |
+-------------------------------------------------------------------------------------*/
async function checkClassGroups(grpClsArray: GroupClassPairObject[]) {
	console.log(toCyan('\n\nChecking and correcting all classes...'));
	
	let viewedClasses = 0;     // # of classes that have been checked in total

	// Get the id of the teacher group
	const teacherGroupID = await (async () => {
		const groups = await jac.getAllGroups();
		const pos = groups.map(g => g.name).indexOf(getConfig().teacherGroupName);
		if(pos < 0) {
			console.log(toRed('WARNING: ') + `Teacher group '${getConfig().teacherGroupName}' not found!`);
			logFile.appendToBuffer(
				`\nWarning: Teacher group '${getConfig().teacherGroupName}' not found!\n`);
			return getConfig().teacherGroupID;
		}
		return groups[pos].id;
	})()
	const teacherGroup = await jac.getMembersOf(`${teacherGroupID}`);

	const iPadGrpRegEx = new RegExp(getConfig().iPadGroupRegEx);

	// Loop over the group-class pair array
	let classCreations: Promise<string>[] = [];
	let classCorrections: Promise<number>[] = [];

	for(const e of grpClsArray) {
		// Create a new class if none exists
		if(!e.classUUID) {
			// Get all group members and create the class
			// TODO: Improve performance
			let group = await jac.getMembersOf(`${e.groupID}`);
			// If the group is an iPad group, sync the teachers
			if(iPadGrpRegEx.test(e.name)) {
				let missingTeachers = teacherGroup;
				let incorrectTeachers: jac.DetailedUserObject[] = [];

				group.forEach(mem => {
					// Ignore 
					if(mem.groupIds.indexOf(teacherGroupID) < 0) continue;
					if(teacherGroup.)
				})
			}
			classCreations.push(createClassFromGroupMembers(e.name, group, teacherGroupID));
			
			logFile.appendToBuffer(`Creating new class '${e.name}'.`);
		} 
		// Check class to see if the students and teachers match the corresponding group's members
		else {
			classCorrections.push(correctClass(e, teacherGroupID));
			//if(corrections > 0) nCorrectedClasses++;
		}
		
		viewedClasses++;
		displayProgressBar(viewedClasses / grpClsArray.length, true, '#');
	}

	console.log('\n');
	const createdClasses = await Promise.all(classCreations);
	// Calculate number of created classes
	let nCreatedClasses = 0;
	// Ignore classes that were not created (returned 'null')
	createdClasses.forEach(c => { if(c) nCreatedClasses++ });
	// Print information on how many classes have been deleted...
	console.log(toMagenta(`Created ${nCreatedClasses} missing classes.`));

	// ...and how many classes have been changed
	let nCorrectedClasses = 0;
	const clsChanges = await Promise.all(classCorrections);
	// Inc. nCorrectedClasses if at least one change has been made to a class
	clsChanges.forEach(c => { if(c > 0) nCorrectedClasses++ });
	console.log(toMagenta(`Corrected ${nCorrectedClasses} classes.`));

}

/*-< correctClass(clsGroupPair, teacherGroupID) >--------------------------+
| Compares the class to its corresponding group and deletes / adds members |
| or rebuilds the class if necessary.                                      |
+-------------------------------------------------------------------------*/
async function correctClass(clsGroupPair: GroupClassPairObject, teacherGroupID: number) {
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
		const isTeacher = usr.groupIds.indexOf(teacherGroupID) > -1;
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
	const nChangedStudents = misStudents.length + cls.students.length;
	const nChangedTeachers = misTeachers.length + cls.teachers.length; 

	if(nChangedStudents + nChangedTeachers <= 0) return 0;
	
	// If the teacher changed or many of the students, delete the class and create a new one
	let isNewClass = nChangedStudents > getConfig().changedStudentsLimit;
	isNewClass ||= nChangedTeachers > getConfig().changedTeachersLimit;
	
	if(isNewClass) {
		logFile.appendToBuffer(`Rebuilding class ${cls.name}`);
		// Delete the old class
		const res = await jac.deleteClass(cls.uuid);
		// If the response is not 'ClassDeleted', print a warning
		if(res != 'ClassDeleted') {
			console.log(
				`${toYellow('Warning')}: ` +
				`Class ${cls.name} might not have been deleted successfully (response: ${res}).`
			);
			const {name, groupID, classUUID} = clsGroupPair;
			console.log(`[Function call: correctClass({${name}, ${groupID}, ${classUUID}})]`);
			
			// TODO: Error handling
		}

		// Create a new class
		await createClassFromGroupMembers(cls.name, grpUsers, teacherGroupID);
	}
	// If it is not a new class, correct users if necessary
	else {
		// Create arrays with the ids of the incorrect students / teachers and remove them from the class
		const incStdIds = cls.students.map(s => `${s.id}`);
		const incTchIds = cls.teachers.map(t => `${t.id}`);
		
		// Delete users if necessary
		if(incStdIds.length + incTchIds.length > 0) {
			logFile.appendToBuffer(
				`Removing ${incStdIds.length} student(s) and ` +
				`${incTchIds.length} teacher(s) from class ${cls.name}`
			);

			let res = await jac.removeUsersFromClass(cls.uuid, incStdIds, incTchIds);
			// If the response is not ClassUsersDeleted, print a warning
			if(res != 'ClassUsersDeleted') {
				console.log(
					`${toYellow('Warning')}: ` +
					`Possible error after removing users from class '${cls.name}'. Response = '${res}'`
				);
				console.log(`[Function: correctClass]`);

				// TODO: error handling
			}
		}

		// Add missing users to the class if necessary
		if(misStudents.length + misTeachers.length > 0) {
			logFile.appendToBuffer(
				`Adding ${misStudents.length} student(s) and ${misTeachers.length} ` +
				`teacher(s) to ${cls.name}`
			);
			const res = await jac.addUsersToClass(cls.uuid, misStudents, misTeachers);
			// Print warning if response is unexpected
			if(res != 'ClassSaved') {
				// TODO: Report warning after program finishes
				logFile.appendToBuffer(
					`Warning: ` +
					`Possible error after adding users to class '${cls.name}'. Response = '${res}'`
				);
				console.log(`[Function: correctClass]`);

				// TODO: error handling
			}
		}
	}

	return nChangedStudents + nChangedTeachers;
}

/*-< verifyChanges() >-------------------------------------------+
| Goes through all class-groups and classes to check for errors. |
+---------------------------------------------------------------*/
async function verifyChanges(): Promise<number> {
	console.log(toYellow('\n\nVerifying Changes...'));

	// Stores the total number of errors
	let nErrors = 0;
	let nGrpsViewed = 0;
	
	// Get all classes and groups
	const classes = await jac.getAllClasses();
	const groups = await getValidGroups();
	
	// Create class-group pairs
	const clsGrpPairs = await (async () => {
		let detailedClasses: Promise<jac.DetailedClassObject>[] = [];
		let grpMembers: Promise<jac.DetailedUserObject[]>[] = [];
		
		classes.forEach(cls => detailedClasses.push(jac.getClass(cls.uuid)));
		groups.forEach(g => grpMembers.push(jac.getMembersOf(`${g.id}`)));

		const detClasses = await Promise.all(detailedClasses);
		const detGrpMembers = await Promise.all(grpMembers);
		const grps = detGrpMembers.map((members, idx) => {
			return { name: groups[idx].name, id: groups[idx].id, members: members };
		});

		return grps.map(grp => {
			const pos = detClasses.map(c => c.name).indexOf(grp.name);
			// if the class exists, store it in the new array, else store undefined
			const cls = pos > -1 ? detClasses[pos] : void 0;
			return {
				name: grp.name,
				groupID: grp.id,
				grpMembers: grp.members,
				cls: cls,
			}
		})
	})();
	
	const nGrpsTotal = groups.length;

	// Find the class for every group and compare the two
	for(const clsGrpPair of clsGrpPairs) {
		if(!clsGrpPair.cls)  {
			logFile.appendToBuffer(`Error: Could not find class '${clsGrpPair.name}'`);
			nErrors++;
			continue
		}
		// Compare group- to class members
		const grpMembers = clsGrpPair.grpMembers;
		let clsMembers = [...clsGrpPair.cls.students, ...clsGrpPair.cls.teachers];

		let nMissingGrpMembers = 0;
		let nIncorrectClassMembers = 0;

		// Find the corresponding class member for every group member
		grpMembers.forEach(member => {
			const idx = clsMembers.map(m => m.id).indexOf(member.id);
			// If the class member exists, remove them from the clsMembers list, else inc. nMissingGrpMembers
			idx < 0 ? nMissingGrpMembers++ : clsMembers.splice(idx, 1);
		})
		// All of the users that are still in clsMembers are not part of the group
		nIncorrectClassMembers = clsMembers.length;
		// Inc. nErrors if any members are missing / incorrect
		if(nIncorrectClassMembers + nMissingGrpMembers > 0) {
			nErrors++;
			let errMsg = nIncorrectClassMembers === 0 ? '' : `${nIncorrectClassMembers} incorrect ` +
				`${nMissingGrpMembers > 0 ? 'and ' : 'members'}`;
			if(nMissingGrpMembers > 0) errMsg += `${nMissingGrpMembers} missing users`
			logFile.appendToBuffer(`Error: ${errMsg} in class ${clsGrpPair.name}`);
		}

		nGrpsViewed++;
		displayProgressBar(nGrpsViewed / nGrpsTotal, true, '=');
	}

	return nErrors;
}



export { 
	toRed, toGreen, toYellow, toBlue, toMagenta, toCyan, GroupClassPairObject,
	combineGroupsAndClasses, getValidGroups, createClassFromGroupMembers, checkClassGroups,
	correctClass, verifyChanges,
}
