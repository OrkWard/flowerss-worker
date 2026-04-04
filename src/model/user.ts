/**
 * KV Schema:
 * - ["user", <id: number>]: User - Individual user record
 */
export interface User {
  id: number;
  first_name: string;
}

export class UserStore {
  static inject = ["kv"] as const;
  constructor(private kv: Deno.Kv) {}

  async getAll(): Promise<User[]> {
    const users: User[] = [];
    const iter = this.kv.list<User>({ prefix: ["user"] });
    for await (const entry of iter) {
      users.push(entry.value);
    }
    return users;
  }

  async get(id: number): Promise<User | null> {
    const user = await this.kv.get<User>(["user", id]);
    return user.value ?? null;
  }

  async add(user: User): Promise<User> {
    const key = ["user", user.id] as const;
    const existing = await this.kv.get<User>(key);

    if (existing.value) {
      throw new Error(`User ${user.id} already exists`);
    }

    const atomicResult = await this.kv
      .atomic()
      .check({ key, versionstamp: existing.versionstamp })
      .set(key, user)
      .commit();

    if (!atomicResult.ok) {
      throw new Error(`Failed to add user ${user.id}: concurrent modification`);
    }

    return user;
  }
}
