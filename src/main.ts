
// Jamf API call functions lib
import * as jac from './JamfAPIcalls';
// Helper Functions
import * as hf from './helperFunctions';
// config file
import {config} from './helperFunctions';

// Prints a message if verbose mode is active TODO: remove and add debug log
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
		let groups = await hf.getValidGroups();
		let classes = await jac.getAllClasses();
		console.log(hf.toCyan(`Received ${groups.length} class groups and ${classes.length} classes.\n`));

		// Create an array of group-class pairs
		verbosePrint(`Creating class-group pair array...`);
		let classGroupPairs = hf.combineGroupsAndClasses(groups, classes);

		// Delete all classes that shouldn't exist
		verbosePrint(`Deleting ${classes.length} classes...`, classes.length > 0);
		let nDeletedClasses = 0;
		for(const cls of classes) {
			verbosePrint(`-> Deleting class '${cls.name}'...`);
			nDeletedClasses++;
			let res = await jac.deleteClass(cls.uuid);
			// Display warning if response message isn't 'ClassDeleted'
			if(res != 'ClassDeleted') console.log(
				`${hf.toYellow('Warning')}: Received response ${res} while trying to delete class ${cls.name}`
			);
		}
	
		// Check all group-class pairs and create/correct missing/incorrect classes
		await hf.checkClassGroups(classGroupPairs);

		console.log(hf.toMagenta(`Deleted ${nDeletedClasses} classes.\n`));

		// Go through all classes and groups again to check for errors
		console.log(`Verifying classes...`)
		const nErrors = await hf.verifyChanges();

		// Print the number of errors that were found
		if(nErrors > 0) {
			console.log(hf.toRed(`${nErrors} errors found!`))
		}
		else console.log(hf.toGreen("Verification successful with 0 errors found!"));
		
		// TODO: fix errors

		// Print message marking the end of the program
		console.log(hf.toGreen('DONE!'));
		// Return 0 if the execution was successful
		return 0;
	}
	catch(e) {
		// TODO: Error handling
		console.log(`${hf.toRed('Error')}: ${e}`);
		return 1;
	}
}



// Call main function
(async _ => {
	const err = await main();
	process.exit(err);
})()
