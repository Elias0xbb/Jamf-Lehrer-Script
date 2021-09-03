
// File IO
import * as fs from 'fs';
// Config Object interface
import {ConfigObject} from './getConfig';

function setup() {
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
		return 1;
	}
	if(!paramsObj.params) return 0;
	
	// Get the config object and update all the parameters that are passed
	const config = <ConfigObject> JSON.parse(
		fs.readFileSync('../config/scriptConfig.json', { encoding: 'utf8' }));

	// AUTHCODE:
	if(paramsObj.authcode) {
		// Convert utf-8 to base64
		const auth = btoa(unescape(encodeURIComponent(paramsObj.authcode)));
		config.authorization = auth;
	}
	if(paramsObj.teacherGroupName) config.teacherGroupName = paramsObj.teacherGroupName;
	if(paramsObj.teacherGroupID) config.teacherGroupID = paramsObj.teacherGroupID;
	if(paramsObj.lfg_dirPath) config.logFileConfig.dirPath = paramsObj.lfg_dirPath;
	if(paramsObj.lfg_autoClear) config.logFileConfig.autoClear = paramsObj.lfg_autoClear;
	if(paramsObj.lfg_logFileName) config.logFileConfig.logFileName = paramsObj.lfg_logFileName;
	if(paramsObj.lfg_enableLogFile) config.logFileConfig.enableLogFile = paramsObj.enableLogFile;
	if(paramsObj.progressBarWidth) config.progressBarWidth = paramsObj.progressBarWidth;

	
	// Overwrite the config file
	const newConfig = JSON.stringify(config, null, 4);
	console.log('[StartUp] Overwriting the config...');
	fs.writeFileSync('../config/scriptConfig.json', newConfig);
}

(() => {
	setup();
})()
