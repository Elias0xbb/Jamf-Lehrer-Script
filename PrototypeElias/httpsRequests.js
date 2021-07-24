const AUTH = "NzA5ODQ3OTY6Wjg4MTZWTEI2MzVCMzRDNzhIVVM2UzJLMUNISjY3RFo=";
const https = require('https');

const HOST = "api.zuludesk.com";
const STD_HEADERS = {
	"Authorization": `Basic ${AUTH}`,
	"Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
	"X-Server-Protocol-Version": "3",
};

function sendGetReq(path) {
	const options = { host: HOST, path: path, headers: STD_HEADERS };

	return new Promise((resolve, reject) => {
			https.get(options, res => {
			if(res.statusCode != 200) reject(res.statusCode);

			let buffer = "";
			res.on('data', d => { buffer += d; });
			res.on('end', () => {
				const json = JSON.parse(buffer);
				resolve(json);
			})
		}).on('error', e => {
			reject(e);
		});
	})
}

function sendRequest(path, method) {
	const options = { host: HOST, path: path, method: method, headers: STD_HEADERS };

	return new Promise((resolve, reject) => {
		const req = https.request(options, res => {
			if(res.statusCode != 200) reject(res.statusCode);

			let buffer = "";
			res.on('data', d => { buffer += d; });
			res.on('end', () => {
				const json = JSON.parse(buffer);
				resolve(json);
			});
		}).on('error', e => {
			reject(e);
		});
		req.end();
	});
}

exports.sendGetReq = sendGetReq;
exports.sendRequest = sendRequest;
