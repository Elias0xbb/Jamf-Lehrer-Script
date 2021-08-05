
import {IncomingMessage} from 'http';
import * as HTTPS from 'https';

const AUTHORIZATION = require('./auth');
const HOSTNAME = 'api.zuludesk.com';


/*-< sendRequest(path, method, params) >------------------------------------------------------+
| Sends an https request to https://api.zuludesk.com and returns a Promise with the response. |
| If an error occurs, the Promise will be rejected and the error code/message returned        |
+--------------------------------------------------------------------------------------------*/
function sendRequest(path: string, method: string, params: object) {
	const options = {
		host: HOSTNAME,
		path: path,
		method: method,
		headers: {
			"Authorization": `Basic ${AUTHORIZATION}`,
			"Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
			"X-Server-Protocol-Version": "3",
		}
	}

	// Send https request and return a Promise that resolves to the returned object
	return new Promise((resolve, reject) => {
		const req = HTTPS.request(options, (res: IncomingMessage) => {
			// Check response status and reject if status != OK (200)
			if(res.statusCode != 200) reject(`ERROR: statusCode = ${res.statusCode}, statusMessage = ${res.statusMessage}`);
			
			// Store the incoming data in a buffer
			let buffer = '';
			res.on('data', (d: string) => buffer += d );
			// Return the received object at the end of the transmission
			res.on('end', () => {
				try { 
					var receivedObject = JSON.parse(buffer);
					resolve(receivedObject);
				} catch(e) {
					reject(e);
				}
			});
		})
		.on('error', reject);

		if(params) req.write(JSON.stringify(params));
		req.end();
	})
}


export { sendRequest }
