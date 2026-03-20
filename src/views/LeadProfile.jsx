import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { colors, font, stageColors, stageLabels, tierColors } from '../styles/tokens';
import ScoreRing from '../components/ScoreRing';
import Card from '../components/Card';
import Tag from '../components/Tag';
import { scoreICP } from '../engine/icp';
import { getSequenceStatus, getSequenceConfig, markActionComplete, SEQUENCE_TIERS } from '../engine/sequence';
import { trackEmailSend } from '../engine/learning';

const STAGES_ORDER = ['new', 'contacted', 'replied', 'demo-booked', 'closed', 'dead'];

export default function LeadProfile({ leads, updateStage, updateLead }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const lead = leads.find(l => l.id === id);

  const [emailModal, setEmailModal] = useState(false);
  const [emailDraft, setEmailDraft] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);

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

  const breakdown = lead.breakdown || scoreICP(lead).breakdown;

  // Pipeline manual stage controls — only specific transitions allowed
  function handleBookDemo() {
    updateStage(lead.id, 'demo-booked');
    syncToGHL(lead, 'demo-booked');
  }
  function handleMarkClosed() {
    updateStage(lead.id, 'closed');
    syncToGHL(lead, 'closed');
  }
  function handleMarkDead() {
    updateStage(lead.id, 'dead');
    syncToGHL(lead, 'dead');
  }

  function syncToGHL(lead, newStage) {
    fetch('/api/ghl-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead: { ...lead, stage: newStage || lead.stage }, action: 'stage-change' }),
    }).catch(err => console.error('GHL sync failed:', err));
  }

  const seqStatus = getSequenceStatus(lead);
  const seqConfig = getSequenceConfig(lead.sequenceTier || lead.tier);
  const nextAction = seqStatus?.nextTouch || null;
  const touchHistory = lead.touchHistory || lead.sequenceHistory || [];

  async function handleWriteEmail() {
    setEmailModal(true);
    setEmailLoading(true);
    try {
      const res = await fetch('/api/email-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead,
          sequenceDay: nextAction?.day || 1,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmailDraft(data);
      }
    } catch (err) {
      console.error('Email write failed:', err);
    }
    setEmailLoading(false);
  }

  async function handleSendEmail() {
    if (!emailDraft) return;
    setEmailLoading(true);
    try {
      const sendRes = await fetch('/api/email-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: emailDraft.subject,
          body: emailDraft.body,
          leadId: lead.id,
        }),
      });

      if (sendRes.ok) {
        trackEmailSend({
          leadId: lead.id,
          subject: emailDraft.subject,
          angle: emailDraft.angle,
          day: nextAction?.day || 1,
        });

        if (nextAction) {
          const updates = markActionComplete(lead, nextAction);
          // Handle auto stage changes (only 3 sync points)
          if (updates._autoStageChange) {
            updateStage(lead.id, updates._autoStageChange);
            syncToGHL(lead, updates._autoStageChange);
            delete updates._autoStageChange;
          }
          updateLead(lead.id, updates);
        }
      }
    } catch (err) {
      console.error('Email send failed:', err);
    }
    setEmailModal(false);
    setEmailDraft(null);
    setEmailLoading(false);
  }

  function handleSaveDraft() {
    setEmailModal(false);
    setEmailDraft(null);
  }

  const channelIcon = {
    email: '✉',
    linkedin: '◈',
    call: '☏',
    nurture: '◇',
  };

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
          {seqStatus && (
            <span style={styles.touchBadge}>Touch {seqStatus.touchCount}/{seqStatus.totalTouches}</span>
          )}
        </div>
        <div style={styles.topActions}>
          {lead.stage === 'replied' && (
            <button style={{ ...styles.stageBtn, background: colors.amber, color: colors.bg0 }} onClick={handleBookDemo}>
              Book Demo
            </button>
          )}
          {lead.stage === 'demo-booked' && (
            <button style={{ ...styles.stageBtn, background: colors.green, color: colors.bg0 }} onClick={handleMarkClosed}>
              Mark Closed
            </button>
          )}
          {lead.stage !== 'dead' && lead.stage !== 'closed' && (
            <button style={{ ...styles.stageBtn, color: colors.textMuted }} onClick={handleMarkDead}>
              Mark Dead
            </button>
          )}
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

          {/* PIPELINE POSITION — relationship status */}
          <Card style={{ marginTop: 12 }}>
            <div style={styles.sectionTitle}>Pipeline Position</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ ...styles.stageDot, background: stageColors[lead.stage] }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
                {stageLabels[lead.stage]}
              </span>
            </div>
            <div style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.5 }}>
              Pipeline stage reflects relationship status. Changes only on: first email sent, reply received, or manual action.
            </div>
          </Card>

          {/* SEQUENCE STATUS — touch cadence (independent) */}
          {seqStatus && (
            <Card style={{ marginTop: 12 }}>
              <div style={styles.sectionHeader}>
                <div style={styles.sectionTitle}>Sequence (Touch Cadence)</div>
                <Tag label={`${seqConfig.label} · T${lead.sequenceTier || lead.tier}`} color={tierColors[lead.sequenceTier || lead.tier]} />
              </div>

              {/* Progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 6, background: colors.bg1, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(seqStatus.touchCount / seqStatus.totalTouches) * 100}%`,
                    background: seqStatus.sequenceStatus === 'paused' ? colors.blue : seqStatus.sequenceStatus === 'complete' ? colors.green : colors.amber,
                    borderRadius: 3,
                    transition: 'width 0.5s ease-out',
                  }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>
                  {seqStatus.touchCount} / {seqStatus.totalTouches}
                </span>
              </div>

              {/* Status */}
              {seqStatus.sequenceStatus === 'paused' && (
                <div style={{ ...styles.nextActionCard, borderColor: `${colors.blue}40` }}>
                  <div style={{ fontSize: 12, color: colors.blue, fontWeight: 600 }}>
                    Sequence paused — reply received
                  </div>
                  <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                    Sequence will not fire more touches while lead has replied. Resume manually if needed.
                  </div>
                  <button
                    style={{ ...styles.writeBtn, background: colors.blue, marginTop: 8 }}
                    onClick={() => {
                      updateLead(lead.id, { sequenceStatus: 'active' });
                      updateStage(lead.id, 'contacted');
                    }}
                  >
                    Resume Sequence
                  </button>
                </div>
              )}

              {seqStatus.sequenceStatus === 'complete' && (
                <div style={{ fontSize: 12, color: colors.green, fontWeight: 600 }}>
                  All {seqStatus.totalTouches} touches complete
                </div>
              )}

              {/* Next touch card */}
              {seqStatus.sequenceStatus === 'active' && nextAction && (
                <div style={styles.nextActionCard}>
                  <div style={styles.nextActionTop}>
                    <span style={styles.channelIcon}>{channelIcon[nextAction.channel] || '◇'}</span>
                    <div>
                      <div style={styles.nextActionLabel}>
                        Touch {nextAction.touchNumber}: {nextAction.action}
                      </div>
                      <div style={styles.nextActionDue}>
                        Due: {new Date(nextAction.dueDate).toLocaleDateString()}
                        {nextAction.isOverdue && <span style={{ color: colors.red, marginLeft: 6 }}>(overdue)</span>}
                        {nextAction.isDueToday && <span style={{ color: colors.amber, marginLeft: 6 }}>(today)</span>}
                      </div>
                    </div>
                  </div>
                  {(nextAction.channel === 'email' || nextAction.channel === 'linkedin') && (
                    <button style={styles.writeBtn} onClick={handleWriteEmail}>
                      {nextAction.channel === 'email' ? 'Write Email Now' : 'Draft LinkedIn Message'}
                    </button>
                  )}
                  {nextAction.channel === 'call' && (
                    <button style={{ ...styles.writeBtn, background: colors.green }}>
                      Open Call Script
                    </button>
                  )}
                </div>
              )}

              {seqStatus.sequenceStatus === 'active' && (
                <button
                  style={{ ...styles.writeBtn, background: colors.bg4, color: colors.textSecondary, border: `1px solid ${colors.border}`, marginTop: 8 }}
                  onClick={() => updateLead(lead.id, { sequenceStatus: 'paused', sequencePausedAt: new Date().toISOString() })}
                >
                  Pause Sequence
                </button>
              )}

              {/* Touch history */}
              {touchHistory.length > 0 && (
                <div style={styles.seqHistory}>
                  <div style={{ ...styles.sectionTitle, marginTop: 12 }}>Touch History</div>
                  {touchHistory.map((h, i) => (
                    <div key={i} style={styles.seqHistoryRow}>
                      <span style={styles.seqHistoryIcon}>{channelIcon[h.channel] || '◇'}</span>
                      <div style={styles.seqHistoryInfo}>
                        <span style={styles.seqHistoryAction}>
                          Touch {h.touchNumber || i + 1} · Day {h.day}: {h.action}
                        </span>
                        <span style={styles.seqHistoryDate}>
                          {new Date(h.sentAt || h.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {emailModal && (
        <div style={styles.overlay} onClick={() => { setEmailModal(false); setEmailDraft(null); }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                Email — {lead.firmName} · Day {nextAction?.day || 1}
              </h3>
              <button style={styles.closeBtn} onClick={() => { setEmailModal(false); setEmailDraft(null); }}>
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              {emailLoading ? (
                <div style={styles.loadingText}>Generating email...</div>
              ) : emailDraft ? (
                <>
                  <label style={styles.fieldLabel}>Subject</label>
                  <input
                    style={styles.input}
                    value={emailDraft.subject}
                    onChange={e => setEmailDraft({ ...emailDraft, subject: e.target.value })}
                  />
                  <label style={{ ...styles.fieldLabel, marginTop: 12 }}>Body</label>
                  <textarea
                    style={styles.textarea}
                    value={emailDraft.body}
                    onChange={e => setEmailDraft({ ...emailDraft, body: e.target.value })}
                    rows={14}
                  />
                  {emailDraft.painPointUsed && (
                    <div style={{ marginTop: 10 }}>
                      <Tag label={`Pain: ${emailDraft.painPointUsed}`} color={colors.red} />
                    </div>
                  )}
                  {emailDraft.angle && (
                    <div style={{ marginTop: 6 }}>
                      <Tag label={`Angle: ${emailDraft.angle}`} color={colors.amber} />
                    </div>
                  )}
                </>
              ) : (
                <div style={styles.loadingText}>Failed to generate email.</div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={handleSaveDraft}>
                Save Draft
              </button>
              {emailDraft && (
                <button style={styles.sendBtn} onClick={handleSendEmail} disabled={emailLoading}>
                  Send Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
  touchBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    background: colors.bg4,
    padding: '2px 8px',
    borderRadius: 8,
    marginLeft: 4,
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
  // Sequence panel styles
  nextActionCard: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: 12,
  },
  nextActionTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  channelIcon: {
    fontSize: 18,
    color: colors.amber,
    width: 28,
    textAlign: 'center',
  },
  nextActionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  nextActionDue: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  writeBtn: {
    background: colors.amber,
    color: colors.bg0,
    border: 'none',
    borderRadius: 4,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
    width: '100%',
    marginTop: 4,
  },
  seqComplete: {
    fontSize: 12,
    color: colors.green,
    margin: 0,
  },
  seqHistory: {
    marginTop: 4,
  },
  seqHistoryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  seqHistoryIcon: {
    fontSize: 12,
    color: colors.textMuted,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  seqHistoryInfo: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
  },
  seqHistoryAction: {
    fontSize: 11,
    color: colors.textPrimary,
  },
  seqHistoryDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  seqHistorySubject: {
    fontSize: 10,
    color: colors.textSecondary,
    maxWidth: 120,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Email modal styles
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: colors.bg2,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    width: 620,
    maxHeight: '85vh',
    overflow: 'auto',
    fontFamily: font,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.border}`,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: 0,
    fontFamily: font,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: 16,
    cursor: 'pointer',
    fontFamily: font,
  },
  modalBody: {
    padding: 20,
  },
  loadingText: {
    fontSize: 13,
    color: colors.amber,
    textAlign: 'center',
    padding: 20,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '8px 10px',
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: font,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '8px 10px',
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: font,
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.5,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '12px 20px',
    borderTop: `1px solid ${colors.border}`,
  },
  cancelBtn: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: font,
    cursor: 'pointer',
  },
  sendBtn: {
    background: colors.amber,
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: colors.bg0,
    fontFamily: font,
    cursor: 'pointer',
  },
};
