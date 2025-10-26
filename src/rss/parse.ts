import { XMLParser } from 'fast-xml-parser';
import { Effect, Data } from 'effect';

const parser = new XMLParser({
	alwaysCreateTextNode: true,
	attributesGroupName: '@',
	attributeNamePrefix: '',
	ignoreAttributes: false,
});

export type Feed = {
	title: string;
	description: string;
	lastBuildDate: number;
	items: FeedItem[];
};

type FeedItem = {
	title: string;
	link: string;
	description: string;
	pubDate: number;
	guid: string;
};

export class ParseError extends Data.TaggedError('ParseError')<{
	readonly message: string;
	readonly context?: string;
}> {}

export class UnsupportedFormatError extends Data.TaggedError('UnsupportedFormatError')<{
	readonly message: string;
}> {}

export type FeedParseError = ParseError | UnsupportedFormatError;

const parseXml = (content: string) =>
	Effect.try({
		try: () => parser.parse(content),
		catch: (error) => new ParseError({ message: 'Failed to parse XML', context: String(error) }),
	});

const parseRss = (xml: any): Effect.Effect<Feed, ParseError> =>
	Effect.gen(function* () {
		const now = Date.now();
		const channel = xml.rss.channel;

		if (!channel) {
			return yield* Effect.fail(new ParseError({ message: 'Invalid RSS: missing channel' }));
		}

		const title = channel.title?.['#text'];
		if (!title) {
			return yield* Effect.fail(new ParseError({ message: 'Invalid RSS: missing title' }));
		}

		const items: any[] = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];

		const parsedItems = yield* Effect.all(
			items.map((item: any) =>
				Effect.gen(function* () {
					const itemTitle = item.title?.['#text'];
					const itemLink = item.link?.['#text'];

					if (!itemTitle) {
						return yield* Effect.fail(new ParseError({ message: 'Invalid RSS item: missing title' }));
					}
					if (!itemLink) {
						return yield* Effect.fail(new ParseError({ message: 'Invalid RSS item: missing link' }));
					}

					return {
						title: itemTitle,
						link: itemLink,
						description: item.description?.['#text'] || '',
						pubDate: item.pubDate?.['#text'] || now,
						guid: item.guid?.['#text'] || itemLink,
					} as FeedItem;
				}),
			),
			{ concurrency: 'unbounded' },
		);

		return {
			title,
			description: channel.description?.['#text'] || title,
			lastBuildDate: channel.lastBuildDate?.['#text'] ? new Date(channel.lastBuildDate?.['#text']).getTime() : now,
			items: parsedItems,
		};
	});

const parseAtom = (xml: any): Effect.Effect<Feed, ParseError> =>
	Effect.gen(function* () {
		const now = Date.now();
		const title = xml.feed.title?.['#text'];

		if (!title) {
			return yield* Effect.fail(new ParseError({ message: 'Invalid Atom: missing title' }));
		}

		const entries: any[] = Array.isArray(xml.feed.entry) ? xml.feed.entry : xml.feed.entry ? [xml.feed.entry] : [];

		const parsedItems = yield* Effect.all(
			entries.map((entry: any) =>
				Effect.gen(function* () {
					const entryTitle = entry.title?.['#text'];
					if (!entryTitle) {
						return yield* Effect.fail(new ParseError({ message: 'Invalid Atom entry: missing title' }));
					}

					// link
					let entryLink = null;
					if (Array.isArray(entry.link)) {
						const altLink = entry.link.find((l: any) => l['@']?.rel === 'alternate');
						entryLink = altLink?.['@']?.href || entry.link[0]?.['@']?.href;
					} else if (entry.link) {
						entryLink = entry.link?.['@']?.href;
					}
					if (!entryLink) {
						return yield* Effect.fail(new ParseError({ message: 'Invalid Atom entry: missing link' }));
					}

					// date
					const pubDate = entry.published?.['#text']
						? new Date(entry.published['#text']).getTime()
						: entry.updated?.['#text']
							? new Date(entry.updated['#text']).getTime()
							: null;
					if (!pubDate) {
						return yield* Effect.fail(new ParseError({ message: 'Invalid Atom entry: missing pubDate' }));
					}

					return {
						title: entryTitle,
						link: entryLink,
						description: entry.summary?.['#text'] || '',
						pubDate,
						guid: entry.id?.['#text'] || entryLink,
					} as FeedItem;
				}),
			),
			{ concurrency: 'unbounded' },
		);

		return {
			title,
			description: xml.feed.subtitle?.['#text'] || title,
			lastBuildDate: xml.feed.updated?.['#text'] || now,
			items: parsedItems,
		};
	});

export const tryParseRssOrAtom = (content: string): Effect.Effect<Feed, FeedParseError> =>
	Effect.gen(function* () {
		const xml = yield* parseXml(content);

		if (xml.rss) {
			return yield* parseRss(xml);
		}

		if (xml.feed) {
			return yield* parseAtom(xml);
		}

		return yield* Effect.fail(new UnsupportedFormatError({ message: 'Unsupported feed format: must be RSS 2.0 or Atom 1.0' }));
	});
