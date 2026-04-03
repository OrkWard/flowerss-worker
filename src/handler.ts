import type { Update } from "@telegraf/types";
import { callTelegram } from "./telegram/index.ts";
import { textCommand } from "./command/text.ts";
import { handleDocument } from "./command/document.ts";
import { UserStore } from "./model/user.ts";
import { SourceStore } from "./model/source.ts";
import { SubscribeStore } from "./model/subscribe.ts";

async function notifyHandlerError(chatId: number) {
  try {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text: "Something error, see log",
    });
  } catch (error) {
    console.error(error);
  }
}

async function handleUpdate(
  user: UserStore,
  source: SourceStore,
  subscribe: SubscribeStore,
  update: Update,
) {
  if (!("message" in update)) {
    return;
  }

  const userExists = await user.get(update.message.chat.id);
  if (!userExists) {
    return;
  }

  if ("text" in update.message) {
    for (const def of textCommand) {
      if (!update.message.text.match(new RegExp(`^/${def.command}`))) {
        continue;
      }

      console.info(
        `Handle ${def.command} command for chat: ${update.message.chat.id}`,
        { text: update.message.text },
      );

      try {
        await def.handler({ source, subscribe, message: update.message });
      } catch (error) {
        await notifyHandlerError(update.message.chat.id);
        throw error;
      }
      return;
    }
  }

  if ("document" in update.message) {
    try {
      await handleDocument(source, subscribe, update.message);
    } catch (error) {
      await notifyHandlerError(update.message.chat.id);
      throw error;
    }
  }
}

async function setupWebhook(hostname: string) {
  await callTelegram("setWebhook", {
    url: `https://${hostname}/update`,
    allowed_updates: ["message", "inline_query"],
  });
}

async function deleteWebhook() {
  await callTelegram("deleteWebhook", {});
}

async function setCommands() {
  await callTelegram("setMyCommands", {
    commands: textCommand.map(({ command, description }) => ({
      command,
      description,
    })),
  });
}

export async function handleRequest(
  user: UserStore,
  source: SourceStore,
  subscribe: SubscribeStore,
  request: Request,
) {
  const url = new URL(request.url);

  if (url.pathname === "/set") {
    await setupWebhook(url.hostname);
  } else if (url.pathname === "/delete") {
    await deleteWebhook();
  } else if (url.pathname === "/set-command") {
    await setCommands();
  } else if (url.pathname === "/update") {
    let update: Update;
    try {
      update = await request.json() as Update;
    } catch (cause) {
      throw new Error("Invalid update payload", { cause });
    }
    await handleUpdate(user, source, subscribe, update);
  } else {
    return new Response("404 Not Found\nHeart from OrkWard", { status: 404 });
  }

  return new Response("ok");
}
handleRequest.inject = ["user", "source", "subscribe", "request"] as const;
