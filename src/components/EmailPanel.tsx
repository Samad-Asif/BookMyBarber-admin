import { useEffect, useState } from "react";
import { CircleCheck, MailWarning, RefreshCw, Send } from "lucide-react";
import { fetchEmailStatus, sendAdminTestEmail, type EmailStatus } from "../lib/email";
import { formatApiError } from "../lib/network-error";
import { formatDateTime } from "../lib/format";

const KIND_LABELS: Record<string, string> = {
  verification_code: "Verification code",
  password_reset: "Password reset",
  account_locked: "Account locked",
  booking_confirmation: "Booking confirmation",
  payment_receipt: "Payment receipt",
  test: "Test email",
};

const STATUS_CLASS: Record<string, string> = {
  sent: "bg-chart-2/10 text-chart-2",
  failed: "bg-destructive/10 text-destructive",
  sending: "bg-chart-4/15 text-foreground/70",
};

type Notice = { tone: "success" | "error"; text: string } | null;

export default function EmailPanel() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEmailStatus()
      .then((next) => {
        if (cancelled) return;
        setStatus(next);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(formatApiError(err, "Failed to load email status"));
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const recheck = () => {
    setChecking(true);
    setNotice(null);
    setReloadKey((k) => k + 1);
  };

  const handleTest = async () => {
    setSending(true);
    setNotice(null);
    try {
      const { to } = await sendAdminTestEmail();
      setNotice({ tone: "success", text: `Test email sent to ${to}. Check that inbox (and spam).` });
    } catch (err: unknown) {
      setNotice({ tone: "error", text: formatApiError(err, "Test email failed") });
    } finally {
      setSending(false);
      setReloadKey((k) => k + 1);
    }
  };

  const verify = status?.verify;
  const config = status?.config;
  const healthy = Boolean(verify?.ok) && !config?.dryRun;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl ${healthy ? "bg-chart-2/10 text-chart-2" : "bg-destructive/10 text-destructive"}`}
            >
              {healthy ? <CircleCheck className="w-5 h-5" /> : <MailWarning className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="font-heading font-bold text-foreground text-lg">
                {checking && !status
                  ? "Checking email connection…"
                  : healthy
                    ? "Email delivery is working"
                    : config?.dryRun
                      ? "Dry-run mode — emails are not sent"
                      : verify && !verify.configured
                        ? "Email is not configured"
                        : "Email login is failing"}
              </h4>
              <p className="text-muted-foreground text-xs mt-1 font-body max-w-2xl">
                Sends verification codes, password resets, booking confirmations and payment receipts.
                {verify?.checkedAt ? ` Last checked ${formatDateTime(verify.checkedAt)}.` : ""}
                {verify?.latencyMs != null ? ` SMTP login took ${verify.latencyMs} ms.` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={recheck}
              disabled={checking}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer font-body bg-sidebar-accent text-sidebar-foreground flex items-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              Re-check
            </button>
            <button
              onClick={handleTest}
              disabled={sending || !verify?.configured}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer font-body bg-primary text-primary-foreground flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? "Sending…" : "Send test email to me"}
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive font-body">
            {loadError}
          </div>
        )}

        {verify && !verify.ok && verify.error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-body">
            <p className="font-semibold text-destructive">{verify.configured ? "SMTP error" : "Missing settings"}</p>
            <p className="text-foreground/80 mt-1 break-words">{verify.error}</p>
            {!verify.configured && (
              <p className="text-muted-foreground mt-2 text-xs">
                Add SMTP_USER (the Gmail address) and SMTP_PASS (a 16-character Google App Password) under
                Vercel → book-my-barber-bk → Settings → Environment Variables, then redeploy.
              </p>
            )}
          </div>
        )}

        {notice && (
          <p
            className={`mb-4 text-sm font-body ${notice.tone === "error" ? "text-destructive" : "text-chart-2"}`}
            role="status"
          >
            {notice.text}
          </p>
        )}

        {config && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm font-body">
            <div className="rounded-xl bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">Server</dt>
              <dd className="text-foreground font-medium mt-0.5">
                {config.host}:{config.port}
                {config.transport === "gmail" ? " (Gmail)" : ""}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">Login</dt>
              <dd className="text-foreground font-medium mt-0.5 break-all">
                {config.user ?? "—"}
                {config.sources.user && config.sources.user !== "SMTP_USER" && (
                  <span className="text-muted-foreground text-xs"> via {config.sources.user}</span>
                )}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">Sender</dt>
              <dd className="text-foreground font-medium mt-0.5 break-all">{config.from ?? "—"}</dd>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">Password</dt>
              <dd className="text-foreground font-medium mt-0.5">
                {config.sources.pass ? `Set (${config.sources.pass})` : "Not set"}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h4 className="font-heading font-bold text-foreground text-lg mb-6">Recent emails</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase font-body">
                <th className="pb-3 pr-4">Time</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Recipient</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {(status?.deliveries ?? []).map((d) => (
                <tr key={d.id} className="border-b border-border/60 font-body align-top">
                  <td className="py-3 pr-4 text-muted-foreground text-xs whitespace-nowrap">
                    {formatDateTime(d.created_at)}
                  </td>
                  <td className="py-3 pr-4 text-foreground">{KIND_LABELS[d.kind] ?? d.kind}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{d.recipient}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASS[d.status] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {d.status}
                    </span>
                    {d.attempts > 1 && (
                      <span className="block text-[11px] text-muted-foreground mt-1">{d.attempts} attempts</span>
                    )}
                  </td>
                  <td className="py-3 text-xs text-muted-foreground max-w-md break-words">
                    {d.error ?? d.subject ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {status && status.deliveries.length === 0 && (
            <p className="text-muted-foreground text-center py-8 text-sm font-body">
              No emails recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
