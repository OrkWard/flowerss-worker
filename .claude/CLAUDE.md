# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

flowerss-worker is a Cloudflare Workers-based RSS feed aggregator with Telegram bot integration. It allows users to subscribe to RSS feeds via Telegram commands and receive updates through scheduled cron jobs.

## Technology Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Bot**: Telegram Bot API
- **Effect System**: Effect library for functional error handling and composition
- **RSS Parsing**: fast-xml-parser (supports RSS 2.0 and Atom 1.0)

## Development Commands

```bash
# Start local development server
pnpm dev

# Deploy to Cloudflare Workers
pnpm deploy

# Run tests
pnpm test

# Generate Cloudflare types
pnpm cf-typegen

# Start cloudflared tunnel (for webhook testing)
pnpm tunnel
```

## Architecture

### Request Flow

1. **Telegram Webhook** → `/update` endpoint → `handleUpdate()` → Command handlers
2. **Scheduled Cron** → `scheduled()` hook (runs every minute per wrangler.jsonc)
3. **Setup Endpoints**: `/set`, `/delete`, `/set-command` for bot configuration

### Core Components

**src/index.ts**: Main entry point

- `fetch()`: Handles HTTP requests (webhooks, setup endpoints)
- `scheduled()`: Cron job handler for periodic RSS checks
- `handleUpdate()`: Routes Telegram messages to command handlers

**src/command.ts**: Telegram command definitions

- Command registration with descriptions for bot UI
- Handlers for: ping, add, remove, list, check, pause, activate, update, import, export

**src/telegram.ts**: Telegram Bot API client

- `callTelegram()`: Type-safe wrapper around Telegram API

**src/rss/**: RSS feed operations

- `fetch.ts`: HTTP client with Effect-based error handling (FetchNetworkError, FetchResponseError, FetchBodyTransformError)
- `parse.ts`: XML parser supporting RSS 2.0 and Atom 1.0 formats
- `index.ts`: High-level operations (addRssSubscribe, removeRssSubscribe, fetchRss)

**src/model/**: Database layer with Effect-based operations

- `utils.ts`: Database abstraction using D1DB Context and runQuery helper
- `source.ts`: RSS source CRUD (tracks error_count for reliability)
- `subscribe.ts`: User-source subscription relationships
- `user.ts`: User management (only registered users can interact)
- `user_preference.ts`: User settings (activate, frequency)

### Database Schema

- **source**: RSS feed sources (id, title, link, error_count, timestamps)
- **user**: Registered Telegram users (id matches Telegram chat_id)
- **user_preference**: Per-user settings for feed delivery
- **subscribe**: Many-to-many relationship between users and sources

### Effect Pattern

All database and RSS operations use the Effect library for:

- Composable error handling (pipe, Effect.gen, Effect.flatMap)
- Tagged errors (DatabaseError, FetchError, ParseError)
- Type-safe async operations without try/catch

Example pattern:

```typescript
export const operation = (params) =>
	pipe(
		runQuery('operationName', (db) => db.prepare('...').bind(params).first()),
		Effect.map((result) => result as Type | null),
	);
```

### Running Effect Operations

Effect operations must be executed with `.pipe(Effect.runPromise)` or within Effect.gen contexts. The codebase uses both patterns:

- Command handlers: Call Effect operations directly (implicitly run)
- Composed operations: Use Effect.gen for sequential operations

## Key Files

- `wrangler.jsonc`: Cloudflare Workers configuration, D1 binding, cron schedule
- `schema.sql`: Database schema definition
- `worker-configuration.d.ts`: Auto-generated Cloudflare types
- `tsconfig.json`: TypeScript config (ES2022, noEmit mode)

## Development Notes

### Telegram Bot Setup

The bot uses a localhost proxy (telegram.ts:7). For production, update BASE_URL to use `env.bot_token` with the actual Telegram API endpoint.

### Adding New Commands

1. Add command definition to `commandDefinition` array in `src/command.ts`
2. Implement `handler(message: Message.TextMessage)` using `callTelegram()` for responses
3. Deploy and run `/set-command` endpoint to register with Telegram

### Database Operations

All database operations go through `runQuery()` helper which:

- Provides D1DB context injection
- Wraps operations in Effect.tryPromise
- Returns DatabaseError on failure

### RSS Feed Processing

Adding a subscription:

1. Fetches feed URL with custom User-Agent
2. Parses XML (RSS or Atom)
3. Creates source if not exists
4. Creates subscribe relationship if not duplicate

Error tracking: `source.error_count` increments on fetch failures for reliability monitoring.
