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
