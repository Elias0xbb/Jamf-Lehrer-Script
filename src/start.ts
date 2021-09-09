
// Main program
import {execute} from './main';
// File IO
import * as fs from 'fs';
// Config Object interface
import {ConfigObject} from './getConfig';

function setup(): { start: boolean, resetClasses: boolean } {
	// Get parameters
	const paramsObj: any = (_ => {
		let pos = -1;
		const testRegex = /^\{\s*"params"\s*:\s*(true|false)/;
		process.argv.forEach((arg, idx) => { if(testRegex.test(arg)) pos = idx })
		if(pos === -1) return null;
		try {
			let p = process.argv[pos];
			return JSON.parse(p);
		}
		catch(e) {
			console.log(`[StartUp] Warning: ${e}`);
			return null;
		}
	})()

	if(!paramsObj) {
		console.log("[StartUp] Warning: Parameter Object not found!");
		return null;
	}
	if(!paramsObj.params) {
		console.log("[StartUp] No parameters passed./nTo start the correction, use the -s parameter.");
		return null;
	}

	// Get the config object and update all the parameters that are passed
	const config = <ConfigObject> JSON.parse(
		fs.readFileSync('../config/scriptConfig.json', { encoding: 'utf8' }));

	let startMainOpts = { start: false, resetClasses: false };
	// AUTHCODE:
	if(paramsObj.authcode) {
		// Convert utf-8 to base64
		const auth = Buffer.from(unescape(encodeURIComponent(paramsObj.authcode)));
		config.authorization = auth.toString('base64');
	}
	if(paramsObj.teacherGroupName) config.teacherGroupName = paramsObj.teacherGroupName;
	if(paramsObj.teacherGroupID) config.teacherGroupID = paramsObj.teacherGroupID;
	if(paramsObj.lfg_dirPath) config.logFileConfig.dirPath = paramsObj.lfg_dirPath;
	if(paramsObj.lfg_autoClear) config.logFileConfig.autoClear = paramsObj.lfg_autoClear;
	if(paramsObj.lfg_logFileName) config.logFileConfig.logFileName = paramsObj.lfg_logFileName;
	if(paramsObj.lfg_enableLogFile) config.logFileConfig.enableLogFile = paramsObj.enableLogFile;
	if(paramsObj.createdClassDescription) config.createdClassDescription = paramsObj.createdClassDescription;

	// TODO: Add to bash script
	if(paramsObj.minValidGroupCount) config.minValidGroupCount = paramsObj.minValidGroupCount;
	if(paramsObj.changedStudentsLimit) config.changedStudentsLimit = paramsObj.changedStudentsLimit;
	if(paramsObj.changedTeachersLimit) config.changedTeachersLimit = paramsObj.changedTeachersLimit;
	if(paramsObj.coloredConsoleOutputs) config.coloredConsoleOutputs = paramsObj.coloredConsoleOutputs;
	if(paramsObj.progressBarWidth) config.progressBarWidth = paramsObj.progressBarWidth;
	if(paramsObj.progressBarOffset) config.progressBarOffset = paramsObj.progressBarOffset;
	// >----

	// Set start to true to enable program execution
	if(paramsObj.start) startMainOpts.start = true;
	// Set reset param if all classes should be deleted before correction
	if(paramsObj.resetClasses) startMainOpts.resetClasses = true;

	
	// Overwrite the config file
	const newConfig = JSON.stringify(config, null, 4);
	console.log('[StartUp] Overwriting the config...');
	fs.writeFileSync('../config/scriptConfig.json', newConfig);

	return startMainOpts;
}

// Start the startup script
(async () => {
	const startMainOpts = setup();
	// If main should not be started or null is returned, stop the program
	if((startMainOpts ?? { start: false }).start === false) process.exit(0);
	
	// Start main
	await execute(startMainOpts.resetClasses);
})()
