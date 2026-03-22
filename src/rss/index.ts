import { err, ok, type Result, ResultAsync } from "neverthrow";
import { get } from "./fetch.ts";
import {
  type Feed,
  ParseError,
  tryParseRssOrAtom,
  UnsupportedFormatError,
} from "./parse.ts";
import { createSource, getSourceByLink, type Source } from "../model/source.ts";
import {
  createSubscribe,
  deleteSubscribe,
  getSubscribesByUserId,
} from "../model/subscribe.ts";

export type AddRssSubscribeResult = {
  subscribe: {
    user_id: number;
    source_id: number;
  };
  source: Source;
  feed: Feed;
};

export function fetchRss(link: string) {
  return ResultAsync.fromPromise(get(link), (error) => error).andThen(
    (content) => {
      const parsed = tryParseRssOrAtom(content);
      if (parsed.isOk()) {
        return ok(parsed.value);
      }

      const error = parsed.error;
      const baseContext = {
        link,
        contentLength: content.length,
      };

      if (error instanceof ParseError) {
        return err(
          new ParseError(error.message, {
            ...(error.context && typeof error.context === "object"
              ? error.context as Record<string, unknown>
              : {}),
            ...baseContext,
          }),
        );
      }

      if (error instanceof UnsupportedFormatError) {
        return err(
          new UnsupportedFormatError({
            ...(error.context && typeof error.context === "object"
              ? error.context as Record<string, unknown>
              : {}),
            ...baseContext,
          }),
        );
      }

      return err(error);
    },
  );
}

export async function addRssSubscribe(
  userId: number,
  link: string,
): Promise<Result<AddRssSubscribeResult | null, unknown>> {
  console.info(`add subscribe to ${userId}: ${link}`);

  const feedResult = await fetchRss(link);
  if (feedResult.isErr()) {
    return err(feedResult.error);
  }

  const feed = feedResult.value;
  let source = await getSourceByLink(link);
  if (!source) {
    source = await createSource(link, feed.title);
  }

  const existingSubscribe = (await getSubscribesByUserId(userId)).includes(
    source.id,
  );
  if (existingSubscribe) {
    console.info(`already subscribed: ${link} for ${userId}`);
    return ok(null);
  }

  const subscribe = await createSubscribe(userId, source.id);
  return ok({
    subscribe,
    source,
    feed,
  });
}

export async function removeRssSubscribe(
  userId: number,
  sourceId: number,
): Promise<Result<boolean, never>> {
  await deleteSubscribe(userId, sourceId);
  return ok(true);
}
