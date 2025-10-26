import { Message } from '@telegraf/types';
import { callTelegram } from './telegram';
import { addRssSubscribe, removeRssSubscribe } from './rss';
import { getSubscribesByUserId } from './model/subscribe';
import { getSourceById } from './model/source';
import { Effect } from 'effect';

export const commandDefinition = [
	{
		command: 'ping',
		description: '打个招呼',
		handler: (message: Message.TextMessage) =>
			callTelegram('sendMessage', {
				chat_id: message.chat.id,
				text: 'pong',
			}),
	},
	{
		command: 'add',
		description: '订阅 RSS 源',
		handler: (message: Message.TextMessage) =>
			Effect.gen(function* () {
				const [_, link] = message.text.match(/^\/add(.*)/) || [];
				if (!link) {
					return yield* callTelegram('sendMessage', {
						chat_id: message.chat.id,
						text: 'Usage: /add [rss subscribe link]',
					});
				}

				yield* addRssSubscribe(message.chat.id, link.trim());
				yield* callTelegram('sendMessage', {
					chat_id: message.chat.id,
					text: 'Success',
				});
			}),
	},
	{
		command: 'remove',
		description: '退订 RSS 源',
		handler: (message: Message.TextMessage) =>
			Effect.gen(function* () {
				const [_, id] = message.text.match(/^\/remove (\d*)/) || [];
				if (!id) {
					return yield* callTelegram('sendMessage', {
						chat_id: message.chat.id,
						text: 'Usage: /remove [subscribe id]',
					});
				}

				yield* removeRssSubscribe(parseInt(id));
				yield* callTelegram('sendMessage', {
					chat_id: message.chat.id,
					text: 'Success',
				});
			}),
	},
	{
		command: 'list',
		description: '列出 RSS 源',
		handler: (message: Message.TextMessage) =>
			Effect.gen(function* () {
				const subscribes = yield* getSubscribesByUserId(message.chat.id);
				if (!subscribes.length) {
					return yield* callTelegram('sendMessage', {
						chat_id: message.chat.id,
						text: 'Not subscribe found',
					});
				}

				let text = '';
				for (const s of subscribes) {
					const source = (yield* getSourceById(s.source_id))!;
					text += `\\[${s.id}] `;
					text += `[${source.title}](${source.link})`;
					text += '\n';
				}

				yield* callTelegram('sendMessage', {
					chat_id: message.chat.id,
					text,
					parse_mode: 'Markdown',
				});
			}),
	},
	{ command: 'check', description: '检查 RSS 订阅状态' },
	{ command: 'pause', description: '暂停查询最新订阅' },
	{ command: 'activate', description: '恢复查询最新订阅' },
	{ command: 'update', description: '手动查询最新订阅' },
	{ command: 'import', description: '导入' },
	{ command: 'export', description: '导出' },
];
