import { api } from "./api";

export const LOYALTY_TIER_KEYS = ["iron", "silver", "gold", "diamond", "platinum"] as const;
export type LoyaltyTierKey = (typeof LOYALTY_TIER_KEYS)[number];
export type LoyaltyThresholds = Record<Exclude<LoyaltyTierKey, "iron">, number>;

export interface LoyaltyTierRow {
  tier: LoyaltyTierKey;
  name: string;
  rank: number;
  minSpendPkr: number;
  customerCount: number;
}

export interface LoyaltyCustomerRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  createdAt: string;
  loyaltyTier: LoyaltyTierKey;
  lifetimeSpendPkr: number;
  nextTier: LoyaltyTierKey | null;
  amountToNextTierPkr: number;
  progressPercent: number;
  loyaltyUpdatedAt: string | null;
}

export async function fetchLoyaltyTiers(): Promise<LoyaltyTierRow[]> {
  const { data } = await api.get<{ tiers: LoyaltyTierRow[] }>("/admin/loyalty/tiers");
  return data.tiers ?? [];
}

export async function saveLoyaltyThresholds(
  thresholds: LoyaltyThresholds
): Promise<{ tiers: LoyaltyTierRow[]; customersUpdated: number }> {
  const { data } = await api.put<{ tiers: LoyaltyTierRow[]; customersUpdated: number }>(
    "/admin/loyalty/tiers",
    { thresholds }
  );
  return data;
}

export async function fetchLoyaltyCustomers(params?: {
  search?: string;
  tier?: LoyaltyTierKey;
  limit?: number;
}): Promise<LoyaltyCustomerRow[]> {
  const { data } = await api.get<{ customers: LoyaltyCustomerRow[] }>(
    "/admin/loyalty/customers",
    { params }
  );
  return data.customers ?? [];
}

export async function recalculateLoyalty(): Promise<number> {
  const { data } = await api.post<{ customersUpdated: number }>("/admin/loyalty/recalculate");
  return data.customersUpdated;
}
