// Phase 2: Sequence engine for email campaigns
// Will handle tier-based email sequences:
// Tier 1 (80-100): Aggressive 5-touch sequence over 10 days
// Tier 2 (50-79): Standard 3-touch sequence over 14 days
// Tier 3 (0-49): Nurture-only monthly touchpoint

export function getSequenceConfig(tier) {
  switch (tier) {
    case 1:
      return { touches: 5, spanDays: 10, label: 'Aggressive' };
    case 2:
      return { touches: 3, spanDays: 14, label: 'Standard' };
    case 3:
      return { touches: 1, spanDays: 30, label: 'Nurture' };
    default:
      return { touches: 1, spanDays: 30, label: 'Nurture' };
  }
}
