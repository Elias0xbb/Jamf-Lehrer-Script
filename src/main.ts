
// Jamf API call functions lib
import * as jac from './JamfAPIcalls';
// Helper Functions
import * as hf from './helperFunctions';
// config file
import {getConfig} from './getConfig';
// Progress bar
import * as progBar from './ProgressBar';
// Log File
import * as logFile from './logFile';



/*-< main() >--------------------------------------------------------------------+
| Contains the program's main logic.                                             |
| Requests all classes and relevant groups, deletes classes without a respective |
| group, adds missing classes and removes / adds users to correct classes.       |
+-------------------------------------------------------------------------------*/
async function main(deleteClasses: boolean): Promise<number> {
	try {
		// Clear config constant:
		getConfig(true);
		// Init the progress bar
		progBar.initProgressBar(getConfig().progressBarWidth, getConfig().progressBarOffset);

		// Get all classes and relevant groups
		console.log(hf.toGreen(`Requesting classes and groups...`));
		let groups = await hf.getValidGroups();
		let classes = await jac.getAllClasses();
		console.log(hf.toCyan(`Received ${groups.length} class groups and ${classes.length} classes.`));

		// Delete all classes before execution (if enabled)
		if(deleteClasses) {
			console.log(hf.toMagenta('Deleting all classes'));
			let res = [];
			// Send api request for every class (DELETE)
			classes.forEach(c => res.push(jac.deleteClass(c.uuid)));
			// Wait for all classes to be deleted
			res = await Promise.all(res);
			console.log(`Deleted ${res.length} classes.`);
			// Request all classes to see if any exist
			classes = await jac.getAllClasses();

			if(classes.length > 0) console.log(hf.toRed(`${classes.length} classes found.`));
		}

		// Create an array of group-class pairs
		let classGroupPairs = hf.combineGroupsAndClasses(groups, classes);

		// Delete all classes that shouldn't exist
		const nClassesToDelete = classes.length;
		let nDeletedClasses = 0;
		if(classes.length > 0) console.log(`Deleting ${nClassesToDelete} classes...`);

		for(const cls of classes) {
			logFile.appendToBuffer(`-> Deleting class '${cls.name}'...`);

			nDeletedClasses++;
			let res = await jac.deleteClass(cls.uuid);
			// Display warning if response message isn't 'ClassDeleted'
			// TODO: Collect warnings and report after program finishes
			if(res != 'ClassDeleted') logFile.appendToBuffer(
				`Warning': Received response ${res} while trying to delete class ${cls.name}`
			);

			progBar.displayProgressBar(nDeletedClasses / nClassesToDelete, true, '*');
		}
	
		// Check all group-class pairs and create/correct missing/incorrect classes
		await hf.checkClassGroups(classGroupPairs);

		console.log(hf.toMagenta(`Deleted ${nDeletedClasses} classes.\n`));

		// Go through all classes and groups again to check for errors
		const nErrors = await hf.verifyChanges();

		// Print the number of errors that were found
		if(nErrors > 0) {
			console.log(hf.toRed(`\n${nErrors} errors found!\n`))
		}
		else console.log(hf.toGreen("\nVerification successful with 0 errors found!\n"));
		
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
async function execute(deleteClasses: boolean) {
	const err = await main(deleteClasses);
	await logFile.writeLogFile();
	process.exit(err);
}

export { execute };
