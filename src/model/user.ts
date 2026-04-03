/**
 * KV Schema:
 * - ["users"]: User[]
 */
export interface User {
  id: number;
  first_name: string;
}

export class UserStore {
  static inject = ["kv"] as const;
  constructor(private kv: Deno.Kv) {}

  async getAll(): Promise<User[]> {
    const users = await this.kv.get<User[]>(["users"]);
    return users.value ?? [];
  }

  async get(id: number): Promise<User | undefined> {
    const users = await this.getAll();
    return users.find((user) => user.id === id);
  }

  async add(user: User): Promise<User> {
    const users = await this.kv.get<User[]>(["users"]);
    const newUsers = [...(users.value ?? []), user];
    await this.kv.set(["users"], newUsers);
    return user;
  }
}
