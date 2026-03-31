import type { ApiError, ApiMethods, ApiResponse } from "@telegraf/types";
import {
  TgBodyParseError,
  TgNetworkError,
  TgResponseError,
} from "../errors.ts";

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

export class TgApiError extends Error {
  constructor(public readonly apiError: ApiError) {
    super(apiError.description);
    this.name = "TgApiError";
  }
}

export async function callTelegram<T extends keyof ApiMethods<File>>(
  api: T,
  params: Args<T>,
): Promise<Response<T>> {
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
  } catch (cause) {
    throw new TgNetworkError(api, { cause });
  }

  if (!response.ok) {
    let body = "<unable to read response body>";
    try {
      body = await response.text();
    } catch {
      // Ignore body read errors and keep fallback message.
    }

    throw new TgResponseError(
      response.status,
      response.statusText,
      body,
      api,
    );
  }

  let apiResponse: ApiResponse<Response<T>>;
  try {
    apiResponse = await response.json() as ApiResponse<Response<T>>;
  } catch (cause) {
    throw new TgBodyParseError(api, { cause });
  }

  if (apiResponse.ok === false) {
    throw new TgApiError(apiResponse);
  }

  return apiResponse.result;
}

export async function getTelegramFile(filePath: string): Promise<Blob> {
  const api = `file/${filePath}`;
  let response: globalThis.Response;
  try {
    response = await fetch(FILE_BASE_URL + filePath);
  } catch (cause) {
    throw new TgNetworkError(api, { cause });
  }

  if (!response.ok) {
    let body = "<unable to read response body>";
    try {
      body = await response.text();
    } catch {
      // Ignore body read errors and keep fallback message.
    }

    throw new TgResponseError(
      response.status,
      response.statusText,
      body,
      api,
    );
  }

  try {
    return await response.blob();
  } catch (cause) {
    throw new TgBodyParseError(api, { cause });
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
