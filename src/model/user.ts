/**
 * KV Schema:
 * - ["users"]: User[]
 */
import { getKv } from "../service.ts";

export interface User {
  id: number;
  first_name: string;
}

export async function getUsers(): Promise<User[]> {
  const kv = getKv();
  const users = await kv.get<User[]>(["users"]);
  return users.value ?? [];
}

export async function getUser(id: number): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((user) => user.id === id);
}

export async function addUser(user: User): Promise<User> {
  const kv = getKv();
  const users = await kv.get<User[]>(["users"]);
  const newUsers = [...(users.value ?? []), user];
  await kv.set(["users"], newUsers);
  return user;
}
