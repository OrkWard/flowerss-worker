/**
 * KV Schema:
 * - ["subscribes", <user_id: number>]: number[] (Array of `source_id`)
 */
export class SubscribeStore {
  static inject = ["kv"] as const;
  constructor(private kv: Deno.Kv) {}

  async create(userId: number, sourceId: number) {
    const key = ["subscribes", userId] as const;
    const subscribes = (await this.kv.get<number[]>(key)).value ?? [];
    if (!subscribes.includes(sourceId)) {
      subscribes.push(sourceId);
      await this.kv.set(key, subscribes);
    }
    return { user_id: userId, source_id: sourceId };
  }

  async getByUserId(userId: number): Promise<number[]> {
    const key = ["subscribes", userId] as const;
    const subscribes = await this.kv.get<number[]>(key);
    return subscribes.value ?? [];
  }

  async delete(userId: number, sourceId: number): Promise<boolean> {
    const key = ["subscribes", userId] as const;
    const subscribes = (await this.kv.get<number[]>(key)).value ?? [];
    const index = subscribes.indexOf(sourceId);
    if (index > -1) {
      subscribes.splice(index, 1);
      await this.kv.set(key, subscribes);
    }
    return true;
  }

  async isUserSubscribed(userId: number, sourceId: number): Promise<boolean> {
    const subscribes = await this.getByUserId(userId);
    return subscribes.includes(sourceId);
  }
}
