import axios from "axios";

import { getApiBaseUrl } from "./api-config";

export function formatApiError(error: unknown, fallback = "Request failed"): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ERR_NETWORK") {
      return `Network error — cannot reach ${getApiBaseUrl()}. Check VITE_API_URL, ngrok tunnel, and backend CORS.`;
    }
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
