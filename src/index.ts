import { Update } from '@telegraf/types';
import { Data, Effect, pipe } from 'effect';
import { callTelegram } from './telegram';
import { commandDefinition } from './command';
import { isUserExist } from './model/user';
import { D1DB } from './model/utils';

export class UpdateHandlerError extends Data.TaggedError('UpdateHandlerError')<{
	readonly cause: unknown;
}> {}

export class WebhookSetupError extends Data.TaggedError('WebhookSetupError')<{
	readonly cause: unknown;
	readonly operation: string;
}> {}

const handleUpdate = (update: Update) =>
	Effect.gen(function* () {
		if (!('message' in update)) {
			return;
		}

		// Only allow registered users
		const userExists = yield* isUserExist(update.message.chat.id);
		if (!userExists) {
			return;
		}

		if ('text' in update.message) {
			for (const def of commandDefinition) {
				if (!update.message.text.match(new RegExp(`^/${def.command}`))) {
					continue;
				}

				yield* def.handler(update.message);
				return;
			}
		}
	});

const setupWebhook = (hostname: string) =>
	Effect.gen(function* () {
		yield* callTelegram('setWebhook', {
			url: 'https://' + hostname + '/update',
			allowed_updates: ['message', 'inline_query'],
		});
	});

const deleteWebhook = () =>
	Effect.gen(function* () {
		yield* callTelegram('deleteWebhook', {});
	});

const setCommands = () =>
	Effect.gen(function* () {
		yield* callTelegram('setMyCommands', { commands: commandDefinition });
	});

const handleRequest = (request: Request, env: Env) =>
	Effect.gen(function* () {
		const url = new URL(request.url);

		if (url.pathname === '/set') {
			yield* setupWebhook(url.hostname);
		} else if (url.pathname === '/delete') {
			yield* deleteWebhook();
		} else if (url.pathname === '/set-command') {
			yield* setCommands();
		} else if (url.pathname === '/update') {
			const update = (yield* Effect.tryPromise({
				try: () => request.json() as Promise<Update>,
				catch: (cause) => new UpdateHandlerError({ cause }),
			})) as Update;
			yield* handleUpdate(update);
		} else {
			return new Response('404 Not Found\nHeart from OrkWard');
		}

		return new Response('ok');
	});

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const program = pipe(
			handleRequest(request, env),
			Effect.catchAll((error) => {
				console.error(error);
				return Effect.succeed(new Response('error, check log'));
			}),
			Effect.provideService(D1DB, { db: env.flowerss_db }),
		);

		return await Effect.runPromise(program);
	},
	async scheduled(controller, env, ctx) {
		console.log('cron processed');
	},
} satisfies ExportedHandler<Env>;
