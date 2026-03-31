import type { Update } from "@telegraf/types";
import { callTelegram } from "./telegram/index.ts";
import { textCommand } from "./command/text.ts";
import { handleDocument } from "./command/document.ts";
import { getUser } from "./model/user.ts";

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

async function handleUpdate(update: Update) {
  if (!("message" in update)) {
    return;
  }

  const userExists = await getUser(update.message.chat.id);
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
        await def.handler(update.message);
      } catch (error) {
        await notifyHandlerError(update.message.chat.id);
        throw error;
      }
      return;
    }
  }

  if ("document" in update.message) {
    try {
      await handleDocument(update.message);
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

export async function handleRequest(request: Request) {
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
    await handleUpdate(update);
  } else {
    return new Response("404 Not Found\nHeart from OrkWard", { status: 404 });
  }

  return new Response("ok");
}
