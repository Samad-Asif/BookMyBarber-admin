import { api, setSessionTokens } from "./api";
import { logger } from "./logger";

export type UserRole = "customer" | "barber" | "admin";

export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

/** All auth flows go through the backend — never Supabase directly. */
export async function login(
  email: string,
  password: string
): Promise<AuthSession> {
  logger.info("Login attempt", { email });
  const { data } = await api.post<AuthSession>("/auth/login", { email, password });
  setSessionTokens(data.session.access_token, data.session.refresh_token);
  logger.info("Login success", { userId: data.user.id, role: data.user.role });
  return data;
}

export async function logout(): Promise<void> {
  logger.info("Logout");
  const refreshToken = localStorage.getItem("bmb_refresh_token");
  try {
    await api.post("/auth/logout", { refresh_token: refreshToken });
  } finally {
    setSessionTokens(null, null);
  }
}

export async function getMe(): Promise<{ user: AuthUser }> {
  const { data } = await api.get<{ user: AuthUser }>("/auth/me");
  return data;
}
