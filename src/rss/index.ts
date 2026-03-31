import { get } from "./fetch.ts";
import { type Feed, tryParseRssOrAtom } from "./parse.ts";
import { createSource, getSourceByLink, type Source } from "../model/source.ts";
import {
  createSubscribe,
  deleteSubscribe,
  getSubscribesByUserId,
} from "../model/subscribe.ts";
import { ParseError, UnsupportedFormatError } from "../errors.ts";

export type AddRssSubscribeResult = {
  subscribe: {
    user_id: number;
    source_id: number;
  };
  source: Source;
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
  userId: number,
  link: string,
): Promise<AddRssSubscribeResult | null> {
  console.info(`add subscribe to ${userId}: ${link}`);

  const feed = await fetchRss(link);

  let source = await getSourceByLink(link);
  if (!source) {
    source = await createSource(link, feed.title);
  }

  const existingSubscribe = (await getSubscribesByUserId(userId)).includes(
    source.id,
  );
  if (existingSubscribe) {
    console.info(`already subscribed: ${link} for ${userId}`);
    return null;
  }

  const subscribe = await createSubscribe(userId, source.id);
  return {
    subscribe,
    source,
    feed,
  };
}

export async function removeRssSubscribe(
  userId: number,
  sourceId: number,
): Promise<void> {
  await deleteSubscribe(userId, sourceId);
}
