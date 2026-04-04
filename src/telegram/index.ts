import type { ApiError, ApiMethods, ApiResponse } from "@telegraf/types";
import ky from "ky";

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
  const apiResponse = await ky.post(BASE_URL + api, {
    json: params,
  }).json<ApiResponse<Response<T>>>();

  if (apiResponse.ok === false) {
    throw new TgApiError(apiResponse);
  }

  return apiResponse.result;
}

export async function getTelegramFile(filePath: string): Promise<Blob> {
  return await ky.get(FILE_BASE_URL + filePath).blob();
}

export async function sendDocument(
  chatId: number,
  document: Blob,
  filename: string,
): Promise<void> {
  const formData = new FormData();
  formData.append("chat_id", String(chatId));
  formData.append("document", document, filename);

  const response = await ky.post(BASE_URL + "sendDocument", {
    // @ts-expect-error -- Deno type mismatch
    body: formData,
  }).json<ApiResponse<unknown>>();

  if (response.ok === false) {
    throw new TgApiError(response);
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
