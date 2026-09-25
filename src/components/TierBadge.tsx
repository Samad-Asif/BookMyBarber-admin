import { TIER_COLORS } from "../constants/design-tokens";
import type { LoyaltyTierKey } from "../lib/loyalty";

export default function TierBadge({ tier }: { tier: LoyaltyTierKey }) {
  const colors = TIER_COLORS[tier] ?? TIER_COLORS.iron;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold font-body capitalize"
      style={{ backgroundColor: colors.tint, color: colors.text }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: colors.solid }}
        aria-hidden="true"
      />
      {tier}
    </span>
  );
}
