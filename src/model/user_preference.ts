/**
 * KV Schema:
 * - ["user_preferences"]: Record<number, UserPreference>
 */
import { getKv } from "../service.ts";

export interface UserPreference {
  user_id: number;
  activate: boolean | null;
  frequency: number | null;
}

export async function getUserPreferences(): Promise<
  Record<number, UserPreference>
> {
  const kv = getKv();
  const prefs = await kv.get<Record<number, UserPreference>>([
    "user_preferences",
  ]);
  return prefs.value ?? {};
}

export async function getUserPreferenceByUserId(
  userId: number,
): Promise<UserPreference | null> {
  const prefs = await getUserPreferences();
  return prefs[userId] ?? null;
}

export async function createUserPreference(
  userId: number,
  activate?: boolean,
  frequency?: number,
): Promise<UserPreference> {
  const kv = getKv();
  const prefs =
    (await kv.get<Record<number, UserPreference>>(["user_preferences"]))
      .value ?? {};
  const newPref: UserPreference = {
    user_id: userId,
    activate: activate ?? null,
    frequency: frequency ?? null,
  };
  prefs[userId] = newPref;
  await kv.set(["user_preferences"], prefs);
  return newPref;
}

export async function updateUserPreference(
  userId: number,
  activate?: boolean,
  frequency?: number,
): Promise<UserPreference | null> {
  const kv = getKv();
  const prefs =
    (await kv.get<Record<number, UserPreference>>(["user_preferences"]))
      .value ?? {};
  const pref = prefs[userId];
  if (!pref) {
    return null;
  }

  if (activate !== undefined) {
    pref.activate = activate;
  }
  if (frequency !== undefined) {
    pref.frequency = frequency;
  }

  await kv.set(["user_preferences"], prefs);
  return pref;
}

export async function deleteUserPreferenceByUserId(
  userId: number,
): Promise<boolean> {
  const kv = getKv();
  const prefs =
    (await kv.get<Record<number, UserPreference>>(["user_preferences"]))
      .value ?? {};
  delete prefs[userId];
  await kv.set(["user_preferences"], prefs);
  return true;
}

export async function getAllUserPreferences(): Promise<UserPreference[]> {
  const prefs = await getUserPreferences();
  return Object.values(prefs);
}
