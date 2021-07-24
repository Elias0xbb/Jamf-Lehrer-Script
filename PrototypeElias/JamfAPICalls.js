const httpsRequests = require('./httpsRequests');
const GROUP_ID_TEACHERS = "3210";


/*-< getAllClasses() >------------------------------------------------------+
| Sends an API request for all Classes and returns a Promise that resolves  |
| to the received JSON in String format.                                    |
+--------------------------------------------------------------------------*/
async function getAllClasses() {
	let classesRaw = await httpsRequests.sendGetReq("/classes");
	classesRaw = classesRaw.classes;
	let classArray = [];
	classesRaw.forEach(cls => {
		classArray.push({
			name: cls.name,
			uuid: cls.uuid,
			teacherCount: cls.teacherCount,
			studentCount: cls.studentCount
		});
	});
	return classArray;
}

/*-< getArrayOfAllClasses() >----------------------------+
| Calls getAllClasses and converts the returned raw data |
| into an Array with the class names and UUIDs.          |
+-------------------------------------------------------*/
async function getArrayOfAllClasses() {
	let classesRaw = await getAllClasses();			// Receive raw classes JSON String
	classesRaw = JSON.parse(classesRaw);			// Parse JSON String to convert it into an Object
	classesRaw = classesRaw.classes;				// Get classes property of the Object

	// Create and return an Array that contains Objects storing class name and GUID for every class
	let classArray = [];
	classesRaw.forEach(cls => {
		classArray.push({
			name: cls.name,
			uuid: cls.uuid,
			teacherCount: cls.teacherCount,
			studentCount: cls.studentCount
		});
	});

	return classArray;
}

async function findClass(uuid) {
	let cls = await httpsRequests.sendGetReq(`/classes/${uuid}`);
	cls = cls.class;
	return {
		uuid: cls.uuid,
		name: cls.name,
		teacherCount: cls.teacherCount,
		studentCount: cls.studentCount,
		teachers: cls.teachers,
		students: cls.students
	};
}

async function getGroups() {
	return await httpsRequests.sendGetReq("/users/groups");
}

async function getAllUsers() {
	const usersRaw = await(httpsRequests.sendGetReq(`/users/`));
	return usersRaw.users;
}
async function allMembersOfGroup(groupId) {
	const usersRaw = await(httpsRequests.sendGetReq(`/users/?memberOf=${groupId}`));
	return usersRaw.users;
}

async function getAllTeachers() {
	return await allMembersOfGroup(GROUP_ID_TEACHERS);
}

exports.getAllClasses = getAllClasses;
exports.getArrayOfAllClasses = getArrayOfAllClasses;
exports.findClass = findClass;
exports.getGroups = getGroups;
exports.allMembersOfGroup = allMembersOfGroup;
exports.getAllTeachers = getAllTeachers;
exports.getAllUsers = getAllUsers;
