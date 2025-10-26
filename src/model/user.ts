import { Effect, pipe } from 'effect';
import { runQuery } from './utils';

export interface User {
	id: number;
	identifier_id: number;
	first_name: string;
}

export const isUserExist = (id: number) =>
	pipe(
		runQuery('isUserExist', (db) => db.prepare('SELECT * FROM user WHERE id = (?)').bind(id).first()),
		Effect.map((result) => Boolean(result)),
	);
