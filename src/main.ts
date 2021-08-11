
import {getConfig} from './getConfig';
import * as jac from './JamfAPIcalls'


/*-< main() >--------------------------------------------------------------------+
| Contains the programs main logic.                                              |
| Requests all classes and relevant groups, deletes classes without a respective |
| group, adds missing classes and removes / adds users to correct classes.       |
+-------------------------------------------------------------------------------*/
async function main(): Promise<number> {
	try {
		// Get all classes and relevant groups
		let groups = await getValidGroups();
		let classes = await jac.getAllClasses();

		console.log(groups);
		console.log('\n\nClasses:\n')
		console.log(classes)
		return 0;
	}
	catch(e) {
		// TODO: Error handling
		console.error(e);
		return 1;
	}
}

/*-< getValidGroups() >-----------------------------------------------+
| Requests all groups and returns an array of all relevant groups for |
| which a class (should) exist(s).                                    |
+--------------------------------------------------------------------*/
async function getValidGroups(): Promise<{name: string, id: number}[]> {
	// Get the config for the class name regex and ignored class description
	const config = getConfig();
	const clsNameRegEx = new RegExp(config.classUserGroupRegEx);
	const ignoredDescr = config.createdClassDescription;

	// Request all groups
	const allGroups = await jac.getAllGroups();

	// Create and return an array of the relevant groups
	let validGroups = <{ name: string, id: number }[]> [];
	allGroups.forEach(({name, id, description}) => {
		if(description != ignoredDescr && clsNameRegEx.test(name)) {
			validGroups.push({name: name, id: id});
		}
	})
	
	return validGroups;
}


// Call main function
(async _ => {
	const err = await main();
	process.exit(err);
})()
