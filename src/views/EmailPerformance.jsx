import { colors, font } from '../styles/tokens';
import Card from '../components/Card';
import Tag from '../components/Tag';
import { getAllTemplateStats, getTotalSends } from '../engine/learning';

export default function EmailPerformance() {
  const stats = getAllTemplateStats();
  const totalSends = getTotalSends();
  const sorted = [...stats].sort((a, b) => b.score - a.score);

  const avgOpenRate = stats.length > 0
    ? stats.reduce((sum, t) => sum + t.openRate, 0) / stats.length
    : 0;
  const avgReplyRate = stats.length > 0
    ? stats.reduce((sum, t) => sum + t.replyRate, 0) / stats.length
    : 0;
  const avgPositiveRate = stats.length > 0
    ? stats.reduce((sum, t) => sum + t.positiveReplyRate, 0) / stats.length
    : 0;

  if (totalSends < 5) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Email Performance</h1>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>◎</div>
          <p style={styles.emptyText}>
            Not enough data yet. Sequence needs 5+ sends to show patterns.
          </p>
          <p style={styles.emptyCount}>{totalSends} / 5 sends</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Email Performance</h1>

      <div style={styles.summaryRow}>
        <SummaryCard label="Total Sent" value={totalSends} />
        <SummaryCard label="Avg Open Rate" value={`${(avgOpenRate * 100).toFixed(1)}%`} />
        <SummaryCard label="Avg Reply Rate" value={`${(avgReplyRate * 100).toFixed(1)}%`} />
        <SummaryCard label="Avg Positive Reply" value={`${(avgPositiveRate * 100).toFixed(1)}%`} />
      </div>

      <Card style={{ marginTop: 20 }}>
        <div style={styles.sectionTitle}>Template Performance</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Subject</th>
                <th style={styles.th}>Angle</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Sends</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Open %</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Reply %</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Positive %</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Score</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((tpl, i) => {
                const isWinner = i < 3 && tpl.score > 0;
                const isDead = tpl.replyRate < 0.05 && tpl.sends >= 20;

                return (
                  <tr key={tpl.templateId} style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.subjectText}>{tpl.subject || '—'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.angleText}>{tpl.angle || '—'}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{tpl.sends}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {(tpl.openRate * 100).toFixed(1)}%
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {(tpl.replyRate * 100).toFixed(1)}%
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {(tpl.positiveReplyRate * 100).toFixed(1)}%
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 600 }}>
                      {tpl.score.toFixed(1)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      {isWinner && <Tag label="Winner" color={colors.amber} />}
                      {isDead && <Tag label="Dead" color={colors.textMuted} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <Card style={styles.summaryCard}>
      <div style={styles.summaryLabel}>{label}</div>
      <div style={styles.summaryValue}>{value}</div>
    </Card>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: 24,
    overflow: 'auto',
    fontFamily: font,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: '0 0 20px',
    fontFamily: font,
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },
  summaryCard: {
    textAlign: 'center',
    padding: 16,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 12,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: font,
    fontSize: 12,
  },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    color: colors.textMuted,
    fontWeight: 600,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: `1px solid ${colors.border}`,
  },
  tr: {
    borderBottom: `1px solid ${colors.border}`,
  },
  td: {
    padding: '10px 10px',
    color: colors.textPrimary,
    verticalAlign: 'middle',
  },
  subjectText: {
    fontSize: 12,
    color: colors.textPrimary,
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'inline-block',
  },
  angleText: {
    fontSize: 11,
    color: colors.textSecondary,
    maxWidth: 150,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'inline-block',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
  },
  emptyIcon: {
    fontSize: 48,
    color: colors.textMuted,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    margin: '0 0 8px',
  },
  emptyCount: {
    fontSize: 12,
    color: colors.textMuted,
    margin: 0,
  },
};
