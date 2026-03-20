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

// ═══ Phase 3: Learning Loop ═══

const THEMES_KEY = 'salesedge:contentThemes';
const CHANGELOG_KEY = 'salesedge:changeLog';

export function applyWeeklyReport(report) {
  const changes = [];

  // Handle template changes
  if (report.templateChanges?.length) {
    const perf = loadPerf();
    for (const tc of report.templateChanges) {
      if (tc.action === 'retire' && tc.templateId) {
        if (!perf.retired) perf.retired = [];
        perf.retired.push(tc.templateId);
        changes.push(`Retired template: ${tc.templateId} — ${tc.reason}`);
      } else if (tc.action === 'promote' && tc.templateId) {
        if (!perf.promoted) perf.promoted = [];
        perf.promoted.push(tc.templateId);
        changes.push(`Promoted template: ${tc.templateId} — ${tc.reason}`);
      } else if (tc.action === 'test') {
        changes.push(`A/B test queued: ${tc.reason}`);
      }
    }
    savePerf(perf);
  }

  // Update content themes
  if (report.contentThemes?.length) {
    try {
      localStorage.setItem(THEMES_KEY, JSON.stringify(report.contentThemes));
      changes.push(`Content themes updated: ${report.contentThemes.join(', ')}`);
    } catch (e) {
      console.error('Failed to save content themes:', e);
    }
  }

  // Log all changes
  if (changes.length > 0) {
    try {
      const log = JSON.parse(localStorage.getItem(CHANGELOG_KEY) || '[]');
      log.unshift({
        timestamp: new Date().toISOString(),
        source: 'weekly-report',
        changes,
      });
      localStorage.setItem(CHANGELOG_KEY, JSON.stringify(log.slice(0, 50)));
    } catch (e) {
      console.error('Failed to save changelog:', e);
    }
  }

  return changes;
}

export function getContentThemes() {
  try {
    const stored = localStorage.getItem(THEMES_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to load content themes:', e);
  }
  return [
    'FL CONDO Act compliance burden',
    'HOA foreclosure lis pendens deadline risk',
    'Eviction notice automation',
  ];
}

export function getSystemInsights() {
  const perf = loadPerf();
  const insights = [];

  // Avg touches before first reply
  const replyLeadIds = new Set(perf.replies.map(r => r.leadId));
  if (replyLeadIds.size > 0) {
    let totalTouches = 0;
    for (const leadId of replyLeadIds) {
      const sendsBefore = perf.sends.filter(s => s.leadId === leadId).length;
      totalTouches += sendsBefore;
    }
    const avgTouches = (totalTouches / replyLeadIds.size).toFixed(1);
    insights.push(`Avg ${avgTouches} email touches before first reply across ${replyLeadIds.size} leads.`);
  }

  // Best performing day
  const dayPerf = {};
  for (const send of perf.sends) {
    const day = send.day || 1;
    if (!dayPerf[day]) dayPerf[day] = { sends: 0, replies: 0 };
    dayPerf[day].sends++;
  }
  for (const reply of perf.replies) {
    const send = perf.sends.find(s => s.leadId === reply.leadId);
    if (send) {
      const day = send.day || 1;
      if (dayPerf[day]) dayPerf[day].replies++;
    }
  }
  const bestDay = Object.entries(dayPerf)
    .filter(([, v]) => v.sends >= 3)
    .sort((a, b) => (b[1].replies / b[1].sends) - (a[1].replies / a[1].sends))[0];
  if (bestDay) {
    const rate = ((bestDay[1].replies / bestDay[1].sends) * 100).toFixed(0);
    insights.push(`Day ${bestDay[0]} emails have ${rate}% reply rate (${bestDay[1].sends} sends).`);
  }

  return insights;
}

export function autoImproveSequence() {
  const perf = loadPerf();
  const recommendations = [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSends = perf.sends.filter(s => new Date(s.sentAt) > thirtyDaysAgo);
  const recentReplies = perf.replies.filter(r => new Date(r.repliedAt) > thirtyDaysAgo);

  // Check if Day 3 outperforms Day 1
  const day1Sends = recentSends.filter(s => s.day === 1);
  const day3Sends = recentSends.filter(s => s.day === 3 || s.day === 5);
  const day1Replies = recentReplies.filter(r => {
    const send = day1Sends.find(s => s.leadId === r.leadId);
    return !!send;
  });
  const day3Replies = recentReplies.filter(r => {
    const send = day3Sends.find(s => s.leadId === r.leadId);
    return !!send;
  });

  if (day1Sends.length >= 5 && day3Sends.length >= 5) {
    const day1Rate = day1Replies.length / day1Sends.length;
    const day3Rate = day3Replies.length / day3Sends.length;
    if (day3Rate > day1Rate) {
      recommendations.push({
        type: 'swap_sequence_order',
        current: `Day 1 reply rate: ${(day1Rate * 100).toFixed(0)}%`,
        suggested: `Follow-up emails (${(day3Rate * 100).toFixed(0)}%) outperform cold intros. Consider stronger Day 1 hooks.`,
        dataPoints: day1Sends.length + day3Sends.length,
        confidence: day3Rate - day1Rate > 0.1 ? 'high' : 'medium',
      });
    }
  }

  // Check Tier 3 positive reply rate
  const tier3Replies = recentReplies.filter(r => r.sentiment === 'positive');
  const tier3Sends = recentSends.length;
  if (tier3Sends >= 10 && tier3Replies.length / tier3Sends > 0.15) {
    recommendations.push({
      type: 'tier_upgrade',
      current: `${tier3Replies.length} positive replies from ${tier3Sends} sends (${((tier3Replies.length / tier3Sends) * 100).toFixed(0)}%)`,
      suggested: 'High positive reply rate suggests expanding aggressive sequences to more leads.',
      dataPoints: tier3Sends,
      confidence: 'medium',
    });
  }

  return { recommendations };
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
