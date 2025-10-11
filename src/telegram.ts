import type { ApiMethods, ApiResponse } from '@telegraf/types';
import { post } from './request';

type Args<T extends keyof ApiMethods<File>> = ApiMethods<File>[T] extends (...args: infer P) => any ? P[0] : never;
type Response<T extends keyof ApiMethods<File>> = ApiMethods<File>[T] extends (...args: any[]) => infer P ? P : never;

/**
 * @throws
 */
export async function setWebhook(params: Args<'setWebhook'>) {
	return await post('setWebhook', params);
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
