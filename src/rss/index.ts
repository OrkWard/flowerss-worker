import { get } from "./fetch.ts";
import { type Feed, tryParseRssOrAtom } from "./parse.ts";
import { SourceStore } from "../model/source.ts";
import { SubscribeStore } from "../model/subscribe.ts";
import { ParseError, UnsupportedFormatError } from "../errors.ts";

export type AddRssSubscribeResult = {
  subscribe: {
    user_id: number;
    source_id: number;
  };
  source: { id: number; title: string; link: string };
  feed: Feed;
};

export async function fetchRss(link: string): Promise<Feed> {
  let content: string;
  try {
    content = await get(link);
  } catch (cause) {
    throw new Error(`Failed to fetch RSS from ${link}`, { cause });
  }

  const baseContext = {
    link,
    contentLength: content.length,
  };

  try {
    return tryParseRssOrAtom(content);
  } catch (error) {
    if (error instanceof ParseError) {
      throw new ParseError(error.message, {
        ...error.context,
        ...baseContext,
      });
    }

    if (error instanceof UnsupportedFormatError) {
      throw new UnsupportedFormatError({
        ...error.context,
        ...baseContext,
      });
    }

    throw error;
  }
}

export async function addRssSubscribe(
  source: SourceStore,
  subscribe: SubscribeStore,
  userId: number,
  link: string,
): Promise<AddRssSubscribeResult | null> {
  console.info(`add subscribe to ${userId}: ${link}`);

  const feed = await fetchRss(link);

  let src = await source.getByLink(link);
  if (!src) {
    src = await source.create(link, feed.title);
  }

  const existingSubscribe = (await subscribe.getByUserId(userId)).includes(
    src.id,
  );
  if (existingSubscribe) {
    console.info(`already subscribed: ${link} for ${userId}`);
    return null;
  }

  const sub = await subscribe.create(userId, src.id);
  return {
    subscribe: sub,
    source: src,
    feed,
  };
}

export async function removeRssSubscribe(
  subscribe: SubscribeStore,
  userId: number,
  sourceId: number,
): Promise<void> {
  await subscribe.delete(userId, sourceId);
}
