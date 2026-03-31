// Custom error classes for the application

export class AppError extends Error {
  constructor(
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

// Telegram errors
export class TgNetworkError extends AppError {
  constructor(
    public readonly api: string,
    options?: { cause?: unknown },
  ) {
    super(`Telegram network error for ${api}`, options);
  }
}

export class TgResponseError extends AppError {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
    public readonly api: string,
  ) {
    super(`Telegram response error ${status} ${statusText} for ${api}`);
  }
}

export class TgBodyParseError extends AppError {
  constructor(
    public readonly api: string,
    options?: { cause?: unknown },
  ) {
    super(`Telegram body parse error for ${api}`, options);
  }
}

// RSS parse errors
export class ParseError extends AppError {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export class UnsupportedFormatError extends AppError {
  constructor(public readonly context?: Record<string, unknown>) {
    super("Unsupported feed format");
  }
}
