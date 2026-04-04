// deno-lint-ignore-file no-explicit-any
import { pipe } from "ramda";
import { XMLParser } from "fast-xml-parser";
import { ParseError, UnsupportedFormatError } from "../errors.ts";

const parser = new XMLParser({
  alwaysCreateTextNode: true,
  attributesGroupName: "@",
  attributeNamePrefix: "",
  ignoreAttributes: false,
  processEntities: false,
  htmlEntities: true,
});

export type Feed = {
  title: string;
  description: string;
  lastPub: number;
  items: FeedItem[];
};

export type FeedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: number;
  guid: string;
};

export type FeedParseError = ParseError | UnsupportedFormatError;

function getLatestPubDate(items: FeedItem[]): number {
  return pipe(
    (feedItems: FeedItem[]) => feedItems.map((item) => item.pubDate),
    (pubDates) => Math.max(...pubDates),
  )(items);
}

function parseXml(content: string): any {
  try {
    return parser.parse(content);
  } catch (cause) {
    throw new ParseError("Failed to parse XML", { cause: String(cause) });
  }
}

function parseRss(xml: any): Feed {
  const channel = xml.rss.channel;

  if (!channel) {
    throw new ParseError("Invalid RSS: missing channel", {
      format: "rss",
      rssKeys: Object.keys(xml.rss ?? {}),
    });
  }

  const title = channel.title?.["#text"] || "(Untitled)";

  const items: any[] = Array.isArray(channel.item)
    ? channel.item
    : channel.item
    ? [channel.item]
    : [];
  if (!items.length) {
    throw new ParseError("Invalid RSS: missing item", {
      format: "rss",
      title,
      channelKeys: Object.keys(channel ?? {}),
    });
  }

  const parsedItems: FeedItem[] = [];
  for (const item of items) {
    const itemTitle = item.title?.["#text"] || "(Untitled)";
    const itemLink = item.link?.["#text"];
    const itemPubDate = item.pubDate?.["#text"];

    if (!itemLink) {
      throw new ParseError("Invalid RSS item: missing link", { title });
    }
    if (!itemPubDate) {
      throw new ParseError("Invalid RSS item: missing pubDate", { title });
    }

    parsedItems.push({
      title: itemTitle,
      link: itemLink,
      description: item.description?.["#text"] || "",
      pubDate: new Date(itemPubDate).getTime(),
      guid: item.guid?.["#text"] || itemLink,
    });
  }

  return {
    title,
    description: channel.description?.["#text"] || title,
    lastPub: getLatestPubDate(parsedItems),
    items: parsedItems,
  };
}

function parseAtom(xml: any): Feed {
  const title = xml.feed.title?.["#text"] || "(Untitled)";

  const entries: any[] = Array.isArray(xml.feed.entry)
    ? xml.feed.entry
    : xml.feed.entry
    ? [xml.feed.entry]
    : [];

  if (!entries.length) {
    throw new ParseError("Invalid RSS: missing item", {
      format: "atom",
      title,
      feedKeys: Object.keys(xml.feed ?? {}),
    });
  }

  const parsedItems: FeedItem[] = [];
  for (const entry of entries) {
    const entryTitle = entry.title?.["#text"] || "(Untitled)";

    let entryLink = null;
    if (Array.isArray(entry.link)) {
      const altLink = entry.link.find((link: any) =>
        link["@"]?.rel === "alternate"
      );
      entryLink = altLink?.["@"]?.href || entry.link[0]?.["@"]?.href;
    } else if (entry.link) {
      entryLink = entry.link?.["@"]?.href;
    }
    if (!entryLink) {
      throw new ParseError("Invalid Atom entry: missing link", { title });
    }

    const pubDate = entry.published?.["#text"]
      ? new Date(entry.published["#text"]).getTime()
      : entry.updated?.["#text"]
      ? new Date(entry.updated["#text"]).getTime()
      : null;
    if (!pubDate) {
      throw new ParseError("Invalid Atom entry: missing pubDate", { title });
    }

    parsedItems.push({
      title: entryTitle,
      link: entryLink,
      description: entry.summary?.["#text"] || "",
      pubDate,
      guid: entry.id?.["#text"] || entryLink,
    });
  }

  return {
    title,
    description: xml.feed.subtitle?.["#text"] || title,
    lastPub: getLatestPubDate(parsedItems),
    items: parsedItems,
  };
}

export function tryParseRssOrAtom(content: string): Feed {
  const xml = parseXml(content);

  if (xml.rss) {
    return parseRss(xml);
  }

  if (xml.feed) {
    return parseAtom(xml);
  }

  throw new UnsupportedFormatError({
    rootKeys: Object.keys(xml ?? {}),
  });
}
