import type { ApiError, ApiMethods, ApiResponse } from '@telegraf/types';
import { env } from 'cloudflare:workers';
import { Data, Effect } from 'effect';

type Args<T extends keyof ApiMethods<File>> = ApiMethods<File>[T] extends (...args: infer P) => any ? P[0] : never;
type Response<T extends keyof ApiMethods<File>> = ApiMethods<File>[T] extends (...args: any[]) => infer P ? P : never;

const BASE_URL = 'http://localhost:10000/bot' + env.bot_token + '/';

export class TgNetworkError extends Data.TaggedError('TgNetworkError')<{
	readonly error: unknown;
	readonly api: string;
}> {}

export class TgResponseError extends Data.TaggedError('TgResponseError')<{
	readonly status: number;
	readonly statusText: string;
	readonly body: string;
	readonly api: string;
}> {}

export class TgBodyParseError extends Data.TaggedError('TgBodyParseError')<{
	readonly error: unknown;
	readonly api: string;
}> {}

export class TgApiError extends Data.TaggedError('TgApiError')<ApiError> {}

export type TgError = TgNetworkError | TgResponseError | TgBodyParseError;

export const callTelegram = <T extends keyof ApiMethods<File>>(api: T, params: Args<T>) =>
	Effect.gen(function* () {
		const response = yield* Effect.tryPromise({
			try: () =>
				fetch(BASE_URL + api, {
					method: 'POST',
					body: JSON.stringify(params),
					headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				}),
			catch: (error) => new TgNetworkError({ error, api }),
		});

		if (!response.ok) {
			const body = yield* Effect.tryPromise(() => response.text()).pipe(Effect.orElseSucceed(() => '<unable to read response body>'));
			return yield* Effect.fail(new TgResponseError({ body, status: response.status, statusText: response.statusText, api }));
		}

		const apiResponse = yield* Effect.tryPromise({
			try: () => response.json() as Promise<ApiResponse<Response<T>>>,
			catch: (error) => new TgBodyParseError({ error, api }),
		});

		if (apiResponse.ok === false) {
			return yield* Effect.fail(new TgApiError(apiResponse));
		}

		return apiResponse.result;
	});
