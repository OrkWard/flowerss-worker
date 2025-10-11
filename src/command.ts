import { Message } from '@telegraf/types';
import { callTelegram } from './telegram';

export const commandDefinition = [
	{
		command: 'ping',
		description: '打个招呼',
		async handler(message: Message) {
			await callTelegram('sendMessage', {
				chat_id: message.chat.id,
				text: 'pong',
			});
		},
	},
	{ command: 'add', description: '订阅 RSS 源' },
	{ command: 'remove', description: '退订 RSS 源' },
	{ command: 'list', description: '列出 RSS 源' },
	{ command: 'check', description: '检查 RSS 订阅状态' },
	{ command: 'pause', description: '暂停查询最新订阅' },
	{ command: 'activate', description: '恢复查询最新订阅' },
	{ command: 'update', description: '手动查询最新订阅' },
	{ command: 'import', description: '导入' },
	{ command: 'export', description: '导出' },
];
