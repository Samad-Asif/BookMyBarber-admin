/** Synced with docs/design-system/tokens.ts */
export const CHART = {
  1: '#E77423',
  2: '#2A9D90',
  3: '#333C4D',
  4: '#E8C468',
  5: '#E76E50',
} as const;

/**
 * Loyalty tier colours — keep in sync with the backend emails + mobile app.
 * solid: fills/progress (≥4.5:1 with white text); tint + text: badges (AA).
 */
export const TIER_COLORS = {
  iron: { solid: '#4B5563', tint: '#E7E9EC', text: '#374151' },
  silver: { solid: '#5F6B7E', tint: '#EEF1F6', text: '#475467' },
  gold: { solid: '#8A6A0B', tint: '#FBF0CC', text: '#7A5A00' },
  diamond: { solid: '#1D6FB8', tint: '#DDEEFC', text: '#155A96' },
  platinum: { solid: '#6A46C8', tint: '#ECE5FC', text: '#5335A8' },
} as const;
