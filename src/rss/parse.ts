import { XMLParser } from 'fast-xml-parser';

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

/** @throws */
function parseRss(xml: any): Feed {
	const now = Date.now();
	const channel = xml.rss.channel;
	if (!channel) throw new Error('Invalid RSS: missing channel');

	const title = channel.title?.['#text'];
	if (!title) throw new Error('Invalid RSS: missing title');

	const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];

	return {
		title,
		description: channel.description?.['#text'] || title,
		lastBuildDate: channel.lastBuildDate?.['#text'] ? new Date(channel.lastBuildDate?.['#text']).getTime() : now,
		items: items.map((item: any) => {
			const itemTitle = item.title?.['#text'];
			const itemLink = item.link?.['#text'];

			if (!itemTitle) throw new Error('Invalid RSS item: missing title');
			if (!itemLink) throw new Error('Invalid RSS item: missing link');

			return {
				title: itemTitle,
				link: itemLink,
				description: item.description?.['#text'] || '',
				pubDate: item.pubDate?.['#text'] || now,
				guid: item.guid?.['#text'] || itemLink,
			};
		}),
	};
}

/** @throws */
function parseAtom(xml: any): Feed {
	const now = Date.now();
	const title = xml.feed.title?.['#text'];
	if (!title) throw new Error('Invalid Atom: missing title');

	const entries = Array.isArray(xml.feed.entry) ? xml.feed.entry : xml.feed.entry ? [xml.feed.entry] : [];

	return {
		title,
		description: xml.feed.subtitle?.['#text'] || title,
		lastBuildDate: xml.feed.updated?.['#text'] || now,
		items: entries.map((entry: any) => {
			const entryTitle = entry.title?.['#text'];
			if (!entryTitle) throw new Error('Invalid Atom entry: missing title');

			// link
			let entryLink = null;
			if (Array.isArray(entry.link)) {
				const altLink = entry.link.find((l: any) => l['@']?.rel === 'alternate');
				entryLink = altLink?.['@']?.href || entry.link[0]?.['@']?.href;
			} else if (entry.link) {
				entryLink = entry.link?.['@']?.href;
			}
			if (!entryLink) throw new Error('Invalid Atom entry: missing link');

			// date
			const pubDate = entry.published?.['#text']
				? new Date(entry.published['#text']).getTime()
				: entry.updated?.['#text']
					? new Date(entry.updated['#text']).getTime()
					: null;
			if (!pubDate) throw new Error('Invalid Atom entry: missing pubDate');

			return {
				title: entryTitle,
				link: entryLink,
				description: entry.summary?.['#text'] || '',
				pubDate,
				guid: entry.id?.['#text'] || entryLink,
			};
		}),
	};
}

/** @throws */
export function tryParseRssOrAtom(content: string): Feed {
	const xml = parser.parse(content);

	if (xml.rss) {
		return parseRss(xml);
	}

	if (xml.feed) {
		return parseAtom(xml);
	}

	throw new Error('Unsupported feed format: must be RSS 2.0 or Atom 1.0');
}
