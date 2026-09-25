import React, { useEffect, useState } from "react";
import { RefreshCw, Save, Search } from "lucide-react";
import { TIER_COLORS } from "../constants/design-tokens";
import {
  LOYALTY_TIER_KEYS,
  fetchLoyaltyCustomers,
  fetchLoyaltyTiers,
  recalculateLoyalty,
  saveLoyaltyThresholds,
  type LoyaltyCustomerRow,
  type LoyaltyThresholds,
  type LoyaltyTierKey,
  type LoyaltyTierRow,
} from "../lib/loyalty";
import { formatApiError } from "../lib/network-error";
import { formatDate, formatPkr } from "../lib/format";
import TierBadge from "./TierBadge";

type EditableTier = keyof LoyaltyThresholds;
const EDITABLE: EditableTier[] = ["silver", "gold", "diamond", "platinum"];

type Notice = { tone: "success" | "error"; text: string } | null;

function thresholdsFrom(tiers: LoyaltyTierRow[]): Record<EditableTier, string> {
  const get = (t: EditableTier) => String(tiers.find((row) => row.tier === t)?.minSpendPkr ?? "");
  return { silver: get("silver"), gold: get("gold"), diamond: get("diamond"), platinum: get("platinum") };
}

function validateThresholds(draft: Record<EditableTier, string>): LoyaltyThresholds | string {
  const values = EDITABLE.map((t) => Number(draft[t]));
  if (values.some((v) => !Number.isInteger(v) || v <= 0)) {
    return "Each threshold must be a whole number of rupees above 0.";
  }
  if (values.some((v, i) => i > 0 && v <= values[i - 1])) {
    return "Thresholds must increase: Silver < Gold < Diamond < Platinum.";
  }
  const [silver, gold, diamond, platinum] = values;
  return { silver, gold, diamond, platinum };
}

