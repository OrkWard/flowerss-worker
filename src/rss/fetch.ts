export class FetchNetworkError extends Error {
  constructor(
    public readonly error: unknown,
    public readonly url: string,
  ) {
    super(`Network error while fetching ${url}`);
    this.name = "FetchNetworkError";
  }
}

export class FetchResponseError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
    public readonly url: string,
  ) {
    super(`Unexpected response ${status} ${statusText} for ${url}`);
    this.name = "FetchResponseError";
  }
}

export class FetchBodyTransformError extends Error {
  constructor(
    public readonly error: unknown,
    public readonly url: string,
  ) {
    super(`Failed to read response body from ${url}`);
    this.name = "FetchBodyTransformError";
  }
}

export type FetchError =
  | FetchNetworkError
  | FetchResponseError
  | FetchBodyTransformError;

export async function get(url: string): Promise<string> {
  let response: globalThis.Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "FeedlyBot/1.0 (+http://www.feedly.com/feedlybot.html)",
      },
    });
  } catch (error) {
    throw new FetchNetworkError(error, url);
  }

  if (!response.ok) {
    let body = "<unable to read response body>";
    try {
      body = await response.text();
    } catch {
      // Ignore body read errors and keep fallback message.
    }

    throw new FetchResponseError(
      response.status,
      response.statusText,
      body,
      url,
    );
  }

  try {
    return await response.text();
  } catch (error) {
    throw new FetchBodyTransformError(error, url);
  }
}
