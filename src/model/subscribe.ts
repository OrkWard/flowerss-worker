/**
 * KV Schema:
 * - ["subscribes", <user_id: number>]: number[] (Array of `source_id`)
 */
import { Effect, pipe } from "effect";
import { runQuery } from "./utils.ts";

export const createSubscribe = (user_id: number, source_id: number) =>
  pipe(
    runQuery("createSubscribe", async (kv) => {
      const key = ["subscribes", user_id];
      const subscribes = (await kv.get<number[]>(key)).value ?? [];
      if (!subscribes.includes(source_id)) {
        subscribes.push(source_id);
        await kv.set(key, subscribes);
      }
      return { user_id, source_id };
    }),
  );

export const getSubscribesByUserId = (user_id: number) =>
  pipe(
    runQuery("getSubscribesByUserId", async (kv) => {
      const key = ["subscribes", user_id];
      const subscribes = await kv.get<number[]>(key);
      return subscribes.value ?? [];
    }),
  );

export const deleteSubscribe = (user_id: number, source_id: number) =>
  pipe(
    runQuery("deleteSubscribe", async (kv) => {
      const key = ["subscribes", user_id];
      const subscribes = (await kv.get<number[]>(key)).value ?? [];
      const index = subscribes.indexOf(source_id);
      if (index > -1) {
        subscribes.splice(index, 1);
        await kv.set(key, subscribes);
      }
      return true;
    }),
  );

export const isUserSubscribedToSource = (user_id: number, source_id: number) =>
  pipe(
    getSubscribesByUserId(user_id),
    Effect.map((subscribes) => subscribes.includes(source_id)),
  );