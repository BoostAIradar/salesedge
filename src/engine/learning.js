const PERF_KEY = 'salesedge:performance';

function loadPerf() {
  try {
    const stored = localStorage.getItem(PERF_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load performance data:', e);
  }
  return { sends: [], opens: [], replies: [] };
}

function savePerf(data) {
  try {
    localStorage.setItem(PERF_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save performance data:', e);
  }
}

export function trackEmailSend({ leadId, templateId, subject, angle, day }) {
  const perf = loadPerf();
  perf.sends.push({
    id: `send-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    leadId,
    templateId: templateId || `tpl-${subject?.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`,
    subject,
    angle,
    day,
    sentAt: new Date().toISOString(),
  });
  savePerf(perf);
}

export function trackEmailOpen({ messageId, leadId, templateId }) {
  const perf = loadPerf();
  perf.opens.push({
    messageId,
    leadId,
    templateId,
    openedAt: new Date().toISOString(),
  });
  savePerf(perf);
}

export function trackReply({ messageId, leadId, sentiment }) {
  const perf = loadPerf();
  perf.replies.push({
    messageId,
    leadId,
    sentiment,
    repliedAt: new Date().toISOString(),
  });
  savePerf(perf);
}

export function getTemplateStats(templateId) {
  const perf = loadPerf();
  const sends = perf.sends.filter(s => s.templateId === templateId);
  const sendCount = sends.length;
  if (sendCount === 0) return { openRate: 0, replyRate: 0, positiveReplyRate: 0, sends: 0 };

  const leadIds = sends.map(s => s.leadId);
  const opens = perf.opens.filter(o => o.templateId === templateId || leadIds.includes(o.leadId));
  const replies = perf.replies.filter(r => leadIds.includes(r.leadId));
  const positiveReplies = replies.filter(r => r.sentiment === 'positive');

  return {
    openRate: opens.length / sendCount,
    replyRate: replies.length / sendCount,
    positiveReplyRate: positiveReplies.length / sendCount,
    sends: sendCount,
  };
}

export function getAllTemplateStats() {
  const perf = loadPerf();
  const templateMap = {};

  for (const send of perf.sends) {
    const tplId = send.templateId;
    if (!templateMap[tplId]) {
      templateMap[tplId] = {
        templateId: tplId,
        subject: send.subject,
        angle: send.angle,
        sends: 0,
        opens: 0,
        replies: 0,
        positiveReplies: 0,
        leadIds: [],
      };
    }
    templateMap[tplId].sends++;
    templateMap[tplId].leadIds.push(send.leadId);
  }

  for (const open of perf.opens) {
    for (const tpl of Object.values(templateMap)) {
      if (tpl.templateId === open.templateId || tpl.leadIds.includes(open.leadId)) {
        tpl.opens++;
        break;
      }
    }
  }

  for (const reply of perf.replies) {
    for (const tpl of Object.values(templateMap)) {
      if (tpl.leadIds.includes(reply.leadId)) {
        tpl.replies++;
        if (reply.sentiment === 'positive') tpl.positiveReplies++;
        break;
      }
    }
  }

  return Object.values(templateMap).map(tpl => ({
    templateId: tpl.templateId,
    subject: tpl.subject,
    angle: tpl.angle,
    sends: tpl.sends,
    openRate: tpl.sends > 0 ? tpl.opens / tpl.sends : 0,
    replyRate: tpl.sends > 0 ? tpl.replies / tpl.sends : 0,
    positiveReplyRate: tpl.sends > 0 ? tpl.positiveReplies / tpl.sends : 0,
    score: tpl.sends > 0
      ? ((tpl.positiveReplies / tpl.sends) * 0.6 + (tpl.replies / tpl.sends) * 0.3 + (tpl.opens / tpl.sends) * 0.1) * 100
      : 0,
  }));
}

export function getWinningPatterns() {
  const stats = getAllTemplateStats().filter(t => t.sends >= 10);
  stats.sort((a, b) => b.score - a.score);

  return {
    topTemplates: stats.slice(0, 5),
    topSubjects: stats.slice(0, 5).map(t => ({ subject: t.subject, score: t.score })),
    topAngles: stats.slice(0, 5).map(t => ({ angle: t.angle, score: t.score })),
  };
}

export function getTotalSends() {
  const perf = loadPerf();
  return perf.sends.length;
}

export function getRecentReplies() {
  const perf = loadPerf();
  return perf.replies
    .sort((a, b) => new Date(b.repliedAt) - new Date(a.repliedAt))
    .slice(0, 10);
}

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
