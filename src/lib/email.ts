import { api } from "./api";

export interface EmailConfigSummary {
  transport: "gmail" | "smtp";
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  from: string | null;
  replyTo: string | null;
  dryRun: boolean;
  missing: string[];
  sources: { user: string | null; pass: string | null; from: string | null };
}

export interface SmtpVerifyResult {
  ok: boolean;
  configured: boolean;
  missing?: string[];
  latencyMs?: number;
  error?: string;
  checkedAt: string;
}

export interface EmailDelivery {
  id: string;
  kind: string;
  recipient: string;
  subject: string | null;
  status: "sending" | "sent" | "failed";
  attempts: number;
  error: string | null;
  message_id: string | null;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailStatus {
  config: EmailConfigSummary;
  verify: SmtpVerifyResult;
  deliveries: EmailDelivery[];
}

export async function fetchEmailStatus(): Promise<EmailStatus> {
  const { data } = await api.get<EmailStatus>("/admin/email/status", { timeout: 45000 });
  return data;
}

export async function sendAdminTestEmail(): Promise<{ to: string; result: { status: string } }> {
  const { data } = await api.post<{ to: string; result: { status: string } }>(
    "/admin/email/test",
    undefined,
    { timeout: 45000 }
  );
  return data;
}
