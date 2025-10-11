import type { ApiMethods, ApiResponse } from '@telegraf/types';
import { env } from 'cloudflare:workers';

type Args<T extends keyof ApiMethods<File>> = ApiMethods<File>[T] extends (...args: infer P) => any ? P[0] : never;
type Response<T extends keyof ApiMethods<File>> = ApiMethods<File>[T] extends (...args: any[]) => infer P ? P : never;

const BASE_URL = 'http://localhost:10000/bot' + env.bot_token + '/';

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

/** @throws */
export async function callTelegram<T extends keyof ApiMethods<File>>(api: T, params: Args<T>) {
	const response = (await post(api, params)) as ApiResponse<Response<T>>;
	if (response.ok === false) {
		console.error(`Telegram api error, code: ${response.error_code} | message: ${response.description}`);
		throw new Error('telegram api error, check log');
	}
	return response.result;
}
