import { Update } from '@telegraf/types';
import { callTelegram } from './telegram';
import { commandDefinition } from './command';
import { isUserExist } from './model/user';

async function handleUpdate(update: Update) {
	if (!('message' in update)) {
		// ignore non-message
		return;
	}

	// only allow user recorded
	if (!(await isUserExist(update.message.chat.id))) {
		return;
	}

	if ('text' in update.message) {
		// handle command
		for (const def of commandDefinition) {
			if (update.message.text.match(new RegExp(`^/${def.command}`))) {
				await def.handler?.(update.message).catch((e) => {
					callTelegram('sendMessage', {
						chat_id: update.message.chat.id,
						text: e.message,
					});
				});
				return;
			}
		}
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// 路由
		try {
			if (url.pathname === '/set') {
				// set webhook
				await callTelegram('setWebhook', {
					url: 'https://' + url.hostname + '/update',
					allowed_updates: ['message', 'inline_query'],
				});
			} else if (url.pathname === '/delete') {
				// delete webhook
				await callTelegram('deleteWebhook', {});
			} else if (url.pathname === '/set-command') {
				// set bot commands
				await callTelegram('setMyCommands', { commands: commandDefinition });
			} else if (url.pathname === '/update') {
				// handle update
				await handleUpdate(await request.json());
			}
			return new Response('ok');
		} catch (e) {
			console.error(e);
			return new Response('error, check log');
		}

		// 404
		return new Response('404 Not Found\nHeart from OrkWard');
	},
} satisfies ExportedHandler<Env>;
