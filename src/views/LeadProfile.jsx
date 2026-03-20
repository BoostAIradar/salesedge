import { useParams, useNavigate } from 'react-router-dom';
import { colors, font, stageColors, stageLabels, tierColors } from '../styles/tokens';
import ScoreRing from '../components/ScoreRing';
import Card from '../components/Card';
import Tag from '../components/Tag';
import { scoreICP } from '../engine/icp';

const STAGES_ORDER = ['new', 'contacted', 'replied', 'demo-booked', 'closed', 'dead'];

export default function LeadProfile({ leads, updateStage }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const lead = leads.find(l => l.id === id);

  if (!lead) {
    return (
      <div style={styles.container}>
        <div style={styles.notFound}>
          <span style={{ color: colors.textMuted, fontSize: 14 }}>Lead not found</span>
          <button style={styles.backBtn} onClick={() => navigate('/')}>← Back to Pipeline</button>
        </div>
      </div>
    );
  }

  const currentIdx = STAGES_ORDER.indexOf(lead.stage);
  const canGoBack = currentIdx > 0;
  const canGoForward = currentIdx < STAGES_ORDER.length - 1;

  const breakdown = lead.breakdown || scoreICP(lead).breakdown;

  function moveStage(direction) {
    const newIdx = currentIdx + direction;
    if (newIdx >= 0 && newIdx < STAGES_ORDER.length) {
      updateStage(lead.id, STAGES_ORDER[newIdx]);
    }
  }

  const researchStatusColor = {
    researching: colors.amber,
    complete: colors.green,
    failed: colors.red,
  };
  const researchStatusLabel = {
    researching: 'AI Research',
    complete: 'Analyzing',
    failed: 'Failed',
  };

  return (
    <div style={styles.container}>
      <div style={styles.topbar}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>← Pipeline</button>
        <div style={styles.topCenter}>
          <span style={{ ...styles.stageDot, background: stageColors[lead.stage] }} />
          <span style={styles.stageLabel}>{stageLabels[lead.stage]}</span>
        </div>
        <div style={styles.topActions}>
          <button
            style={{ ...styles.stageBtn, opacity: canGoBack ? 1 : 0.3 }}
            disabled={!canGoBack}
            onClick={() => moveStage(-1)}
          >
            ← Back
          </button>
          <button
            style={{ ...styles.stageBtn, background: colors.amber, color: colors.bg0, opacity: canGoForward ? 1 : 0.3 }}
            disabled={!canGoForward}
            onClick={() => moveStage(1)}
          >
            Forward →
          </button>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.leftCol}>
          <div style={styles.scoreSection}>
            <ScoreRing score={lead.score} tier={lead.tier} size={140} />
            <div style={styles.tierLabel}>
              <Tag
                label={`Tier ${lead.tier}`}
                color={tierColors[lead.tier]}
              />
            </div>
          </div>

          <Card style={{ marginTop: 16 }}>
            <div style={styles.sectionTitle}>Score Breakdown</div>
            <BreakdownBar label="Practice Area" pts={breakdown.practiceArea} max={35} />
            <BreakdownBar label="Firm Size" pts={breakdown.firmSize} max={30} />
            <BreakdownBar label="Geography" pts={breakdown.geography} max={25} />
            <BreakdownBar label="Matter Volume" pts={breakdown.matterVolume} max={10} />
          </Card>

          <Card style={{ marginTop: 12 }}>
            <div style={styles.sectionTitle}>Firm Data</div>
            <DataRow label="Firm" value={lead.firmName} />
            <DataRow label="Contact" value={lead.contactName} />
            <DataRow label="Email" value={lead.email} />
            <DataRow label="Phone" value={lead.phone} />
            <DataRow label="Location" value={`${lead.city || ''}${lead.city && lead.county ? ', ' : ''}${lead.county || ''}`} />
            <DataRow label="Practice" value={lead.practiceArea} />
            <DataRow label="Firm Size" value={lead.firmSize} />
            <DataRow label="Matters" value={lead.matterVolume} />
            <DataRow label="Source" value={lead.source} />
            <DataRow label="Bar #" value={lead.barNumber} />
          </Card>
        </div>

        <div style={styles.rightCol}>
          <Card>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionTitle}>Research Brief</div>
              <Tag
                label={researchStatusLabel[lead.researchStatus] || lead.researchStatus}
                color={researchStatusColor[lead.researchStatus] || colors.textMuted}
              />
            </div>
            <p style={styles.briefText}>
              {lead.researchBrief || 'Research pending...'}
            </p>
          </Card>

          {lead.painPoints && lead.painPoints.length > 0 && (
            <Card style={{ marginTop: 12 }}>
              <div style={styles.sectionTitle}>Pain Points</div>
              <ul style={styles.list}>
                {lead.painPoints.map((point, i) => (
                  <li key={i} style={styles.listItem}>
                    <span style={{ color: colors.red, marginRight: 8, flexShrink: 0 }}>✕</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {lead.personalizationHooks && lead.personalizationHooks.length > 0 && (
            <Card style={{ marginTop: 12 }}>
              <div style={styles.sectionTitle}>Personalization Hooks</div>
              <ul style={styles.list}>
                {lead.personalizationHooks.map((hook, i) => (
                  <li key={i} style={styles.listItem}>
                    <span style={{ color: colors.amber, marginRight: 8, flexShrink: 0 }}>→</span>
                    <span>{hook}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {lead.bestAngle && (
            <Card tint="amber" style={{ marginTop: 12 }}>
              <div style={styles.sectionTitle}>Best Outreach Angle</div>
              <p style={styles.angleText}>{lead.bestAngle}</p>
            </Card>
          )}

          {lead.suggestedSubject && (
            <Card style={{ marginTop: 12 }}>
              <div style={styles.sectionTitle}>Suggested Subject Line</div>
              <p style={styles.subjectText}>{lead.suggestedSubject}</p>
            </Card>
          )}

          {lead.competitorAlert && (
            <Card tint="red" style={{ marginTop: 12 }}>
              <div style={styles.sectionTitle}>Competitor / Risk Alert</div>
              <p style={styles.alertText}>{lead.competitorAlert}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function BreakdownBar({ label, pts, max }) {
  const pct = max > 0 ? (pts / max) * 100 : 0;
  return (
    <div style={styles.bdRow}>
      <span style={styles.bdLabel}>{label}</span>
      <div style={styles.bdTrack}>
        <div style={{ ...styles.bdFill, width: `${pct}%` }} />
      </div>
      <span style={styles.bdPts}>{pts}/{max}</span>
    </div>
  );
}

function DataRow({ label, value }) {
  return (
    <div style={styles.dataRow}>
      <span style={styles.dataLabel}>{label}</span>
      <span style={styles.dataValue}>{value || '—'}</span>
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
  notFound: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: 16,
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 24px',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg1,
    flexShrink: 0,
  },
  backBtn: {
    background: 'none',
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: font,
    cursor: 'pointer',
  },
  topCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  stageDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
  stageLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  topActions: {
    display: 'flex',
    gap: 8,
  },
  stageBtn: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: font,
    cursor: 'pointer',
  },
  content: {
    display: 'flex',
    gap: 20,
    padding: 24,
    flex: 1,
    overflow: 'auto',
  },
  leftCol: {
    width: 300,
    flexShrink: 0,
  },
  rightCol: {
    flex: 1,
    minWidth: 0,
  },
  scoreSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 0',
  },
  tierLabel: {
    marginTop: 12,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10,
  },
  briefText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 1.6,
    margin: 0,
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  listItem: {
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 1.5,
  },
  angleText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 1.6,
    margin: 0,
  },
  subjectText: {
    fontSize: 14,
    color: colors.amber,
    fontStyle: 'italic',
    lineHeight: 1.5,
    margin: 0,
  },
  alertText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 1.6,
    margin: 0,
  },
  bdRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bdLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    width: 90,
    flexShrink: 0,
  },
  bdTrack: {
    flex: 1,
    height: 6,
    background: colors.bg1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bdFill: {
    height: '100%',
    background: colors.amber,
    borderRadius: 3,
    transition: 'width 0.5s ease-out',
  },
  bdPts: {
    fontSize: 11,
    color: colors.textMuted,
    width: 36,
    textAlign: 'right',
    flexShrink: 0,
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: `1px solid ${colors.border}`,
    fontSize: 12,
  },
  dataLabel: {
    color: colors.textSecondary,
  },
  dataValue: {
    color: colors.textPrimary,
    fontWeight: 500,
    textAlign: 'right',
  },
};
