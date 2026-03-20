import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, font, stageColors, stageLabels, tierColors } from '../styles/tokens';
import Tag from '../components/Tag';
import ImportModal from './ImportModal';
import { getSequenceStatus } from '../engine/sequence';

const STAGES = ['new', 'contacted', 'replied', 'demo-booked', 'closed', 'dead'];

export default function Pipeline({ leads, importLead, updateLead }) {
  const [showImport, setShowImport] = useState(false);
  const navigate = useNavigate();

  const byStage = {};
  STAGES.forEach(s => { byStage[s] = []; });
  leads.forEach(l => {
    const stage = l.stage || 'new';
    if (byStage[stage]) byStage[stage].push(l);
  });

  const tierCounts = { 1: 0, 2: 0, 3: 0 };
  leads.forEach(l => {
    const t = l.tier || 3;
    if (tierCounts[t] !== undefined) tierCounts[t]++;
  });

  return (
    <div style={styles.container}>
      <div style={styles.topbar}>
        <div style={styles.topLeft}>
          <h1 style={styles.title}>Pipeline</h1>
          <span style={styles.totalBadge}>{leads.length} leads</span>
          <Tag label={`T1: ${tierCounts[1]}`} color={tierColors[1]} />
          <Tag label={`T2: ${tierCounts[2]}`} color={tierColors[2]} />
          <Tag label={`T3: ${tierCounts[3]}`} color={colors.textMuted} />
        </div>
        <button style={styles.importBtn} onClick={() => setShowImport(true)}>
          + Import Lead
        </button>
      </div>

      <div style={styles.kanban}>
        {STAGES.map(stage => (
          <div key={stage} style={styles.column}>
            <div style={styles.colHeader}>
              <span style={{ ...styles.stageDot, background: stageColors[stage] }} />
              <span style={styles.colLabel}>{stageLabels[stage]}</span>
              <span style={styles.countBadge}>{byStage[stage].length}</span>
            </div>
            <div style={styles.colBody}>
              {byStage[stage].length === 0 ? (
                <div style={styles.emptyPlaceholder}>
                  <span style={styles.emptyDash}>- - -</span>
                </div>
              ) : (
                byStage[stage].map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => navigate(`/lead/${lead.id}`)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={importLead}
          updateLead={updateLead}
        />
      )}
    </div>
  );
}

function LeadCard({ lead, onClick }) {
  const tierColor = tierColors[lead.tier] || colors.textMuted;
  const isResearching = lead.researchStatus === 'researching';
  const seqStatus = getSequenceStatus(lead);

  // Touch progress info
  let touchLabel = '';
  let touchColor = colors.textMuted;
  let touchDueLabel = '';
  if (seqStatus) {
    touchLabel = `Touch ${seqStatus.touchCount} of ${seqStatus.totalTouches}`;
    if (seqStatus.sequenceStatus === 'paused') {
      touchLabel = 'Sequence paused — reply received';
      touchColor = colors.green;
    } else if (seqStatus.sequenceStatus === 'complete' && lead.stage === 'dead') {
      touchLabel = 'Sequence complete — no reply';
      touchColor = colors.textMuted;
    } else if (seqStatus.sequenceStatus === 'complete') {
      touchLabel = `All ${seqStatus.totalTouches} touches complete`;
      touchColor = colors.green;
    } else if (seqStatus.nextTouch) {
      const nt = seqStatus.nextTouch;
      const channelLabel = nt.channel === 'email' ? 'Email' : nt.channel === 'linkedin' ? 'LinkedIn' : nt.channel === 'call' ? 'Call' : nt.channel;
      if (nt.isDueToday) {
        touchDueLabel = `${channelLabel} due TODAY`;
        touchColor = colors.amber;
      } else if (nt.isOverdue) {
        touchDueLabel = `${channelLabel} OVERDUE`;
        touchColor = colors.red;
      } else {
        const daysUntil = Math.ceil((new Date(nt.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        touchDueLabel = `${channelLabel} in ${daysUntil}d`;
        touchColor = colors.textMuted;
      }
    }
  }

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.cardTop}>
        <span style={styles.firmName}>{lead.firmName}</span>
        <span style={{ ...styles.tierBadge, color: tierColor, borderColor: `${tierColor}50` }}>
          T{lead.tier}
        </span>
      </div>
      <div style={styles.cardContact}>{lead.contactName || '—'}</div>

      <div style={styles.scoreBarWrap}>
        <div style={styles.scoreBarTrack}>
          <div
            style={{
              ...styles.scoreBarFill,
              width: `${lead.score}%`,
              background: tierColor,
            }}
          />
        </div>
        <span style={{ ...styles.scoreLabel, color: tierColor }}>{lead.score}</span>
      </div>

      <div style={styles.cardTags}>
        {lead.county && <Tag label={lead.county} color={colors.textSecondary} />}
        {lead.matterVolume >= 50 && (
          <Tag label={`${lead.matterVolume} matters`} color={colors.blue} />
        )}
      </div>

      {seqStatus && (
        <div style={styles.touchRow}>
          <div style={styles.touchDivider} />
          <span style={{ ...styles.touchLabel, color: touchColor }}>{touchLabel}</span>
          {touchDueLabel && (
            <span style={{
              ...styles.touchDue,
              color: touchColor === colors.red || touchColor === colors.amber ? colors.bg0 : touchColor,
              background: touchColor === colors.red || touchColor === colors.amber ? touchColor : 'transparent',
              padding: touchColor === colors.red || touchColor === colors.amber ? '1px 6px' : 0,
              borderRadius: 3,
            }}>
              {touchDueLabel}
            </span>
          )}
        </div>
      )}

      {isResearching && (
        <div style={styles.researchPulse}>
          <span style={styles.pulseText}>RESEARCHING...</span>
        </div>
      )}
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
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg1,
    flexShrink: 0,
  },
  topLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: 0,
    fontFamily: font,
  },
  totalBadge: {
    fontSize: 12,
    color: colors.textSecondary,
    background: colors.bg4,
    padding: '2px 10px',
    borderRadius: 10,
  },
  importBtn: {
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
  kanban: {
    display: 'flex',
    gap: 12,
    padding: 16,
    flex: 1,
    overflow: 'auto',
  },
  column: {
    flex: 1,
    minWidth: 220,
    display: 'flex',
    flexDirection: 'column',
    background: colors.bg2,
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    overflow: 'hidden',
  },
  colHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    borderBottom: `1px solid ${colors.border}`,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  colLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.textPrimary,
    flex: 1,
  },
  countBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    background: colors.bg4,
    padding: '1px 7px',
    borderRadius: 8,
  },
  colBody: {
    flex: 1,
    padding: 8,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  emptyPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    border: `1px dashed ${colors.border}`,
    borderRadius: 6,
  },
  emptyDash: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 4,
  },
  card: {
    background: colors.bg3,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: 12,
    cursor: 'pointer',
    transition: 'border-color 0.15s, transform 0.1s',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  firmName: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
    lineHeight: 1.3,
  },
  tierBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 3,
    border: '1px solid',
    flexShrink: 0,
  },
  cardContact: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  scoreBarWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scoreBarTrack: {
    flex: 1,
    height: 4,
    background: colors.bg1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.5s ease-out',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: 700,
    minWidth: 20,
    textAlign: 'right',
  },
  cardTags: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  touchRow: {
    marginTop: 8,
  },
  touchDivider: {
    height: 1,
    background: colors.border,
    marginBottom: 6,
  },
  touchLabel: {
    fontSize: 10,
    fontWeight: 500,
    display: 'block',
    marginBottom: 2,
  },
  touchDue: {
    fontSize: 10,
    fontWeight: 700,
    display: 'inline-block',
  },
  researchPulse: {
    marginTop: 8,
    padding: '4px 0',
  },
  pulseText: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.amber,
    letterSpacing: '0.05em',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};
