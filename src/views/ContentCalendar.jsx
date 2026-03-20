import { colors, font } from '../styles/tokens';

export default function ContentCalendar() {
  return (
    <div style={styles.container}>
      <div style={styles.phase}>Phase 4</div>
      <h1 style={styles.title}>Content Calendar</h1>
      <p style={styles.desc}>
        AI-powered social content engine that generates and schedules
        posts across LinkedIn, Instagram, Facebook, and Google Business
        Profile. Optimized for FL real estate litigation audience with
        thought leadership, case study highlights, and market insights.
      </p>
      <div style={styles.features}>
        <Feature text="Multi-platform publishing (LinkedIn, IG, FB, GBP)" />
        <Feature text="AI-generated content from lead research insights" />
        <Feature text="Visual calendar with drag-and-drop scheduling" />
        <Feature text="Performance tracking per platform and post type" />
        <Feature text="Automated A/B testing of headlines and hooks" />
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
