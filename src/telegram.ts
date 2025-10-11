import type { ApiMethods } from '@telegraf/types';
import { post } from './request';

type Args<T extends keyof ApiMethods<File>> = ApiMethods<File>[T] extends (...args: infer P) => any ? P[0] : never;

/**
 * @throws
 */
export async function setWebhook(params: Args<'setWebhook'>) {
	return await post('setWebhook', params);
}

/** @throws */
export async function callTelegram<T extends keyof ApiMethods<File>>(api: T, params: Args<T>) {
	return await post(api, params);
}
