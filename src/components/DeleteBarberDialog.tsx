import React, { useEffect, useState } from "react";
import { TriangleAlert, Trash2 } from "lucide-react";
import { deleteBarber, type AdminBarber, type BarberDeletionSummary } from "../lib/barbers";
import { formatApiError } from "../lib/network-error";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export default function DeleteBarberDialog({
  barber,
  onCancel,
  onDeleted,
}: {
  barber: AdminBarber;
  onCancel: () => void;
  onDeleted: (summary: BarberDeletionSummary) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmToken = barber.email ?? "DELETE";
  const confirmed = confirmText.trim().toLowerCase() === confirmToken.toLowerCase();
  const displayName = barber.name || barber.email || "this barber";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleting, onCancel]);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      onDeleted(await deleteBarber(barber.id));
    } catch (err: unknown) {
      setError(formatApiError(err, "Failed to delete barber"));
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-barber-title"
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg font-body">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
            <TriangleAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 id="delete-barber-title" className="font-heading text-lg font-bold text-foreground">
              Delete barber permanently?
            </h4>
            <p className="text-muted-foreground text-sm mt-1">
              <span className="font-semibold text-foreground">{displayName}</span>
              {barber.email && barber.name ? ` (${barber.email})` : ""} and everything they own will
              be removed. This cannot be undone.
            </p>
          </div>
        </div>

        <ul className="text-sm text-foreground space-y-1.5 mb-4 rounded-xl border border-border bg-muted/40 p-4">
          <li>
            <span className="font-semibold">{plural(barber.shop_count, "shop")}</span>
            {barber.shops.length > 0 && (
              <span className="text-muted-foreground"> — {barber.shops.map((s) => s.name).join(", ")}</span>
            )}
          </li>
          <li>
            {plural(barber.worker_count, "team member")}, {plural(barber.service_count, "service")} and
            working hours
          </li>
          <li>
            {plural(barber.booking_count, "booking")}
            {barber.upcoming_booking_count > 0 && (
              <span className="text-destructive font-semibold">
                {" "}
                including {barber.upcoming_booking_count} upcoming
              </span>
            )}
          </li>
          <li>Shop reviews, customer chats, calendar links and login sessions</li>
        </ul>

        {barber.upcoming_booking_count > 0 && (
          <p className="text-xs text-destructive mb-3">
            Customers with upcoming appointments are not notified automatically — contact them before
            deleting.
          </p>
        )}
        <p className="text-xs text-muted-foreground mb-4">
          Customers keep their payment records and loyalty spend.
        </p>

        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label
              htmlFor="confirm-barber-delete"
              className="block text-xs font-semibold text-muted-foreground mb-1"
            >
              Type <span className="font-mono text-foreground">{confirmToken}</span> to confirm
            </label>
            <input
              id="confirm-barber-delete"
              type="text"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              disabled={deleting}
              className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-destructive text-sm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="px-4 py-2 border border-border hover:bg-muted text-foreground rounded-lg text-sm cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!confirmed || deleting}
              className="px-4 py-2 bg-destructive hover:opacity-90 text-destructive-foreground rounded-lg text-sm font-semibold cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <span className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {deleting ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
