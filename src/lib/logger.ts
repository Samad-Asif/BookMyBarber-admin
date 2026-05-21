type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_PREFIX = "[BookMyBarber Admin]";

/** Enabled in dev when VITE_DEBUG_LOGS is not explicitly "false" */
export function isLoggingEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  return import.meta.env.VITE_DEBUG_LOGS !== "false";
}

function log(level: LogLevel, message: string, data?: unknown): void {
  if (!isLoggingEnabled()) return;

  const ts = new Date().toISOString();
  const label = `${LOG_PREFIX} ${ts} ${level.toUpperCase()}`;

  switch (level) {
    case "debug":
      console.debug(label, message, data ?? "");
      break;
    case "info":
      console.info(label, message, data ?? "");
      break;
    case "warn":
      console.warn(label, message, data ?? "");
      break;
    case "error":
      console.error(label, message, data ?? "");
      break;
  }
}

export const logger = {
  debug: (message: string, data?: unknown) => log("debug", message, data),
  info: (message: string, data?: unknown) => log("info", message, data),
  warn: (message: string, data?: unknown) => log("warn", message, data),
  error: (message: string, data?: unknown) => log("error", message, data),
  apiRequest: (method: string, url: string, data?: unknown) =>
    log("info", `→ ${method.toUpperCase()} ${url}`, data),
  apiResponse: (method: string, url: string, status: number, data?: unknown) =>
    log("info", `← ${status} ${method.toUpperCase()} ${url}`, data),
  apiError: (method: string, url: string, status: number | undefined, data?: unknown) =>
    log("error", `✗ ${status ?? "?"} ${method.toUpperCase()} ${url}`, data),
};
