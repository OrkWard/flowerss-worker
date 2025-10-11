import { env } from 'cloudflare:workers';

const BASE_URL = 'https://api.telegram.org/bot' + env.bot_token + '/';

/** @throws */
export async function post(api: string, params: unknown) {
	let response;
	try {
		response = await fetch(BASE_URL + api, {
			method: 'POST',
			body: JSON.stringify(params),
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		});
	} catch (e) {
		console.error('fetch network error', e);
		throw e;
	}

	if (!response.ok) {
		console.error('fetch response code error', response.status, response.statusText, await response.text());
		throw new Error(`http code error: ${response.status}`);
	}

	try {
		return await response.json();
	} catch (e) {
		console.error('parse response error', e);
		throw e;
	}
}
