import { colors, font } from '../styles/tokens';

export default function WeeklyReport() {
  return (
    <div style={styles.container}>
      <div style={styles.phase}>Phase 3</div>
      <h1 style={styles.title}>Weekly Report</h1>
      <p style={styles.desc}>
        Claude-powered weekly analysis that reviews all pipeline
        activity, email sequence performance, content engagement,
        and demo conversion rates. Generates actionable recommendations
        for the following week including ICP refinements, sequence
        optimizations, and content pivots.
      </p>
      <div style={styles.features}>
        <Feature text="Pipeline velocity and conversion analysis" />
        <Feature text="Email sequence A/B test results" />
        <Feature text="ICP scoring model refinement suggestions" />
        <Feature text="Content performance by platform and topic" />
        <Feature text="Week-ahead priority action plan" />
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
