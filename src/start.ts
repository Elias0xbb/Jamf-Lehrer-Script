
// File IO
import * as fs from 'fs';
// Config Object interface
import {ConfigObject} from './getConfig';

function setup() {
	// Get the config object and update all the parameters that are passed
	const config = <ConfigObject> JSON.parse(
		fs.readFileSync('../config/scriptConfig.json', { encoding: 'utf8' }));
	let changedConfig = false;

	if((process.env.authcode ?? '') != '') {
		// Convert utf-8 to base64
		const auth = btoa(unescape(encodeURIComponent(process.env.authcode)));
		config.authorization = auth;
		changedConfig = true;
	}

	if(changedConfig) {
		const newConfig = JSON.stringify(config);
		console.log('Overwriting the config...');
		fs.writeFileSync('../config/scriptConfig.json', newConfig);
	}
}

(() => {
	setup();
})()
