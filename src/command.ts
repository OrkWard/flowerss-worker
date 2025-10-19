import { Message } from '@telegraf/types';
import { callTelegram } from './telegram';
import { addRssSubscribe, removeRssSubscribe } from './rss';
import { getSubscribesByUserId } from './model/subscribe';
import { getSourceById } from './model/source';

export const commandDefinition = [
	{
		command: 'ping',
		description: '打个招呼',
		/** @throws */
		async handler(message: Message.TextMessage) {
			await callTelegram('sendMessage', {
				chat_id: message.chat.id,
				text: 'pong',
			});
		},
	},
	{
		command: 'add',
		description: '订阅 RSS 源',
		async handler(message: Message.TextMessage) {
			const [_, link] = message.text.match(/^\/add(.*)/) || [];
			if (!link) {
				await callTelegram('sendMessage', {
					chat_id: message.chat.id,
					text: 'Usage: /add [rss subscribe link]',
				});
				return;
			}

			await addRssSubscribe(message.chat.id, link.trim());
			await callTelegram('sendMessage', {
				chat_id: message.chat.id,
				text: 'Success',
			});
		},
	},
	{
		command: 'remove',
		description: '退订 RSS 源',
		async handler(message: Message.TextMessage) {
			const [_, id] = message.text.match(/^\/remove (\d*)/) || [];
			if (!id) {
				await callTelegram('sendMessage', {
					chat_id: message.chat.id,
					text: 'Usage: /remove [subscribe id]',
				});
				return;
			}

			await removeRssSubscribe(parseInt(id));
			await callTelegram('sendMessage', {
				chat_id: message.chat.id,
				text: 'Success',
			});
		},
	},
	{
		command: 'list',
		description: '列出 RSS 源',
		async handler(message: Message.TextMessage) {
			const subscribes = await getSubscribesByUserId(message.chat.id);
			if (!subscribes.length) {
				await callTelegram('sendMessage', {
					chat_id: message.chat.id,
					text: 'Not subscribe found',
				});
				return;
			}

			let text = '';
			for (const s of subscribes) {
				const source = (await getSourceById(s.source_id))!;
				text += `\\[${s.id}] `;
				text += `[${source.title}](${source.link})`;
				text += '\n';
			}

			await callTelegram('sendMessage', {
				chat_id: message.chat.id,
				text,
				parse_mode: 'Markdown',
			});
		},
	},
	{ command: 'check', description: '检查 RSS 订阅状态' },
	{ command: 'pause', description: '暂停查询最新订阅' },
	{ command: 'activate', description: '恢复查询最新订阅' },
	{ command: 'update', description: '手动查询最新订阅' },
	{ command: 'import', description: '导入' },
	{ command: 'export', description: '导出' },
];
