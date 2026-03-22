/**
 * KV Schema:
 * - ["subscribes", <user_id: number>]: number[] (Array of `source_id`)
 */
import { getKv } from "../service.ts";

export async function createSubscribe(userId: number, sourceId: number) {
  const kv = getKv();
  const key = ["subscribes", userId] as const;
  const subscribes = (await kv.get<number[]>(key)).value ?? [];
  if (!subscribes.includes(sourceId)) {
    subscribes.push(sourceId);
    await kv.set(key, subscribes);
  }
  return { user_id: userId, source_id: sourceId };
}

export async function getSubscribesByUserId(userId: number): Promise<number[]> {
  const kv = getKv();
  const key = ["subscribes", userId] as const;
  const subscribes = await kv.get<number[]>(key);
  return subscribes.value ?? [];
}

export async function deleteSubscribe(
  userId: number,
  sourceId: number,
): Promise<boolean> {
  const kv = getKv();
  const key = ["subscribes", userId] as const;
  const subscribes = (await kv.get<number[]>(key)).value ?? [];
  const index = subscribes.indexOf(sourceId);
  if (index > -1) {
    subscribes.splice(index, 1);
    await kv.set(key, subscribes);
  }
  return true;
}

export async function isUserSubscribedToSource(
  userId: number,
  sourceId: number,
): Promise<boolean> {
  const subscribes = await getSubscribesByUserId(userId);
  return subscribes.includes(sourceId);
}
