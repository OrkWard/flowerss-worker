import { Effect, pipe } from 'effect';
import { DatabaseError, runQuery } from './utils';

export interface Subscribe {
	id: number;
	user_id: number;
	source_id: number;
}

export const createSubscribe = (user_id: number, source_id: number) =>
	pipe(
		runQuery('createSubscribe', (db) =>
			db.prepare('INSERT INTO subscribe (user_id, source_id) VALUES (?, ?) RETURNING *').bind(user_id, source_id).first(),
		),
		Effect.flatMap((result) =>
			result
				? Effect.succeed(result as unknown as Subscribe)
				: Effect.fail(new DatabaseError({ cause: 'No result returned', operation: 'createSubscribe' })),
		),
	);

export const getSubscribeByUserAndSource = (user_id: number, source_id: number) =>
	pipe(
		runQuery('getSubscribeByUserAndSource', (db) =>
			db.prepare('SELECT * FROM subscribe WHERE user_id = ? AND source_id = ?').bind(user_id, source_id).first(),
		),
		Effect.map((result) => result as Subscribe | null),
	);

export const getSubscribesByUserId = (user_id: number) =>
	pipe(
		runQuery('getSubscribesByUserId', (db) => db.prepare('SELECT * FROM subscribe WHERE user_id = ?').bind(user_id).all()),
		Effect.map((result) => result.results as unknown as Subscribe[]),
	);

export const deleteSubscribe = (id: number) =>
	pipe(
		runQuery('deleteSubscribe', (db) => db.prepare('DELETE FROM subscribe WHERE id = ?').bind(id).run()),
		Effect.map((result) => result.success),
	);

export const isUserSubscribedToSource = (user_id: number, source_id: number) =>
	pipe(
		runQuery('isUserSubscribedToSource', (db) =>
			db.prepare('SELECT 1 FROM subscribe WHERE user_id = ? AND source_id = ?').bind(user_id, source_id).first(),
		),
		Effect.map((row) => Boolean(row)),
	);
