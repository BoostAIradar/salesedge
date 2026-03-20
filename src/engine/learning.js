// Phase 2+: Performance learning loop
// Tracks email open rates, reply rates, demo conversion by tier/angle
// Feeds weekly Claude analysis to optimize sequences

export function calculateMetrics(leads) {
  const total = leads.length;
  const byTier = { 1: [], 2: [], 3: [] };
  const byStage = {};

  leads.forEach(lead => {
    const tier = lead.tier || 3;
    if (byTier[tier]) byTier[tier].push(lead);
    const stage = lead.stage || 'new';
    if (!byStage[stage]) byStage[stage] = [];
    byStage[stage].push(lead);
  });

  return {
    total,
    tierBreakdown: {
      1: byTier[1].length,
      2: byTier[2].length,
      3: byTier[3].length,
    },
    stageBreakdown: Object.fromEntries(
      Object.entries(byStage).map(([k, v]) => [k, v.length])
    ),
    demoRate: total > 0
      ? ((byStage['demo-booked']?.length || 0) + (byStage['closed']?.length || 0)) / total
      : 0,
  };
}
