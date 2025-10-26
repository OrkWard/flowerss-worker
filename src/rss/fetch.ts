import { Effect, Data } from 'effect';

export class FetchNetworkError extends Data.TaggedError('FetchNetworkError')<{
	readonly error: unknown;
	readonly url: string;
}> {}

export class FetchResponseError extends Data.TaggedError('FetchResponseError')<{
	readonly status: number;
	readonly statusText: string;
	readonly body: string;
	readonly url: string;
}> {}

export class FetchBodyTransformError extends Data.TaggedError('FetchBodyTransformError')<{
	readonly error: unknown;
	readonly url: string;
}> {}

export type FetchError = FetchNetworkError | FetchResponseError | FetchBodyTransformError;

export const get = (url: string) =>
	Effect.gen(function* () {
		const response = yield* Effect.tryPromise({
			try: () =>
				fetch(url, {
					method: 'GET',
					headers: { 'User-Agent': 'FeedlyBot/1.0 (+http://www.feedly.com/feedlybot.html)' },
				}),
			catch: (error) => new FetchNetworkError({ error, url }),
		});

		if (!response.ok) {
			const body = yield* Effect.tryPromise(() => response.text()).pipe(Effect.orElseSucceed(() => '<unable to read response body>'));
			return yield* Effect.fail(new FetchResponseError({ body, status: response.status, statusText: response.statusText, url }));
		}

		return yield* Effect.tryPromise({
			try: () => response.text(),
			catch: (error) => new FetchBodyTransformError({ error, url }),
		});
	});
