import { get } from './fetch';
import { tryParseRssOrAtom } from './parse';
import { createSource, getSourceByLink } from '../model/source';
import { createSubscribe, getSubscribeByUserAndSource, deleteSubscribe, getSubscribesByUserId } from '../model/subscribe';
import { Effect } from 'effect';

export const addRssSubscribe = (userId: number, link: string) =>
	Effect.gen(function* () {
		const content = yield* get(link);
		const feed = yield* tryParseRssOrAtom(content);
		let source = yield* getSourceByLink(link);
		if (!source) {
			source = yield* createSource(link, feed.title);
		}

		const existingSubscribe = yield* getSubscribeByUserAndSource(userId, source.id);
		if (existingSubscribe) {
			return yield* Effect.fail(new Error('Already subscribed to this feed'));
		}
		const subscribe = yield* createSubscribe(userId, source.id);
		return {
			subscribe,
			source,
			feed,
		};
	});
export const removeRssSubscribe = (subscribeId: number) => deleteSubscribe(subscribeId);

export const fetchRss = () => Effect.succeed(Effect.void);
