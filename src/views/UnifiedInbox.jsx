import { colors, font } from '../styles/tokens';

export default function UnifiedInbox() {
  return (
    <div style={styles.container}>
      <div style={styles.phase}>Phase 2</div>
      <h1 style={styles.title}>Unified Inbox</h1>
      <p style={styles.desc}>
        Centralized inbox that aggregates all email replies, LinkedIn
        messages, and form submissions. AI-categorizes responses as
        interested, meeting request, objection, or unsubscribe. Enables
        one-click reply with AI-suggested responses.
      </p>
      <div style={styles.features}>
        <Feature text="Multi-channel message aggregation" />
        <Feature text="AI-powered response categorization" />
        <Feature text="One-click AI reply suggestions" />
        <Feature text="Thread history with full context" />
        <Feature text="Auto-stage progression on positive replies" />
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
