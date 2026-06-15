import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { applyNgrokHeaders, getApiBaseUrl } from "./api-config";
import { logger } from "./logger";

const API_BASE_URL = getApiBaseUrl();

export const TOKEN_STORAGE_KEY = "bmb_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "bmb_refresh_token";

let refreshInFlight: Promise<string | null> | null = null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export function setAccessToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    logger.debug("Access token stored");
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    logger.debug("Access token cleared");
  }
}

export function setRefreshToken(token: string | null): void {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function setSessionTokens(
  accessToken: string | null,
  refreshToken: string | null
): void {
  setAccessToken(accessToken);
  setRefreshToken(refreshToken);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  if (!refresh?.trim()) return null;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  applyNgrokHeaders(headers, API_BASE_URL);
  const { data } = await axios.post<{
    session: { access_token: string; refresh_token: string };
  }>(`${API_BASE_URL}/auth/refresh`, { refresh_token: refresh }, { headers });

  setSessionTokens(data.session.access_token, data.session.refresh_token);
  return data.session.access_token;
}

export async function tryRestoreSession(): Promise<boolean> {
  if (localStorage.getItem(TOKEN_STORAGE_KEY)?.trim()) return true;
  if (!localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)?.trim()) return false;
  try {
    return Boolean(await refreshAccessToken());
  } catch {
    setSessionTokens(null, null);
    return false;
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const headers = config.headers as Record<string, string>;
  applyNgrokHeaders(headers, API_BASE_URL);
  config.headers = headers;

  const method = config.method ?? "get";
  const url = `${config.baseURL ?? ""}${config.url ?? ""}`;
  logger.apiRequest(method, url, {
    params: config.params,
    body: config.data,
    hasAuth: Boolean(token),
  });

  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = response.config.method ?? "get";
    const url = `${response.config.baseURL ?? ""}${response.config.url ?? ""}`;
    logger.apiResponse(method, url, response.status, response.data);
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const method = config?.method ?? "get";
    const url = `${config?.baseURL ?? ""}${config?.url ?? ""}`;
    logger.apiError(method, url, error.response?.status, {
      message: error.message,
      data: error.response?.data,
    });

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retry ||
      config.url?.includes("/auth/refresh") ||
      config.url?.includes("/auth/login")
    ) {
      return Promise.reject(error);
    }

    config._retry = true;
    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }
    const newToken = await refreshInFlight;
    if (!newToken) {
      setSessionTokens(null, null);
      return Promise.reject(error);
    }
    config.headers.Authorization = `Bearer ${newToken}`;
    return api(config);
  }
);
