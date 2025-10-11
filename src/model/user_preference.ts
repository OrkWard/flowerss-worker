import { env } from 'cloudflare:workers';

export interface UserPreference {
	id: number;
	user_id: number;
	activate: boolean | null;
	frequency: number | null;
}

export async function createUserPreference(user_id: number, activate?: boolean, frequency?: number): Promise<UserPreference | null> {
	const result = await env.flowerss_db
		.prepare('INSERT INTO user_preference (user_id, activate, frequency) VALUES (?, ?, ?) RETURNING *')
		.bind(user_id, activate ?? null, frequency ?? null)
		.first();
	return result as UserPreference | null;
}

export async function getUserPreferenceById(id: number): Promise<UserPreference | null> {
	const result = await env.flowerss_db.prepare('SELECT * FROM user_preference WHERE id = ?').bind(id).first();
	return result as UserPreference | null;
}

export async function getUserPreferenceByUserId(user_id: number): Promise<UserPreference | null> {
	const result = await env.flowerss_db.prepare('SELECT * FROM user_preference WHERE user_id = ?').bind(user_id).first();
	return result as UserPreference | null;
}

export async function updateUserPreference(id: number, activate?: boolean, frequency?: number): Promise<UserPreference | null> {
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

	const result = await env.flowerss_db
		.prepare(`UPDATE user_preference SET ${updates.join(', ')} WHERE id = ? RETURNING *`)
		.bind(...binds)
		.first();
	return result as UserPreference | null;
}

export async function deleteUserPreference(id: number): Promise<boolean> {
	const result = await env.flowerss_db.prepare('DELETE FROM user_preference WHERE id = ?').bind(id).run();
	return result.success;
}

export async function deleteUserPreferenceByUserId(user_id: number): Promise<boolean> {
	const result = await env.flowerss_db.prepare('DELETE FROM user_preference WHERE user_id = ?').bind(user_id).run();
	return result.success;
}

export async function getAllUserPreferences(): Promise<UserPreference[]> {
	const result = await env.flowerss_db.prepare('SELECT * FROM user_preference').all();
	return result.results as unknown as UserPreference[];
}
