
import {getConfig} from './getConfig';
import * as fs from 'fs';


// Buffer to store text in. Will be appended to the log file when writeLogFile is called
var logBuffer = '';

// Get log file path
const pathToLogFile = (() => {
	let path = getConfig().logFileConfig.dirPath;
	if(!'/\\'.includes(path.charAt(path.length - 1))) path += '/';

	path += (getConfig().logFileConfig.logFileName ?? '') === ''
		? `log-${Date()}.txt`
		: getConfig().logFileConfig.logFileName;
	return path;
})();

// Clear log file if autoClear is enabled
(() => {
	try {
		if(getConfig().logFileConfig.autoClear) {
			fs.writeFileSync(pathToLogFile, '');
		}
	}
	catch(e) {
		console.error(e);
	}
})();

// Append text to the log file buffer. Adds a line break after msg
function appendToBuffer(msg: string, condition = true) {
	if(!getConfig().logFileConfig.enableLogFile || !condition) return;
	logBuffer += msg + '\n';
}

// Append logBuffer to the log File
function writeLogFile() {
	if(!getConfig().logFileConfig.enableLogFile) return Promise.resolve('Log file disabled');
	console.log('Writing log file...');
	return new Promise((resolve, reject) => {
		fs.appendFile(pathToLogFile, logBuffer, err => {
			err ? reject(err) : resolve('success');
		});
	})
}


export { appendToBuffer, writeLogFile }
