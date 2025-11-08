import { Effect, pipe } from "effect";
import { runQuery } from "./utils.ts";

export interface UserPreference {
  user_id: number;
  activate: boolean | null;
  frequency: number | null;
}

export const getUserPreferences = pipe(
  runQuery("getUserPreferences", async (kv) => {
    const prefs = await kv.get<Record<number, UserPreference>>([
      "user_preferences",
    ]);
    return prefs.value ?? {};
  }),
);

export const getUserPreferenceByUserId = (user_id: number) =>
  pipe(
    getUserPreferences,
    Effect.map((prefs) => prefs[user_id] ?? null),
  );

export const createUserPreference = (
  user_id: number,
  activate?: boolean,
  frequency?: number,
) =>
  pipe(
    runQuery("createUserPreference", async (kv) => {
      const prefs =
        (await kv.get<Record<number, UserPreference>>(["user_preferences"]))
          .value ?? {};
      const newPref: UserPreference = {
        user_id,
        activate: activate ?? null,
        frequency: frequency ?? null,
      };
      prefs[user_id] = newPref;
      await kv.set(["user_preferences"], prefs);
      return newPref;
    }),
  );

export const updateUserPreference = (
  user_id: number,
  activate?: boolean,
  frequency?: number,
) => {
  return pipe(
    runQuery("updateUserPreference", async (kv) => {
      const prefs =
        (await kv.get<Record<number, UserPreference>>(["user_preferences"]))
          .value ?? {};
      const pref = prefs[user_id];
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
    }),
  );
};

export const deleteUserPreferenceByUserId = (user_id: number) =>
  pipe(
    runQuery("deleteUserPreferenceByUserId", async (kv) => {
      const prefs =
        (await kv.get<Record<number, UserPreference>>(["user_preferences"]))
          .value ?? {};
      delete prefs[user_id];
      await kv.set(["user_preferences"], prefs);
      return true;
    }),
  );

export const getAllUserPreferences = pipe(
  getUserPreferences,
  Effect.map((prefs) => Object.values(prefs)),
);
