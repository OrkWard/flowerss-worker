/** @throws */
export async function get(url: string) {
	let response;
	try {
		response = await fetch(url, {
			method: 'GET',
			headers: { 'User-Agent': 'FeedlyBot/1.0 (+http://www.feedly.com/feedlybot.html)' },
		});
	} catch (e) {
		console.error('fetch network error', e);
		throw e;
	}
	if (!response.ok) {
		console.error('fetch response code error', response.status, response.statusText, await response.text());
		throw new Error(`http code error: ${response.status}`);
	}
	try {
		return await response.text();
	} catch (e) {
		console.error('transform body to string error', e);
		throw e;
	}
}
