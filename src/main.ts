// Main Program
import {getConfig} from './getConfig';
import * as jac from './JamfAPIcalls'

async function main() {
	try {
		let groups = await getValidGroups();
	}
	catch(e) {
		console.error(e);
		process.exit(1)
	}
}

async function getValidGroups(): Promise<{name: string, id: number}[]> {
	const config = getConfig();
	const clsNameRegEx = new RegExp(config.classUserGroupRegEx);
	const ignoredDescr = config.createdClassDescription;

	const allGroups = await jac.getAllGroups();
	let validGroups = <{ name: string, id: number }[]> [];

	allGroups.forEach(({name, id, description}) => {
		if(description != ignoredDescr && clsNameRegEx.test(name)) {
			validGroups.push({name: name, id: id});
		}
	})
	
	return validGroups;
}
