
import {getConfig} from './getConfig';
import * as fs from 'fs';


const config = getConfig();
// Buffer to store text in. Will be appended to the log file when writeLogFile is called
var logBuffer = '';

// Get log file path
const pathToLogFile = (() => {
	let path = config.logFileConfig.dirPath;
	if(!'/\\'.includes(path.charAt(path.length - 1))) path += '/';

	path += (config.logFileConfig.logFileName ?? '') === ''
		? `log-${Date()}.txt`
		: config.logFileConfig.logFileName;
	return path;
})();

// Clear log file if autoClear is enabled
(() => {
	try {
		if(config.logFileConfig.autoClear) {
			fs.writeFileSync(pathToLogFile, '');
		}
	}
	catch(e) {
		console.error(e);
	}
})();

// Append text to the log file buffer. Adds a line break after msg
function appendToBuffer(msg: string, condition = true) {
	if(!config.logFileConfig.enableLogFile || !condition) return;
	logBuffer += msg + '\n';
}

// Append logBuffer to the log File
function writeLogFile() {
	if(!config.logFileConfig.enableLogFile) return Promise.resolve('Log file disabled');
	console.log('Writing log file...');
	return new Promise((resolve, reject) => {
		fs.appendFile(pathToLogFile, logBuffer, err => {
			err ? reject(err) : resolve('success');
		});
	})
}


export { appendToBuffer, writeLogFile }
