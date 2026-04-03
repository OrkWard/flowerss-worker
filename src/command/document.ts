import type { Message } from "@telegraf/types";
import { callTelegram, getTelegramFile } from "../telegram/index.ts";
import { addRssSubscribe } from "../rss/index.ts";
import type { SourceStore } from "../model/source.ts";
import type { SubscribeStore } from "../model/subscribe.ts";
import { pipe } from "ramda";

async function addSubscribeWithRetry(
  source: SourceStore,
  subscribe: SubscribeStore,
  userId: number,
  subscribeLink: string,
  times = 3,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < times; attempt += 1) {
    try {
      await addRssSubscribe(source, subscribe, userId, subscribeLink.trim());
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function handleDocument(
  source: SourceStore,
  subscribe: SubscribeStore,
  message: Message.DocumentMessage,
): Promise<void> {
  console.info(`Handling document import for chat: ${message.chat.id}`);

  const file = await callTelegram("getFile", {
    file_id: message.document.file_id,
  }) as { file_path?: string };
  console.debug("Got file object from Telegram", file);

  if (!file.file_path) {
    throw new Error(
      `getFile don't response with path, file: ${JSON.stringify(file)}`,
    );
  }

  const blob = await getTelegramFile(file.file_path);
  console.debug("Fetched file blob", { size: blob.size, type: blob.type });

  const text = await blob.text();
  console.debug("File content as text", { textLength: text.length });

  const subscribes = pipe(
    (value: string) => value.split("\n"),
    (values: string[]) => values.map((s) => s.trim()),
    (values: string[]) => values.filter(Boolean),
  )(text);
  console.info("Parsed subscribes", { subscribes });

  await Promise.all(
    subscribes.map((s: string) => {
      console.debug(`Adding subscription: ${s}`);
      return addSubscribeWithRetry(source, subscribe, message.chat.id, s);
    }),
  );

  await callTelegram("sendMessage", {
    chat_id: message.chat.id,
    text: "Success",
  });
}
