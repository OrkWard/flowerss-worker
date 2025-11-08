import { Console, Effect, pipe } from "effect";
import { getAllSources, renewSource } from "./model/source.ts";
import { fetchRss } from "./rss/index.ts";
import { getUsers } from "./model/user.ts";
import { getSubscribesByUserId } from "./model/subscribe.ts";
import { callTelegram, escapeMarkdownV2 } from "./telegram/index.ts";
import { FeedItem } from "./rss/parse.ts";

function formatFeed(feedItem: FeedItem, sourceTitle: string) {
  const title = `*${escapeMarkdownV2(sourceTitle)}* ${
    escapeMarkdownV2(new Date(feedItem.pubDate).toLocaleDateString())
  }`;
  const desc = escapeMarkdownV2(`-------- Description --------
${feedItem.description}
---------- Link ----------`);
  const link = `[${escapeMarkdownV2(feedItem.title)}](${
    escapeMarkdownV2(feedItem.link)
  })`;

  return [title, desc, link].join("\n");
}

// 更新订阅，返回更新后的订阅信息
const updateSource = pipe(
  getAllSources,
  Effect.flatMap((allSources) =>
    Effect.all(allSources.map((source) =>
      Effect.gen(function* () {
        const feed = yield* fetchRss(source.link);
        // yield* Console.log(feed);
        if (feed.lastPub > source.update_at) {
          yield* renewSource(source.id, feed.lastPub);
        }
        return [
          source,
          feed.items.filter((item) => item.pubDate > source.update_at),
        ] as const;
      })
    ))
  ),
);

export const handleCronjob = pipe(
  Effect.zip(getUsers, updateSource),
  // Effect.tap(([users, updateSource]) => Console.log(users, updateSource)),
  Effect.flatMap(([users, updatedSources]) =>
    Effect.forEach(users, (user) =>
      pipe(
        getSubscribesByUserId(user.id),
        Effect.flatMap((subscribes) =>
          Effect.forEach(
            updatedSources
              .filter(([source]) => subscribes.includes(source.id))
              .flatMap(([source, feeds]) =>
                feeds.map((feed) => [source, feed] as const)
              ),
            ([source, feed]) =>
              callTelegram("sendMessage", {
                chat_id: user.id,
                text: formatFeed(feed, source.title),
                parse_mode: "MarkdownV2",
              }),
            {
              concurrency: "unbounded",
              discard: true,
            },
          )
        ),
      ), { concurrency: 5, discard: true })
  ),
);
