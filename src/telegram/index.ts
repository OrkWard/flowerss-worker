import type { ApiError, ApiMethods, ApiResponse } from "@telegraf/types";
import { Data, Effect } from "effect";

type Args<T extends keyof ApiMethods<File>> = ApiMethods<File>[T] extends // deno-lint-ignore no-explicit-any
(...args: infer P) => any ? P[0]
  : never;
type Response<T extends keyof ApiMethods<File>> = ApiMethods<File>[T] extends // deno-lint-ignore no-explicit-any
(...args: any[]) => infer P ? P
  : never;

export const BASE_URL = `${
  Deno.env.get("telegram_api_origin") ?? "https://api.telegram.org"
}/bot${Deno.env.get("bot_token")}/`;

export const FILE_BASE_URL = `${
  Deno.env.get("telegram_api_origin") ?? "https://api.telegram.org"
}/file/bot${Deno.env.get("bot_token")}/`;

export class TgNetworkError extends Data.TaggedError("TgNetworkError")<{
  readonly error: unknown;
  readonly api: string;
}> {}

export class TgResponseError extends Data.TaggedError("TgResponseError")<{
  readonly status: number;
  readonly statusText: string;
  readonly body: string;
  readonly api: string;
}> {}

export class TgBodyParseError extends Data.TaggedError("TgBodyParseError")<{
  readonly error: unknown;
  readonly api: string;
}> {}

export class TgApiError extends Data.TaggedError("TgApiError")<ApiError> {}

export type TgError = TgNetworkError | TgResponseError | TgBodyParseError;

export const callTelegram = <T extends keyof ApiMethods<File>>(
  api: T,
  params: Args<T>,
) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(BASE_URL + api, {
          method: "POST",
          body: JSON.stringify(params),
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }),
      catch: (error) => new TgNetworkError({ error, api }),
    });

    if (!response.ok) {
      const body = yield* Effect.tryPromise(() => response.text()).pipe(
        Effect.orElseSucceed(() => "<unable to read response body>"),
      );
      return yield* Effect.fail(
        new TgResponseError({
          body,
          status: response.status,
          statusText: response.statusText,
          api,
        }),
      );
    }

    const apiResponse = yield* Effect.tryPromise({
      try: () => response.json() as Promise<ApiResponse<Response<T>>>,
      catch: (error) => new TgBodyParseError({ error, api }),
    });

    if (apiResponse.ok === false) {
      return yield* Effect.fail(new TgApiError(apiResponse));
    }

    return apiResponse.result;
  });

export const getTelegramFile = (file_path: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(FILE_BASE_URL + file_path),
      catch: (error) => new TgNetworkError({ error, api: "file/" + file_path }),
    });

    if (!response.ok) {
      const body = yield* Effect.tryPromise(() => response.text()).pipe(
        Effect.orElseSucceed(() => "<unable to read response body>"),
      );
      return yield* Effect.fail(
        new TgResponseError({
          body,
          status: response.status,
          statusText: response.statusText,
          api: "file/" + file_path,
        }),
      );
    }

    return yield* Effect.tryPromise({
      try: () => response.blob(),
      catch: (error) =>
        new TgBodyParseError({ error, api: "file/" + file_path }),
    });
  });

/**
 * @author asukaminato0721
 */
export function escapeMarkdownV2(text: string) {
  const reservedChars = [
    "_",
    "*",
    "[",
    "]",
    "(",
    ")",
    "~",
    "`",
    ">",
    "#",
    "+",
    "-",
    "=",
    "|",
    "{",
    "}",
    ".",
    "!",
  ];
  const escapedChars = reservedChars.map((char) => "\\" + char).join("");
  const regex = new RegExp(`([${escapedChars}])`, "g");
  return text.replace(regex, "\\$1");
}
