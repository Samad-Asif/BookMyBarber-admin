import { useEffect, useMemo, useState } from "react";
import { CircleCheck, RefreshCw, Search, Trash2, X } from "lucide-react";
import {
  fetchAdminBarbers,
  type AdminBarber,
  type BarberDeletionSummary,
} from "../lib/barbers";
import { formatApiError } from "../lib/network-error";
import { formatDate, formatPkr } from "../lib/format";
import DeleteBarberDialog from "./DeleteBarberDialog";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; barbers: AdminBarber[] };

const SHOP_STATUS_CLASS: Record<string, string> = {
  approved: "bg-chart-2/10 text-chart-2",
  pending: "bg-chart-4/15 text-foreground/70",
  rejected: "bg-destructive/10 text-destructive",
};

export default function BarbersPanel({ onBarberDeleted }: { onBarberDeleted: () => void }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminBarber | null>(null);
  const [lastDeleted, setLastDeleted] = useState<BarberDeletionSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminBarbers()
      .then((barbers) => {
        if (!cancelled) setState({ status: "ready", barbers });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: formatApiError(err, "Failed to load barbers") });
        }
      })
      .finally(() => {
        if (!cancelled) setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = () => {
    setRefreshing(true);
    setReloadKey((k) => k + 1);
  };

  const barbers = useMemo(() => (state.status === "ready" ? state.barbers : []), [state]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return barbers;
    return barbers.filter((b) =>
      [b.name, b.email, b.phone, ...b.shops.map((s) => s.name)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [barbers, search]);

  const handleDeleted = (summary: BarberDeletionSummary) => {
    setPendingDelete(null);
    setLastDeleted(summary);
    setState((prev) =>
      prev.status === "ready"
        ? { status: "ready", barbers: prev.barbers.filter((b) => b.id !== summary.barber.id) }
        : prev
    );
    onBarberDeleted();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h4 className="font-heading font-bold text-foreground text-lg">
            Registered barbers{state.status === "ready" ? ` (${barbers.length})` : ""}
          </h4>
          <p className="text-muted-foreground text-xs mt-1 font-body">
            Deleting a barber permanently removes their account, shops, team, services and bookings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search barbers</span>
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search name, email, shop…"
              className="bg-background border border-input rounded-lg pl-9 pr-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer font-body bg-sidebar-accent text-sidebar-foreground flex items-center gap-1.5 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {lastDeleted && (
        <div className="mb-4 rounded-xl border border-chart-2/30 bg-chart-2/10 p-4 text-sm font-body flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <CircleCheck className="w-5 h-5 text-chart-2 shrink-0" />
            <p className="text-foreground">
              Deleted <span className="font-semibold">{lastDeleted.barber.name || lastDeleted.barber.email}</span>
              {" — "}
              {lastDeleted.shops} shop{lastDeleted.shops === 1 ? "" : "s"}, {lastDeleted.bookings} booking
              {lastDeleted.bookings === 1 ? "" : "s"}, {lastDeleted.workers} team member
              {lastDeleted.workers === 1 ? "" : "s"} and {lastDeleted.services} service
              {lastDeleted.services === 1 ? "" : "s"} removed.
            </p>
          </div>
          <button
            onClick={() => setLastDeleted(null)}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {state.status === "error" && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-body">
          <p className="font-semibold text-destructive">Could not load barbers</p>
          <p className="text-muted-foreground mt-1">{state.message}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-3 text-primary text-xs font-semibold cursor-pointer font-body"
          >
            Retry
          </button>
        </div>
      )}

      {state.status === "loading" ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase font-body">
                <th className="pb-3 pr-4">Barber</th>
                <th className="pb-3 pr-4">Shops</th>
                <th className="pb-3 pr-4">Team / services</th>
                <th className="pb-3 pr-4">Bookings</th>
                <th className="pb-3 pr-4">Paid volume</th>
                <th className="pb-3 pr-4">Joined</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((b) => (
                <tr key={b.id} className="border-b border-border/60 font-body align-top">
                  <td className="py-3 pr-4">
                    <span className="text-foreground font-medium block">{b.name || "—"}</span>
                    <span className="text-muted-foreground text-xs block">{b.email ?? "no email"}</span>
                    {b.phone && <span className="text-muted-foreground text-xs block">{b.phone}</span>}
                  </td>
                  <td className="py-3 pr-4">
                    {b.shops.length === 0 ? (
                      <span className="text-muted-foreground text-xs">No shop yet</span>
                    ) : (
                      <div className="space-y-1">
                        {b.shops.map((s) => (
                          <div key={s.id} className="flex items-center gap-2">
                            <span className="text-foreground/90">{s.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${SHOP_STATUS_CLASS[s.status] ?? "bg-muted text-muted-foreground"}`}
                            >
                              {s.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {b.worker_count} · {b.service_count}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-foreground">{b.booking_count}</span>
                    {b.upcoming_booking_count > 0 && (
                      <span className="block text-xs text-chart-5 font-semibold">
                        {b.upcoming_booking_count} upcoming
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-foreground">{formatPkr(b.paid_revenue_pkr)}</td>
                  <td className="py-3 pr-4 text-muted-foreground text-xs">
                    {formatDate(b.created_at)}
                    <span className="block">Last login {formatDate(b.last_login_at)}</span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => setPendingDelete(b)}
                      className="inline-flex items-center gap-1.5 text-destructive text-xs font-semibold cursor-pointer font-body hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && state.status === "ready" && (
            <p className="text-muted-foreground text-center py-8 text-sm font-body">
              {barbers.length === 0 ? "No barbers registered yet." : "No barbers match this search."}
            </p>
          )}
        </div>
      )}

      {pendingDelete && (
        <DeleteBarberDialog
          barber={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
