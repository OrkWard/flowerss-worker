import { Effect, pipe } from 'effect';
import { DatabaseError, runQuery } from './utils';

export interface UserPreference {
	id: number;
	user_id: number;
	activate: boolean | null;
	frequency: number | null;
}

export const createUserPreference = (user_id: number, activate?: boolean, frequency?: number) =>
	pipe(
		runQuery('createUserPreference', (db) =>
			db
				.prepare('INSERT INTO user_preference (user_id, activate, frequency) VALUES (?, ?, ?) RETURNING *')
				.bind(user_id, activate ?? null, frequency ?? null)
				.first(),
		),
		Effect.flatMap((result) =>
			result
				? Effect.succeed(result as unknown as UserPreference)
				: Effect.fail(new DatabaseError({ cause: 'No result returned', operation: 'createUserPreference' })),
		),
	);

export const getUserPreferenceById = (id: number) =>
	pipe(
		runQuery('getUserPreferenceById', (db) => db.prepare('SELECT * FROM user_preference WHERE id = ?').bind(id).first()),
		Effect.map((result) => result as UserPreference | null),
	);

export const getUserPreferenceByUserId = (user_id: number) =>
	pipe(
		runQuery('getUserPreferenceByUserId', (db) => db.prepare('SELECT * FROM user_preference WHERE user_id = ?').bind(user_id).first()),
		Effect.map((result) => result as UserPreference | null),
	);

export const updateUserPreference = (id: number, activate?: boolean, frequency?: number) => {
	const updates: string[] = [];
	const binds: any[] = [];

	if (activate !== undefined) {
		updates.push('activate = ?');
		binds.push(activate);
	}
	if (frequency !== undefined) {
		updates.push('frequency = ?');
		binds.push(frequency);
	}
	binds.push(id);

	if (updates.length === 0) {
		return getUserPreferenceById(id);
	}

	return pipe(
		runQuery('updateUserPreference', (db) =>
			db
				.prepare(`UPDATE user_preference SET ${updates.join(', ')} WHERE id = ? RETURNING *`)
				.bind(...binds)
				.first(),
		),
		Effect.map((result) => result as UserPreference | null),
	);
};

export const deleteUserPreference = (id: number) =>
	pipe(
		runQuery('deleteUserPreference', (db) => db.prepare('DELETE FROM user_preference WHERE id = ?').bind(id).run()),
		Effect.map((result) => result.success),
	);

export const deleteUserPreferenceByUserId = (user_id: number) =>
	pipe(
		runQuery('deleteUserPreferenceByUserId', (db) => db.prepare('DELETE FROM user_preference WHERE user_id = ?').bind(user_id).run()),
		Effect.map((result) => result.success),
	);

export const getAllUserPreferences = () =>
	pipe(
		runQuery('getAllUserPreferences', (db) => db.prepare('SELECT * FROM user_preference').all()),
		Effect.map((result) => result.results as unknown as UserPreference[]),
	);
