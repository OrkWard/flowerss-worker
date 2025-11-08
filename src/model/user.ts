/**
 * KV Schema:
 * - ["users"]: User[]
 */
import { Effect } from "effect";
import { runQuery } from "./utils.ts";

export interface User {
  id: number;
  first_name: string;
}

export const getUsers = runQuery("getUsers", async (kv) => {
  const users = await kv.get<User[]>(["users"]);
  return users.value ?? [];
});

export const getUser = (id: number) =>
  getUsers.pipe(Effect.map((users) => users.find((user) => user.id === id)));

export const addUser = (user: User) =>
  runQuery("addUser", async (kv) => {
    const users = await kv.get<User[]>(["users"]);
    const newUsers = [...(users.value ?? []), user];
    await kv.set(["users"], newUsers);
    return user;
  });
