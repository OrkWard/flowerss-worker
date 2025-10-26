import { Context, Data, Effect, pipe } from 'effect';

export class DatabaseError extends Data.TaggedError('DatabaseError')<{
	readonly cause: unknown;
	readonly operation: string;
}> {}

export class D1DB extends Context.Tag('D1DB')<D1DB, { db: D1Database }>() {}

export const runQuery = <T>(operation: string, query: (db: D1Database) => Promise<T>): Effect.Effect<T, DatabaseError, D1DB> =>
	pipe(
		D1DB,
		Effect.flatMap(({ db }) =>
			Effect.tryPromise({
				try: () => query(db),
				catch: (cause) => new DatabaseError({ cause, operation }),
			}),
		),
	);
