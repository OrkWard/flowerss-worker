import { Effect, pipe } from 'effect';
import { DatabaseError, runQuery } from './utils';

export interface Source {
	id: number;
	title: string;
	link: string;
	error_count: number;
	create_at: number;
	update_at: number;
}

export const createSource = (link: string, title?: string) =>
	pipe(
		runQuery('createSource', (db) => {
			const now = new Date().getTime();
			return db
				.prepare('INSERT INTO source (title, link, error_count, create_at, update_at) VALUES (?, ?, 0, ?, ?) RETURNING *')
				.bind(title || null, link, now, now)
				.first();
		}),
		Effect.flatMap((result) =>
			result
				? Effect.succeed(result as unknown as Source)
				: Effect.fail(new DatabaseError({ cause: 'No result returned', operation: 'createSource' })),
		),
	);

export const getSourceById = (id: number) =>
	pipe(
		runQuery('getSourceById', (db) => db.prepare('SELECT * FROM source WHERE id = ?').bind(id).first()),
		Effect.map((result) => result as Source | null),
	);

export const getSourceByLink = (link: string) =>
	pipe(
		runQuery('getSourceByLink', (db) => db.prepare('SELECT * FROM source WHERE link = ?').bind(link).first()),
		Effect.map((result) => result as Source | null),
	);

export const renewSource = (id: number, update_at: number) =>
	pipe(
		runQuery('updateSource', (db) => db.prepare(`UPDATE source SET update_at = ? WHERE id = ? RETURNING *`).bind(update_at, id).first()),
		Effect.map((result) => result as Source | null),
	);

export const incrementSourceErrorCount = (id: number) =>
	pipe(
		runQuery('incrementSourceErrorCount', (db) => {
			const now = new Date().getTime();
			return db.prepare('UPDATE source SET error_count = error_count + 1, update_at = ? WHERE id = ? RETURNING *').bind(now, id).first();
		}),
		Effect.map((result) => result as Source | null),
	);

export const resetSourceErrorCount = (id: number) =>
	pipe(
		runQuery('resetSourceErrorCount', (db) => {
			const now = new Date().getTime();
			return db.prepare('UPDATE source SET error_count = 0, update_at = ? WHERE id = ? RETURNING *').bind(now, id).first();
		}),
		Effect.map((result) => result as Source | null),
	);

export const deleteSource = (id: number) =>
	pipe(
		runQuery('deleteSource', (db) => db.prepare('DELETE FROM source WHERE id = ?').bind(id).run()),
		Effect.map((result) => result.success),
	);

export const getAllSources = () =>
	pipe(
		runQuery('getAllSources', (db) => db.prepare('SELECT * FROM source').all()),
		Effect.map((result) => result.results as unknown as Source[]),
	);
