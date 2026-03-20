// ═══════════════════════════════════════
// Sequence engine — runs INDEPENDENTLY of pipeline
// Pipeline = relationship status (stage)
// Sequence = touch cadence (touchCount, nextTouch)
//
// Only 3 sync points:
//   1. Day 1 email sent → stage New → Contacted
//   2. Reply received   → stage → Replied (+ sequence pauses)
//   3. Sequence done, no reply → stage → Dead
// ═══════════════════════════════════════

export const SEQUENCE_TIERS = {
  1: {
    label: 'Aggressive',
    totalTouches: 7,
    steps: [
      { touchNumber: 1, day: 1,  channel: 'email',    action: 'Cold intro email — specific pain point' },
      { touchNumber: 2, day: 3,  channel: 'linkedin',  action: 'LinkedIn connection request — relevance hook' },
      { touchNumber: 3, day: 5,  channel: 'email',    action: 'Follow-up email — different angle' },
      { touchNumber: 4, day: 7,  channel: 'call',     action: 'Phone call — references email' },
      { touchNumber: 5, day: 10, channel: 'email',    action: 'Value add email — FL law insight' },
      { touchNumber: 6, day: 12, channel: 'linkedin',  action: 'LinkedIn DM — soft ask' },
      { touchNumber: 7, day: 14, channel: 'email',    action: 'Breakup email' },
    ],
  },
  2: {
    label: 'Standard',
    totalTouches: 5,
    steps: [
      { touchNumber: 1, day: 1,  channel: 'email', action: 'Cold intro email' },
      { touchNumber: 2, day: 5,  channel: 'email', action: 'Follow-up email' },
      { touchNumber: 3, day: 7,  channel: 'call',  action: 'Phone call — talk track' },
      { touchNumber: 4, day: 14, channel: 'email', action: 'Value add email' },
      { touchNumber: 5, day: 21, channel: 'email', action: 'Breakup email' },
    ],
  },
  3: {
    label: 'Nurture',
    totalTouches: 3,
    steps: [
      { touchNumber: 1, day: 1,  channel: 'email', action: 'Intro email' },
      { touchNumber: 2, day: 14, channel: 'email', action: 'Check-in email' },
      { touchNumber: 3, day: 30, channel: 'email', action: 'Final touch email' },
    ],
  },
};

export function getSequenceConfig(tier) {
  return SEQUENCE_TIERS[tier] || SEQUENCE_TIERS[3];
}

// Returns full sequence status for a lead — independent of pipeline stage
export function getSequenceStatus(lead) {
  const tier = lead.sequenceTier || lead.tier || 3;
  const config = SEQUENCE_TIERS[tier];
  if (!config) return null;

  const touchHistory = lead.touchHistory || lead.sequenceHistory || [];
  const touchCount = touchHistory.length;
  const totalTouches = config.totalTouches;

  // Determine sequence status
  let sequenceStatus = lead.sequenceStatus || 'active';

  // Pause if replied
  if (lead.stage === 'replied' || lead.stage === 'demo-booked') {
    sequenceStatus = 'paused';
  }

  // Complete if all touches done
  if (touchCount >= totalTouches) {
    sequenceStatus = 'complete';
  }

  // Find next touch
  let nextTouch = null;
  if (sequenceStatus === 'active') {
    const sequenceStart = lead.sequenceStartedAt || lead.createdAt;
    if (sequenceStart) {
      const startDate = new Date(sequenceStart);
      for (const step of config.steps) {
        const completed = touchHistory.some(
          h => h.touchNumber === step.touchNumber || (h.day === step.day && h.channel === step.channel)
        );
        if (!completed) {
          const dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + step.day - 1);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dueDateNorm = new Date(dueDate);
          dueDateNorm.setHours(0, 0, 0, 0);

          nextTouch = {
            ...step,
            dueDate: dueDate.toISOString(),
            isOverdue: new Date() > dueDate,
            isDueToday: dueDateNorm.getTime() === today.getTime(),
          };
          break;
        }
      }
    }
  }

  return {
    tier,
    touchCount,
    totalTouches,
    completedTouches: touchHistory,
    nextTouch,
    sequenceStatus,
    pausedReason: sequenceStatus === 'paused' ? 'replied' : null,
  };
}

// Legacy compat — wraps getSequenceStatus
export function getNextAction(lead) {
  const status = getSequenceStatus(lead);
  if (!status || !status.nextTouch) return null;
  const nt = status.nextTouch;
  return {
    ...nt,
    touchNumber: nt.touchNumber,
    totalTouches: status.totalTouches,
    touchCount: status.touchCount,
  };
}

