/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { callTelegram } from './telegram';

async function handleSetWebhook(url: string): Promise<Response> {
	try {
		await callTelegram('setWebhook', { url, allowed_updates: ['message', 'inline_query'] });
		return new Response('ok');
	} catch (e) {
		return new Response('error, check log');
	}
}

async function handleDeleteWebhook(): Promise<Response> {
	try {
		await callTelegram('deleteWebhook', {});
		return new Response('ok');
	} catch (e) {
		return new Response('error, check log');
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === '/set') {
			return await handleSetWebhook(url.origin + (url.searchParams.get('targetPath') || '/update'));
		} else if (url.pathname === '/delete') {
			return await handleDeleteWebhook();
		} else if (url.pathname === '/update') {
			// TODO
		}
		return new Response(null, { status: 404, statusText: 'Not Found' });
	},
} satisfies ExportedHandler<Env>;
