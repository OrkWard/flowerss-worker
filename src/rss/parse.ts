// deno-lint-ignore-file no-explicit-any
import { pipe } from "ramda";
import { XMLParser } from "fast-xml-parser";
import { err, ok, type Result } from "neverthrow";

const parser = new XMLParser({
  alwaysCreateTextNode: true,
  attributesGroupName: "@",
  attributeNamePrefix: "",
  ignoreAttributes: false,
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

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly context?: unknown,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

export class UnsupportedFormatError extends Error {
  constructor(public readonly context?: unknown) {
    super("Unsupported feed format");
    this.name = "UnsupportedFormatError";
  }
}

export type FeedParseError = ParseError | UnsupportedFormatError;

function getLatestPubDate(items: FeedItem[]): number {
  return pipe(
    (feedItems: FeedItem[]) => feedItems.map((item) => item.pubDate),
    (pubDates) => Math.max(...pubDates),
  )(items);
}

function parseXml(content: string): Result<any, ParseError> {
  try {
    return ok(parser.parse(content));
  } catch (error) {
    return err(new ParseError("Failed to parse XML", String(error)));
  }
}

function parseRss(xml: any): Result<Feed, ParseError> {
  const channel = xml.rss.channel;

  if (!channel) {
    return err(
      new ParseError("Invalid RSS: missing channel", {
        format: "rss",
        rssKeys: Object.keys(xml.rss ?? {}),
      }),
    );
  }

  const title = channel.title?.["#text"];
  if (!title) {
    return err(
      new ParseError("Invalid RSS: missing title", {
        format: "rss",
        channelKeys: Object.keys(channel ?? {}),
      }),
    );
  }

  const items: any[] = Array.isArray(channel.item)
    ? channel.item
    : channel.item
    ? [channel.item]
    : [];
  if (!items.length) {
    return err(
      new ParseError("Invalid RSS: missing item", {
        format: "rss",
        title,
        channelKeys: Object.keys(channel ?? {}),
      }),
    );
  }

  const parsedItems: FeedItem[] = [];
  for (const item of items) {
    const itemTitle = item.title?.["#text"];
    const itemLink = item.link?.["#text"];
    const itemPubDate = item.pubDate?.["#text"];

    if (!itemTitle) {
      return err(new ParseError("Invalid RSS item: missing title", { title }));
    }
    if (!itemLink) {
      return err(new ParseError("Invalid RSS item: missing link", { title }));
    }
    if (!itemPubDate) {
      return err(
        new ParseError("Invalid RSS item: missing pubDate", { title }),
      );
    }

    parsedItems.push({
      title: itemTitle,
      link: itemLink,
      description: item.description?.["#text"] || "",
      pubDate: new Date(itemPubDate).getTime(),
      guid: item.guid?.["#text"] || itemLink,
    });
  }

  return ok({
    title,
    description: channel.description?.["#text"] || title,
    lastPub: getLatestPubDate(parsedItems),
    items: parsedItems,
  });
}

function parseAtom(xml: any): Result<Feed, ParseError> {
  const title = xml.feed.title?.["#text"];

  if (!title) {
    return err(
      new ParseError("Invalid Atom: missing title", {
        format: "atom",
        feedKeys: Object.keys(xml.feed ?? {}),
      }),
    );
  }

  const entries: any[] = Array.isArray(xml.feed.entry)
    ? xml.feed.entry
    : xml.feed.entry
    ? [xml.feed.entry]
    : [];

  if (!entries.length) {
    return err(
      new ParseError("Invalid RSS: missing item", {
        format: "atom",
        title,
        feedKeys: Object.keys(xml.feed ?? {}),
      }),
    );
  }

  const parsedItems: FeedItem[] = [];
  for (const entry of entries) {
    const entryTitle = entry.title?.["#text"];
    if (!entryTitle) {
      return err(
        new ParseError("Invalid Atom entry: missing title", { title }),
      );
    }

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
      return err(new ParseError("Invalid Atom entry: missing link", { title }));
    }

    const pubDate = entry.published?.["#text"]
      ? new Date(entry.published["#text"]).getTime()
      : entry.updated?.["#text"]
      ? new Date(entry.updated["#text"]).getTime()
      : null;
    if (!pubDate) {
      return err(
        new ParseError("Invalid Atom entry: missing pubDate", { title }),
      );
    }

    parsedItems.push({
      title: entryTitle,
      link: entryLink,
      description: entry.summary?.["#text"] || "",
      pubDate,
      guid: entry.id?.["#text"] || entryLink,
    });
  }

  return ok({
    title,
    description: xml.feed.subtitle?.["#text"] || title,
    lastPub: getLatestPubDate(parsedItems),
    items: parsedItems,
  });
}

export function tryParseRssOrAtom(
  content: string,
): Result<Feed, FeedParseError> {
  const xmlResult = parseXml(content);
  if (xmlResult.isErr()) {
    return xmlResult;
  }

  const xml = xmlResult.value;

  if (xml.rss) {
    return parseRss(xml);
  }

  if (xml.feed) {
    return parseAtom(xml);
  }

  return err(
    new UnsupportedFormatError({
      rootKeys: Object.keys(xml ?? {}),
    }),
  );
}