export function getTodayActions(leads) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const actions = [];

  for (const lead of leads) {
    // Skip closed, dead, replied (sequence paused), demo-booked
    if (lead.stage === 'closed' || lead.stage === 'dead') continue;
    if (lead.stage === 'replied' || lead.stage === 'demo-booked') continue;

    const status = getSequenceStatus(lead);
    if (!status || status.sequenceStatus !== 'active' || !status.nextTouch) continue;

    const dueDate = new Date(status.nextTouch.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate <= today) {
      actions.push({
        lead,
        ...status.nextTouch,
        touchCount: status.touchCount,
        totalTouches: status.totalTouches,
        priority: lead.tier === 1 ? 3 : lead.tier === 2 ? 2 : 1,
      });
    }
  }

  // Sort: overdue first, then by tier, then by channel priority
  const channelPriority = { call: 4, linkedin: 3, email: 2 };
  return actions.sort((a, b) => {
    // Overdue first
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    // Then by tier
    if (b.priority !== a.priority) return b.priority - a.priority;
    // Then by channel
    return (channelPriority[b.channel] || 0) - (channelPriority[a.channel] || 0);
  });
}

// Marks a touch complete. Returns updates to apply to the lead.
// ONLY changes stage for the 3 sync points.
export function markActionComplete(lead, action) {
  const touchHistory = lead.touchHistory || lead.sequenceHistory || [];
  const newTouch = {
    touchNumber: action.touchNumber || touchHistory.length + 1,
    day: action.day,
    channel: action.channel,
    action: action.action,
    sentAt: new Date().toISOString(),
    openedAt: null,
    repliedAt: null,
  };

  const updatedHistory = [...touchHistory, newTouch];
  const tier = lead.sequenceTier || lead.tier || 3;
  const config = SEQUENCE_TIERS[tier];
  const totalTouches = config ? config.totalTouches : 3;

  const updates = {
    touchHistory: updatedHistory,
    sequenceHistory: updatedHistory, // backward compat
    touchCount: updatedHistory.length,
  };

  // SYNC POINT 1: Day 1 email → New to Contacted
  if (action.day === 1 && action.channel === 'email' && lead.stage === 'new') {
    updates._autoStageChange = 'contacted';
  }

  // SYNC POINT 3: Last touch + not replied → Dead
  if (updatedHistory.length >= totalTouches && lead.stage !== 'replied' && lead.stage !== 'demo-booked') {
    updates.sequenceStatus = 'complete';
    updates.sequenceCompletedAt = new Date().toISOString();
    updates._autoStageChange = 'dead';
  }

  return updates;
}

export function getSequenceHealth(leads) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  let active = 0;
  let stalled = 0;
  let completedThisWeek = 0;
  const dropOffs = {};

  for (const lead of leads) {
    const status = getSequenceStatus(lead);
    if (!status) continue;

    if (status.sequenceStatus === 'active') {
      active++;
      if (status.nextTouch?.isOverdue) {
        const overdueDays = Math.floor((now - new Date(status.nextTouch.dueDate)) / (1000 * 60 * 60 * 24));
        if (overdueDays >= 7) stalled++;
      }
    }

    if (status.sequenceStatus === 'complete') {
      const history = status.completedTouches;
      if (history.length > 0) {
        const lastTouch = history[history.length - 1];
        const lastDate = new Date(lastTouch.sentAt || lastTouch.completedAt);
        if (lastDate > weekAgo) completedThisWeek++;
        // Track drop-off
        dropOffs[lastTouch.day] = (dropOffs[lastTouch.day] || 0) + 1;
      }
    }
  }

  const topDropOff = Object.entries(dropOffs).sort((a, b) => b[1] - a[1]);

  return {
    activeSequences: active,
    stalledSequences: stalled,
    completedThisWeek,
    avgCompletionRate: 0,
    topDropOffDay: topDropOff.length > 0 ? parseInt(topDropOff[0][0]) : 0,
    recommendations: [],
  };
}

export function autoAdjustTiming(leads) {
  const recommendations = [];
  const seqKey = 'salesedge:seqRecommendations';

  const dayReplies = {};
  for (const lead of leads) {
    const history = lead.touchHistory || lead.sequenceHistory || [];
    for (const h of history) {
      if (!dayReplies[h.day]) dayReplies[h.day] = { total: 0, replied: 0 };
      dayReplies[h.day].total++;
      if (lead.stage === 'replied' || lead.stage === 'demo-booked') {
        dayReplies[h.day].replied++;
      }
    }
  }

  const day1 = dayReplies[1] || { total: 0, replied: 0 };
  const day5 = dayReplies[5] || { total: 0, replied: 0 };
  if (day1.total >= 5 && day5.total >= 5) {
    const d1Rate = day1.replied / day1.total;
    const d5Rate = day5.replied / day5.total;
    if (d5Rate > d1Rate * 1.2) {
      recommendations.push(`Day 5 reply rate (${(d5Rate * 100).toFixed(0)}%) exceeds Day 1 (${(d1Rate * 100).toFixed(0)}%). Consider stronger Day 1 hooks.`);
    }
  }

  try {
    localStorage.setItem(seqKey, JSON.stringify({ recommendations, updatedAt: new Date().toISOString() }));
  } catch {}

  return recommendations;
}

export async function fireEmailSequence(lead) {
  if (lead.tier !== 1 && lead.tier !== 2) return null;

  try {
    const res = await fetch('/api/email-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead, sequenceDay: 1 }),
    });

    if (!res.ok) {
      console.error('Email write failed for sequence:', res.status);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('Sequence email fire failed:', err);
    return null;
  }
}
