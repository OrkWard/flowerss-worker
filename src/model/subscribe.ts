import { env } from 'cloudflare:workers';

export interface Subscribe {
	id: number;
	user_id: number;
	source_id: number;
}

export async function createSubscribe(user_id: number, source_id: number): Promise<Subscribe | null> {
	const result = await env.flowerss_db
		.prepare('INSERT INTO subscribe (user_id, source_id) VALUES (?, ?) RETURNING *')
		.bind(user_id, source_id)
		.first();
	return result as Subscribe | null;
}

export async function getSubscribeByUserAndSource(user_id: number, source_id: number): Promise<Subscribe | null> {
	const result = await env.flowerss_db
		.prepare('SELECT * FROM subscribe WHERE user_id = ? AND source_id = ?')
		.bind(user_id, source_id)
		.first();
	return result as Subscribe | null;
}

export async function getSubscribesByUserId(user_id: number): Promise<Subscribe[]> {
	const result = await env.flowerss_db.prepare('SELECT * FROM subscribe WHERE user_id = ?').bind(user_id).all();
	return result.results as unknown as Subscribe[];
}

export async function deleteSubscribe(id: number): Promise<boolean> {
	const result = await env.flowerss_db.prepare('DELETE FROM subscribe WHERE id = ?').bind(id).run();
	return result.success;
}

export async function isUserSubscribedToSource(user_id: number, source_id: number): Promise<boolean> {
	const row = await env.flowerss_db.prepare('SELECT 1 FROM subscribe WHERE user_id = ? AND source_id = ?').bind(user_id, source_id).first();
	return Boolean(row);
}
