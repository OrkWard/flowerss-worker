import { get } from "./fetch.ts";
import { tryParseRssOrAtom } from "./parse.ts";
import { createSource, getSourceByLink } from "../model/source.ts";
import {
  createSubscribe,
  deleteSubscribe,
  getSubscribesByUserId,
} from "../model/subscribe.ts";
import { Effect } from "effect";

export const fetchRss = (link: string) =>
  Effect.gen(function* () {
    const content = yield* get(link);
    return yield* tryParseRssOrAtom(content);
  });

export const addRssSubscribe = (userId: number, link: string) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`add subscribe to ${userId}: ${link}`);
    const feed = yield* fetchRss(link);
    let source = yield* getSourceByLink(link);
    if (!source) {
      source = yield* createSource(link, feed.title);
    }

    const existingSubscribe = (yield* getSubscribesByUserId(userId)).includes(
      source.id,
    );
    if (existingSubscribe) {
      yield* Effect.logInfo(`already subscribed: ${link} for ${userId}`);
      return yield* Effect.void;
    }
    const subscribe = yield* createSubscribe(userId, source.id);
    return {
      subscribe,
      source,
      feed,
    };
  });

export const removeRssSubscribe = (userId: number, sourceId: number) =>
  deleteSubscribe(userId, sourceId);
