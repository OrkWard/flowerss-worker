import { Message } from "@telegraf/types";
import { callTelegram } from "./telegram/index.ts";
import { addRssSubscribe, removeRssSubscribe } from "./rss/index.ts";
import { getSubscribesByUserId } from "./model/subscribe.ts";
import { getSourceById } from "./model/source.ts";
import { Effect } from "effect";

const ping = (message: Message.TextMessage) =>
  callTelegram("sendMessage", {
    chat_id: message.chat.id,
    text: "pong",
  });

const add = (message: Message.TextMessage) =>
  Effect.gen(function* () {
    const [_, link] = message.text.match(/^\/add(.*)/) || [];
    if (!link) {
      yield* callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text: "Usage: /add [rss subscribe link]",
      });
      return;
    }

    yield* addRssSubscribe(message.chat.id, link.trim());
    yield* callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Success",
    });
  });

const remove = (message: Message.TextMessage) =>
  Effect.gen(function* () {
    const [_, id] = message.text.match(/^\/remove (\d*)/) || [];
    if (!id) {
      yield* callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text: "Usage: /remove [subscribe id]",
      });
      return;
    }

    yield* removeRssSubscribe(message.chat.id, parseInt(id));
    yield* callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Success",
    });
  });

const list = (message: Message.TextMessage) =>
  Effect.gen(function* () {
    const subscribes = yield* getSubscribesByUserId(message.chat.id);
    if (!subscribes.length) {
      yield* callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text: "Not subscribe found",
      });
      return;
    }

    let text = "";
    for (const sourceId of subscribes) {
      const source = (yield* getSourceById(sourceId))!;
      text += `\\[${sourceId}] `;
      text += `[${source.title}](${source.link})`;
      text += "\n";
    }

    yield* callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text,
      parse_mode: "Markdown",
    });
  });

const check = (message: Message.TextMessage) =>
  Effect.gen(function* () {
    yield* callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Not implemented yet",
    });
  });

const pause = (message: Message.TextMessage) =>
  Effect.gen(function* () {
    yield* callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Not implemented yet",
    });
  });

const activate = (message: Message.TextMessage) =>
  Effect.gen(function* () {
    yield* callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Not implemented yet",
    });
  });

const update = (message: Message.TextMessage) =>
  Effect.gen(function* () {
    yield* callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Not implemented yet",
    });
  });

const importCmd = (message: Message.TextMessage) =>
  Effect.gen(function* () {
    yield* callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Not implemented yet",
    });
  });

const exportCmd = (message: Message.TextMessage) =>
  Effect.gen(function* () {
    yield* callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Not implemented yet",
    });
  });

export const commandDefinition = [
  {
    command: "ping",
    description: "打个招呼",
    handler: ping,
  },
  {
    command: "add",
    description: "订阅 RSS 源",
    handler: add,
  },
  {
    command: "remove",
    description: "退订 RSS 源",
    handler: remove,
  },
  {
    command: "list",
    description: "列出 RSS 源",
    handler: list,
  },
  {
    command: "check",
    description: "检查 RSS 订阅状态",
    handler: check,
  },
  {
    command: "pause",
    description: "暂停查询最新订阅",
    handler: pause,
  },
  {
    command: "activate",
    description: "恢复查询最新订阅",
    handler: activate,
  },
  {
    command: "update",
    description: "手动查询最新订阅",
    handler: update,
  },
  {
    command: "import",
    description: "导入",
    handler: importCmd,
  },
  {
    command: "export",
    description: "导出",
    handler: exportCmd,
  },
];
