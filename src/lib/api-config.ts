const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/v1";

export function getApiBaseUrl(): string {
  const url = API_BASE_URL.trim();
  if (!/^https?:\/\//.test(url)) {
    throw new Error(`VITE_API_URL must start with http:// or https:// (got: ${url})`);
  }
  if (!url.endsWith("/v1")) {
    throw new Error(`VITE_API_URL must end with /v1 (got: ${url})`);
  }
  return url;
}

export function isNgrokHost(url: string): boolean {
  try {
    return new URL(url).hostname.includes("ngrok");
  } catch {
    return url.includes("ngrok");
  }
}

export function applyNgrokHeaders(headers: Record<string, string>, baseUrl: string): void {
  if (isNgrokHost(baseUrl)) {
    headers["ngrok-skip-browser-warning"] = "true";
  }
}