export default function LoyaltyPanel() {
  const [tiers, setTiers] = useState<LoyaltyTierRow[]>([]);
  const [draft, setDraft] = useState<Record<EditableTier, string>>({
    silver: "",
    gold: "",
    diamond: "",
    platinum: "",
  });
  const [customers, setCustomers] = useState<LoyaltyCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<"all" | LoyaltyTierKey>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  // Bumped after saves/recalculations to re-fetch
  const [tiersKey, setTiersKey] = useState(0);
  const [customersKey, setCustomersKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchLoyaltyTiers()
      .then((rows) => {
        if (cancelled) return;
        setTiers(rows);
        setDraft(thresholdsFrom(rows));
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(formatApiError(err, "Failed to load loyalty tiers"));
      });
    return () => {
      cancelled = true;
    };
  }, [tiersKey]);

  useEffect(() => {
    let cancelled = false;
    fetchLoyaltyCustomers({
      tier: tierFilter === "all" ? undefined : tierFilter,
      search: search || undefined,
      limit: 200,
    })
      .then((rows) => {
        if (cancelled) return;
        setCustomers(rows);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(formatApiError(err, "Failed to load customers"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tierFilter, search, customersKey]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = validateThresholds(draft);
    if (typeof parsed === "string") {
      setNotice({ tone: "error", text: parsed });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const result = await saveLoyaltyThresholds(parsed);
      setTiers(result.tiers);
      setDraft(thresholdsFrom(result.tiers));
      setNotice({
        tone: "success",
        text: `Thresholds saved — ${result.customersUpdated} customer${result.customersUpdated === 1 ? "" : "s"} re-tiered.`,
      });
      setCustomersKey((k) => k + 1);
    } catch (err: unknown) {
      setNotice({ tone: "error", text: formatApiError(err, "Failed to save thresholds") });
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setNotice(null);
    try {
      const count = await recalculateLoyalty();
      setNotice({
        tone: "success",
        text: `Recalculated ${count} customer${count === 1 ? "" : "s"} from their payment history.`,
      });
      setTiersKey((k) => k + 1);
      setCustomersKey((k) => k + 1);
    } catch (err: unknown) {
      setNotice({ tone: "error", text: formatApiError(err, "Recalculation failed") });
    } finally {
      setRecalculating(false);
    }
  };

  const dirty = tiers.length > 0 && EDITABLE.some((t) => draft[t] !== thresholdsFrom(tiers)[t]);
  const tierName = (key: LoyaltyTierKey | null) =>
    key ? tiers.find((t) => t.tier === key)?.name ?? key : null;

  return (
    <div className="space-y-6">
      {/* Tier overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {LOYALTY_TIER_KEYS.map((key) => {
          const row = tiers.find((t) => t.tier === key);
          return (
            <div
              key={key}
              className="bg-card border border-border rounded-2xl p-5 border-t-4"
              style={{ borderTopColor: TIER_COLORS[key].solid }}
            >
              <TierBadge tier={key} />
              <h3 className="font-heading text-2xl font-bold text-foreground mt-3">
                {row?.customerCount ?? "—"}
              </h3>
              <p className="text-muted-foreground text-xs font-body mt-1">
                {key === "iron"
                  ? "Starting tier"
                  : row
                    ? `From ${formatPkr(row.minSpendPkr)} spent`
                    : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Threshold editor */}
      <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h4 className="font-heading font-bold text-foreground text-lg">Spending thresholds</h4>
            <p className="text-muted-foreground text-xs mt-1 font-body max-w-2xl">
              Customers move up automatically when a payment takes their lifetime spend past a
              threshold. Lifetime spend counts paid bookings only (refunds excluded) and is kept even if
              the barber is later removed.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer font-body bg-sidebar-accent text-sidebar-foreground flex items-center gap-1.5 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recalculating ? "animate-spin" : ""}`} />
            Recalculate all
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <span className="block text-xs font-semibold text-muted-foreground mb-1 font-body">Iron</span>
            <div className="w-full bg-muted border border-input rounded-xl px-4 py-2.5 text-muted-foreground text-sm font-body">
              PKR 0
            </div>
          </div>
          {EDITABLE.map((key) => (
            <label key={key} className="block">
              <span className="block text-xs font-semibold text-muted-foreground mb-1 font-body capitalize">
                {key} from (PKR)
              </span>
              <input
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm font-body"
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <p
            className={`text-sm font-body ${notice?.tone === "error" ? "text-destructive" : "text-chart-2"}`}
            role="status"
          >
            {notice?.text ?? ""}
          </p>
          <button
            type="submit"
            disabled={saving || !dirty}
            className="px-4 py-2 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-sm font-semibold cursor-pointer font-body flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save & re-tier"}
          </button>
        </div>
      </form>

      {/* Customers */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h4 className="font-heading font-bold text-foreground text-lg">Customers by lifetime spend</h4>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", ...LOYALTY_TIER_KEYS] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTierFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer font-body capitalize ${tierFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {f}
              </button>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
              }}
              className="relative"
            >
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Search customers"
                placeholder="Search name or email"
                className="bg-background border border-input rounded-lg pl-9 pr-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-body w-56"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (!e.target.value) setSearch("");
                }}
              />
            </form>
          </div>
        </div>

        {loadError && <p className="text-destructive text-sm mb-4 font-body">{loadError}</p>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase font-body">
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Tier</th>
                  <th className="pb-3 pr-4">Lifetime spend</th>
                  <th className="pb-3 pr-4 min-w-[200px]">Progress to next tier</th>
                  <th className="pb-3 pr-4">City</th>
                  <th className="pb-3">Member since</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 font-body">
                    <td className="py-3 pr-4">
                      <span className="text-foreground font-medium block">{c.name || "Customer"}</span>
                      <span className="text-muted-foreground text-xs">{c.email}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <TierBadge tier={c.loyaltyTier} />
                    </td>
                    <td className="py-3 pr-4 font-semibold text-foreground">{formatPkr(c.lifetimeSpendPkr)}</td>
                    <td className="py-3 pr-4">
                      <div
                        className="h-2 rounded-full bg-muted overflow-hidden"
                        role="progressbar"
                        aria-valuenow={Math.round(c.progressPercent)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, c.progressPercent))}%`,
                            backgroundColor: TIER_COLORS[c.loyaltyTier].solid,
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground text-xs mt-1 block">
                        {c.nextTier
                          ? `${formatPkr(c.amountToNextTierPkr)} to ${tierName(c.nextTier)}`
                          : "Top tier reached"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{c.city ?? "—"}</td>
                    <td className="py-3 text-muted-foreground text-xs">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && !loadError && (
              <p className="text-muted-foreground text-center py-8 text-sm font-body">
                No customers match this filter.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
