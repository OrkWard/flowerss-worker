include .env
base_url = https://api.telegram.org/bot$(bot_token)/

getMe:
	xh get $(base_url)getMe

getWebhookInfo:
	xh get $(base_url)getWebhookInfo
