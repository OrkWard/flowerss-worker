import { env } from 'cloudflare:workers';

export interface Source {
	id: number;
	title: string | null;
	link: string;
	error_count: number;
	create_at: number;
	update_at: number;
}

export async function createSource(link: string, title?: string): Promise<Source | null> {
	const now = new Date().getTime();
	const result = await env.flowerss_db
		.prepare('INSERT INTO source (title, link, error_count, create_at, update_at) VALUES (?, ?, 0, ?, ?) RETURNING *')
		.bind(title || null, link, now, now)
		.first();
	return result as Source | null;
}

export async function getSourceById(id: number): Promise<Source | null> {
	const result = await env.flowerss_db.prepare('SELECT * FROM source WHERE id = ?').bind(id).first();
	return result as Source | null;
}

export async function getSourceByLink(link: string): Promise<Source | null> {
	const result = await env.flowerss_db.prepare('SELECT * FROM source WHERE link = ?').bind(link).first();
	return result as Source | null;
}

export async function updateSource(id: number, title?: string, link?: string): Promise<Source | null> {
	const now = new Date().getTime();
	const updates: string[] = [];
	const binds: any[] = [];

	if (title !== undefined) {
		updates.push('title = ?');
		binds.push(title);
	}
	if (link !== undefined) {
		updates.push('link = ?');
		binds.push(link);
	}
	updates.push('update_at = ?');
	binds.push(now);
	binds.push(id);

	const result = await env.flowerss_db
		.prepare(`UPDATE source SET ${updates.join(', ')} WHERE id = ? RETURNING *`)
		.bind(...binds)
		.first();
	return result as Source | null;
}

export async function incrementSourceErrorCount(id: number): Promise<Source | null> {
	const now = new Date().getTime();
	const result = await env.flowerss_db
		.prepare('UPDATE source SET error_count = error_count + 1, update_at = ? WHERE id = ? RETURNING *')
		.bind(now, id)
		.first();
	return result as Source | null;
}

export async function resetSourceErrorCount(id: number): Promise<Source | null> {
	const now = new Date().getTime();
	const result = await env.flowerss_db
		.prepare('UPDATE source SET error_count = 0, update_at = ? WHERE id = ? RETURNING *')
		.bind(now, id)
		.first();
	return result as Source | null;
}

export async function deleteSource(id: number): Promise<boolean> {
	const result = await env.flowerss_db.prepare('DELETE FROM source WHERE id = ?').bind(id).run();
	return result.success;
}

export async function getAllSources(): Promise<Source[]> {
	const result = await env.flowerss_db.prepare('SELECT * FROM source').all();
	return result.results as unknown as Source[];
}
