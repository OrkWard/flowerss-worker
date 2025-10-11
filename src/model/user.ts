import { env } from 'cloudflare:workers';

export interface User {
	id: number;
	identifier_id: number;
	first_name: string;
}

export async function isUserExist(id: number) {
	const result = await env.flowerss_db.prepare('SELECT * FROM user WHERE id = (?)').bind(id).first();
	return Boolean(result);
}
