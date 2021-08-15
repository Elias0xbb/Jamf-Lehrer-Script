import * as fs from 'fs';

// Interface describing the config object
interface ConfigObject {
	createdClassDescription: string,
	classUserGroupRegEx: string,
	verboseMode: boolean,
	minValidGroupCount: number,
	teacherGroupID: number,
}
// Relative path to the script configuration file. Default path: ../config/scriptConfig.json
const CONFIG_PATH = '../config/scriptConfig.json';

// Stores the config object after being loaded
var config = void 0;


/*-< getConfig() >--------------------------------+
| Returns the config object. The object is loaded |
| when the function is called for the first time. |
+------------------------------------------------*/
function getConfig(): ConfigObject {
	// Return object if scriptConfig.json has already been read before
	if(config) return config;
	// Read the config file, then set and return config
	try {
		config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
		return config
	} 
	catch(e) { throw e } // TODO: Error handling(?)
}


export { getConfig }
