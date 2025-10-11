import { get } from './fetch';
import { tryParseRssOrAtom } from './parse';
import { createSource, getSourceByLink, getSourceById } from '../model/source';
import { createSubscribe, getSubscribeByUserAndSource, deleteSubscribe, getSubscribesByUserId } from '../model/subscribe';

export async function addRssSubscribe(userId: number, link: string) {
	try {
		const content = await get(link);
		const feed = tryParseRssOrAtom(content);

		let source = await getSourceByLink(link);
		if (!source) {
			source = await createSource(link, feed.title);
			if (!source) {
				throw new Error('Failed to create source');
			}
		}

		const existingSubscribe = await getSubscribeByUserAndSource(userId, source.id);
		if (existingSubscribe) {
			throw new Error('Already subscribed to this feed');
		}

		const subscribe = await createSubscribe(userId, source.id);
		if (!subscribe) {
			throw new Error('Failed to create subscription');
		}

		return {
			subscribe,
			source,
			feed,
		};
	} catch (e) {
		console.error('Failed to add RSS subscription:', e);
		throw e;
	}
}

/** @throws */
export async function removeRssSubscribe(subscribeId: number) {
	try {
		await deleteSubscribe(subscribeId);
	} catch (e) {
		console.error('Failed to remove RSS subscription:', e);
		throw e;
	}
}

/**
 * Get all RSS subscriptions for a user with source details
 * @param userId - Telegram user ID
 * @returns Array of subscriptions with source details
 */
export async function listRssSubscribes(userId: number) {
	try {
		const subscribes = await getSubscribesByUserId(userId);
		const result = [];

		for (const subscribe of subscribes) {
			const source = await getSourceById(subscribe.source_id);
			if (source) {
				result.push({
					subscribe,
					source,
				});
			}
		}

		return result;
	} catch (e) {
		console.error('Failed to list RSS subscriptions:', e);
		throw e;
	}
}
