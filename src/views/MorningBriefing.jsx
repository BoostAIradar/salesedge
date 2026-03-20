import { colors, font } from '../styles/tokens';

export default function MorningBriefing() {
  return (
    <div style={styles.container}>
      <div style={styles.phase}>Phase 3</div>
      <h1 style={styles.title}>Morning Briefing</h1>
      <p style={styles.desc}>
        Daily AI-generated briefing with overnight lead activity,
        priority actions for today, new ICP-matched leads from
        automated research, and sequence performance from the
        previous day. Includes suggested reply drafts for any
        overnight responses.
      </p>
      <div style={styles.features}>
        <Feature text="Overnight lead activity summary" />
        <Feature text="Priority action queue for today" />
        <Feature text="New auto-discovered ICP leads" />
        <Feature text="Yesterday's sequence performance" />
        <Feature text="Suggested reply drafts" />
      </div>
    </div>
  );
}

function Feature({ text }) {
  return (
    <div style={styles.feature}>
      <span style={{ color: colors.textMuted }}>◇</span>
      <span>{text}</span>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: font,
    padding: 40,
  },
  phase: {
    fontSize: 11,
    color: colors.amber,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    fontWeight: 600,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: '0 0 12px',
    fontFamily: font,
  },
  desc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 1.7,
    maxWidth: 500,
    textAlign: 'center',
    margin: '0 0 24px',
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 12,
    color: colors.textSecondary,
  },
};
