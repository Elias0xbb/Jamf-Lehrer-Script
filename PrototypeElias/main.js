const JAC = require('./JamfAPICalls');
const binTree = require('./bst');
const fs = require('fs');


(async () => {
	let t = await JAC.getAllUsers();

	let teachers = binTree.fromArray(t, dat => {
		return dat.username;
	});

	/*
	t.forEach((teacher, idx) => {
		if(idx !== 0) {
			binTree.append(teachers, new binTree(teacher.username, {
				id: teacher.id,
				firstName: teacher.firstName,
				lastName: teacher.lastName,
				name: teacher.name,
				groupIDs: teacher.groupIds,
				groupNames: teacher.groups
			}));
		}
	});
	*/

	const t0 = process.hrtime();
	const person = await binTree.closest(teachers, null, process.env.TEACHER_NAME);
	const t1 = process.hrtime();
	let timee = `${t1[0]-t0[0]}.${t1[1]-t0[1]}`;
	console.log(person);
	console.log(`Time: ${timee}`);

})();

