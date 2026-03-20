import { useState } from 'react';
import { colors, font } from '../styles/tokens';
import Card from '../components/Card';
import Tag from '../components/Tag';
import { getAllTemplateStats, getTotalSends, applyWeeklyReport, calculateMetrics } from '../engine/learning';

const IMPACT_COLORS = { high: colors.red, medium: colors.amber, low: colors.textSecondary };

export default function WeeklyReport({ leads, reports, addReport, markReportRead }) {
  const [generating, setGenerating] = useState(false);

  const latest = reports && reports.length > 0 ? reports[0] : null;

  async function handleGenerate() {
    setGenerating(true);

    const emailStats = getAllTemplateStats();
    const totalSends = getTotalSends();
    const pipelineMetrics = leads ? calculateMetrics(leads) : {};

    const emailMetrics = {
      totalSends,
      templates: emailStats.slice(0, 10),
      avgOpenRate: emailStats.length > 0
        ? emailStats.reduce((s, t) => s + t.openRate, 0) / emailStats.length
        : 0,
      avgReplyRate: emailStats.length > 0
        ? emailStats.reduce((s, t) => s + t.replyRate, 0) / emailStats.length
        : 0,
    };

    // Social metrics from localStorage posts
    let socialMetrics = { totalPosts: 0, platforms: {} };
    try {
      const posts = JSON.parse(localStorage.getItem('salesedge:posts') || '[]');
      const published = posts.filter(p => p.status === 'published');
      socialMetrics.totalPosts = published.length;
      published.forEach(p => {
        if (!socialMetrics.platforms[p.platform]) {
          socialMetrics.platforms[p.platform] = { posts: 0, totalEngagement: 0, totalImpressions: 0 };
        }
        socialMetrics.platforms[p.platform].posts++;
        socialMetrics.platforms[p.platform].totalEngagement += p.metrics?.engagements || 0;
        socialMetrics.platforms[p.platform].totalImpressions += p.metrics?.impressions || 0;
      });
    } catch {}

    const sequenceMetrics = {
      leadsWithSequence: leads ? leads.filter(l => (l.sequenceHistory || []).length > 0).length : 0,
      completedSequences: leads ? leads.filter(l => {
        const hist = l.sequenceHistory || [];
        return hist.length >= 3;
      }).length : 0,
    };

    try {
      const res = await fetch('/api/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailMetrics, socialMetrics, pipelineMetrics, sequenceMetrics }),
      });

      if (res.ok) {
        const report = await res.json();
        if (addReport) addReport(report);

        // Apply learning loop
        applyWeeklyReport(report);
      }
    } catch (err) {
      console.error('Weekly report generation failed:', err);
    }
    setGenerating(false);
  }

  if (!latest) {
    return (
      <div style={styles.container}>
        <div style={styles.topbar}>
          <h1 style={styles.title}>Weekly Report</h1>
          <button style={styles.generateBtn} onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
        <div style={styles.empty}>
          <div style={{ fontSize: 48, color: colors.textMuted }}>◈</div>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: '16px 0 0' }}>
            No reports generated yet. Click "Generate Report" to analyze your performance.
          </p>
        </div>
      </div>
    );
  }

  // Mark as read when viewed
  if (!latest.read && markReportRead) {
    markReportRead(latest.id);
  }

  const ns = latest.northStarProgress || {};

  return (
    <div style={styles.container}>
      <div style={styles.topbar}>
        <div>
          <h1 style={styles.title}>Weekly Report</h1>
          <span style={styles.weekDate}>
            Week of {latest.weekOf || latest.generatedAt?.split('T')[0] || '—'}
          </span>
        </div>
        <button style={styles.generateBtn} onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : 'Regenerate'}
        </button>
      </div>

      <div style={styles.content}>
        {/* North Star */}
        <Card tint="amber" style={styles.northStar}>
          <div style={styles.nsRow}>
            <div>
              <div style={styles.nsLabel}>Demos Booked This Week</div>
              <div style={styles.nsValue}>{ns.demosBooked || 0}</div>
            </div>
            <div style={styles.nsDivider} />
            <div>
              <div style={styles.nsLabel}>Target</div>
              <div style={styles.nsTarget}>{ns.target || 5}</div>
            </div>
            <div style={styles.nsDivider} />
            <div>
              <div style={styles.nsLabel}>Trend</div>
              <div style={{
                fontSize: 20,
                fontWeight: 700,
                color: ns.trend === 'up' ? colors.green : ns.trend === 'down' ? colors.red : colors.textSecondary,
              }}>
                {ns.trend === 'up' ? '↑' : ns.trend === 'down' ? '↓' : '→'} {ns.trend || 'flat'}
              </div>
            </div>
          </div>
        </Card>

        {/* Summary */}
        {latest.weekSummary && (
          <Card style={{ marginTop: 16 }}>
            <div style={styles.sectionTitle}>Executive Summary</div>
            <p style={styles.summaryText}>{latest.weekSummary}</p>
          </Card>
        )}

        {/* Four insight sections */}
        <div style={styles.insightGrid}>
          {/* Email */}
          <Card>
            <div style={styles.sectionTitle}>Email Performance</div>
            {(latest.emailInsights || []).map((ins, i) => (
              <InsightRow key={i} insight={ins} />
            ))}
            {(latest.templateChanges || []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Template Actions</div>
                {latest.templateChanges.map((tc, i) => (
                  <div key={i} style={styles.templateAction}>
                    <Tag
                      label={tc.action}
                      color={tc.action === 'retire' ? colors.red : tc.action === 'promote' ? colors.green : colors.blue}
                    />
                    <span style={{ fontSize: 11, color: colors.textSecondary, marginLeft: 6 }}>{tc.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Social */}
          <Card>
            <div style={styles.sectionTitle}>Social Performance</div>
            {(latest.socialInsights || []).map((ins, i) => (
              <InsightRow key={i} insight={ins} />
            ))}
            {latest.contentThemes?.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Next Week Themes</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {latest.contentThemes.map((t, i) => (
                    <Tag key={i} label={t} color={colors.purple} />
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Pipeline */}
          <Card>
            <div style={styles.sectionTitle}>Pipeline Health</div>
            {(latest.pipelineInsights || []).map((ins, i) => (
              <InsightRow key={i} insight={ins} />
            ))}
            {latest.prioritySegment && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Priority Segment</div>
                <p style={{ fontSize: 12, color: colors.amber, margin: 0, lineHeight: 1.4 }}>
                  {latest.prioritySegment}
                </p>
              </div>
            )}
          </Card>

          {/* Strategy */}
          <Card>
            <div style={styles.sectionTitle}>Strategy Decisions</div>
            {(latest.strategyDecisions || []).map((dec, i) => (
              <div key={i} style={styles.decisionCard}>
                <div style={styles.decisionTitle}>{dec.decision}</div>
                <div style={styles.decisionRationale}>{dec.rationale}</div>
                <div style={styles.decisionMeta}>
                  <Tag label={dec.affects || '—'} color={colors.blue} />
                  <span style={{ fontSize: 10, color: colors.textMuted }}>{dec.implementation}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function InsightRow({ insight }) {
  return (
    <div style={styles.insightRow}>
      <Tag label={insight.impact} color={IMPACT_COLORS[insight.impact] || colors.textMuted} />
      <div style={styles.insightContent}>
        <div style={styles.insightText}>{insight.insight}</div>
        <div style={styles.insightAction}>→ {insight.action}</div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: font,
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg1,
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: 0,
    fontFamily: font,
  },
  weekDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  generateBtn: {
    background: colors.amber,
    color: colors.bg0,
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    padding: 24,
    overflow: 'auto',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  northStar: {
    padding: 20,
  },
  nsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  nsLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 4,
    textAlign: 'center',
  },
  nsValue: {
    fontSize: 40,
    fontWeight: 700,
    color: colors.amber,
    textAlign: 'center',
  },
  nsTarget: {
    fontSize: 24,
    fontWeight: 600,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  nsDivider: {
    width: 1,
    height: 50,
    background: colors.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 1.6,
    margin: 0,
  },
  insightGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginTop: 16,
  },
  insightRow: {
    display: 'flex',
    gap: 8,
    padding: '8px 0',
    borderBottom: `1px solid ${colors.border}`,
    alignItems: 'flex-start',
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 1.4,
  },
  insightAction: {
    fontSize: 11,
    color: colors.amber,
    marginTop: 2,
  },
  templateAction: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 0',
  },
  decisionCard: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  decisionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  decisionRationale: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 1.4,
    marginBottom: 6,
  },
  decisionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
};
