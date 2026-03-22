import type { ApiError, ApiMethods, ApiResponse } from "@telegraf/types";
import { err, ok, type Result } from "neverthrow";

type Args<T extends keyof ApiMethods<File>> = ApiMethods<File>[T] extends
  (...args: infer P) => unknown ? P[0]
  : never;
type Response<T extends keyof ApiMethods<File>> = ApiMethods<File>[T] extends
  (...args: unknown[]) => infer P ? P
  : never;

export const BASE_URL = `${
  Deno.env.get("telegram_api_origin") ?? "https://api.telegram.org"
}/bot${Deno.env.get("bot_token")}/`;

export const FILE_BASE_URL = `${
  Deno.env.get("telegram_api_origin") ?? "https://api.telegram.org"
}/file/bot${Deno.env.get("bot_token")}/`;

export class TgNetworkError extends Error {
  constructor(
    public readonly error: unknown,
    public readonly api: string,
  ) {
    super(`Telegram network error for ${api}`);
    this.name = "TgNetworkError";
  }
}

export class TgResponseError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
    public readonly api: string,
  ) {
    super(`Telegram response error ${status} ${statusText} for ${api}`);
    this.name = "TgResponseError";
  }
}

export class TgBodyParseError extends Error {
  constructor(
    public readonly error: unknown,
    public readonly api: string,
  ) {
    super(`Telegram body parse error for ${api}`);
    this.name = "TgBodyParseError";
  }
}

export class TgApiError extends Error {
  constructor(public readonly apiError: ApiError) {
    super(apiError.description);
    this.name = "TgApiError";
  }
}

export type TgError =
  | TgNetworkError
  | TgResponseError
  | TgBodyParseError
  | TgApiError;

export async function callTelegram<T extends keyof ApiMethods<File>>(
  api: T,
  params: Args<T>,
): Promise<Result<Response<T>, TgError>> {
  let response: globalThis.Response;
  try {
    response = await fetch(BASE_URL + api, {
      method: "POST",
      body: JSON.stringify(params),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  } catch (error) {
    return err(new TgNetworkError(error, api));
  }

  if (!response.ok) {
    let body = "<unable to read response body>";
    try {
      body = await response.text();
    } catch {
      // Ignore body read errors and keep fallback message.
    }

    return err(
      new TgResponseError(
        response.status,
        response.statusText,
        body,
        api,
      ),
    );
  }

  let apiResponse: ApiResponse<Response<T>>;
  try {
    apiResponse = await response.json() as ApiResponse<Response<T>>;
  } catch (error) {
    return err(new TgBodyParseError(error, api));
  }

  if (apiResponse.ok === false) {
    return err(new TgApiError(apiResponse));
  }

  return ok(apiResponse.result);
}

export async function getTelegramFile(
  filePath: string,
): Promise<Result<Blob, TgError>> {
  const api = `file/${filePath}`;
  let response: globalThis.Response;
  try {
    response = await fetch(FILE_BASE_URL + filePath);
  } catch (error) {
    return err(new TgNetworkError(error, api));
  }

  if (!response.ok) {
    let body = "<unable to read response body>";
    try {
      body = await response.text();
    } catch {
      // Ignore body read errors and keep fallback message.
    }

    return err(
      new TgResponseError(
        response.status,
        response.statusText,
        body,
        api,
      ),
    );
  }

  try {
    return ok(await response.blob());
  } catch (error) {
    return err(new TgBodyParseError(error, api));
  }
}

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
