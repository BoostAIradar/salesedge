export const SEQUENCE_TIERS = {
  1: {
    label: 'Aggressive',
    steps: [
      { day: 1, channel: 'email', action: 'Cold intro email' },
      { day: 3, channel: 'linkedin', action: 'LinkedIn connection + message' },
      { day: 5, channel: 'email', action: 'Follow-up email' },
      { day: 7, channel: 'call', action: 'Phone call' },
      { day: 10, channel: 'email', action: 'Breakup email' },
      { day: 14, channel: 'nurture', action: 'Move to nurture or dead' },
    ],
  },
  2: {
    label: 'Standard',
    steps: [
      { day: 1, channel: 'email', action: 'Cold intro email' },
      { day: 5, channel: 'email', action: 'Follow-up email' },
      { day: 7, channel: 'call', action: 'Phone call' },
      { day: 14, channel: 'email', action: 'Final follow-up email' },
      { day: 21, channel: 'nurture', action: 'Move to nurture or dead' },
    ],
  },
  3: {
    label: 'Nurture',
    steps: [
      { day: 1, channel: 'email', action: 'Intro email' },
      { day: 14, channel: 'email', action: 'Follow-up email' },
      { day: 30, channel: 'nurture', action: 'Move to nurture or dead' },
    ],
  },
};

export function getSequenceConfig(tier) {
  return SEQUENCE_TIERS[tier] || SEQUENCE_TIERS[3];
}

export function getNextAction(lead) {
  const tier = lead.tier || 3;
  const config = SEQUENCE_TIERS[tier];
  if (!config) return null;

  const history = lead.sequenceHistory || [];
  const sequenceStart = lead.sequenceStartedAt || lead.createdAt;
  if (!sequenceStart) return null;

  const startDate = new Date(sequenceStart);

  for (const step of config.steps) {
    const completed = history.some(
      h => h.day === step.day && h.channel === step.channel
    );
    if (!completed) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + step.day - 1);
      return {
        ...step,
        dueDate: dueDate.toISOString(),
        isOverdue: new Date() > dueDate,
      };
    }
  }

  return null;
}

export function getTodayActions(leads) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const actions = [];

  for (const lead of leads) {
    if (lead.stage === 'closed' || lead.stage === 'dead') continue;

    const next = getNextAction(lead);
    if (!next) continue;

    const dueDate = new Date(next.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate <= today) {
      actions.push({
        lead,
        ...next,
        priority: lead.tier === 1 ? 3 : lead.tier === 2 ? 2 : 1,
      });
    }
  }

  return actions.sort((a, b) => b.priority - a.priority);
}

export function markActionComplete(lead, action) {
  const history = lead.sequenceHistory || [];
  return {
    sequenceHistory: [
      ...history,
      {
        day: action.day,
        channel: action.channel,
        action: action.action,
        completedAt: new Date().toISOString(),
      },
    ],
  };
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
    if (lead.stage === 'closed' || lead.stage === 'dead') continue;

    const history = lead.sequenceHistory || [];
    const next = getNextAction(lead);

    if (next) {
      active++;
      if (next.isOverdue) {
        const overdueDays = Math.floor((now - new Date(next.dueDate)) / (1000 * 60 * 60 * 24));
        if (overdueDays >= 7) stalled++;
      }
    } else if (history.length > 0) {
      const lastAction = history[history.length - 1];
      if (new Date(lastAction.completedAt) > weekAgo) {
        completedThisWeek++;
      }
    }

    // Track drop-off day
    if (history.length > 0 && !next) {
      const lastDay = history[history.length - 1].day;
      dropOffs[lastDay] = (dropOffs[lastDay] || 0) + 1;
    }
  }

  const topDropOff = Object.entries(dropOffs).sort((a, b) => b[1] - a[1]);
  const totalWithHistory = leads.filter(l => (l.sequenceHistory || []).length > 0).length;

  return {
    activeSequences: active,
    stalledSequences: stalled,
    completedThisWeek,
    avgCompletionRate: totalWithHistory > 0
      ? completedThisWeek / totalWithHistory
      : 0,
    topDropOffDay: topDropOff.length > 0 ? parseInt(topDropOff[0][0]) : 0,
    recommendations: [],
  };
}

export function autoAdjustTiming(leads) {
  const recommendations = [];
  const seqKey = 'salesedge:seqRecommendations';

  // Analyze all completed sequences for timing patterns
  const dayReplies = {};
  for (const lead of leads) {
    const history = lead.sequenceHistory || [];
    for (const h of history) {
      if (!dayReplies[h.day]) dayReplies[h.day] = { total: 0, replied: 0 };
      dayReplies[h.day].total++;
      if (lead.stage === 'replied' || lead.stage === 'demo-booked') {
        dayReplies[h.day].replied++;
      }
    }
  }

  // Check if follow-up days outperform early days
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
      body: JSON.stringify({
        lead,
        sequenceDay: 1,
      }),
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
