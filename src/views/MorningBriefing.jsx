import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, font, tierColors, stageLabels } from '../styles/tokens';
import Card from '../components/Card';
import Tag from '../components/Tag';
import { getTodayActions, getNextAction } from '../engine/sequence';
import { getRecentReplies, getTotalSends } from '../engine/learning';

export default function MorningBriefing({ leads, updateLead, updateStage }) {
  const navigate = useNavigate();
  const [todayActions, setTodayActions] = useState([]);
  const [emailModal, setEmailModal] = useState(null);
  const [emailDraft, setEmailDraft] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (leads) {
      setTodayActions(getTodayActions(leads));
    }
  }, [leads]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (leads) setTodayActions(getTodayActions(leads));
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [leads]);

  const recentReplies = getRecentReplies();
  const totalSends = getTotalSends();

  const stageBreakdown = {};
  const staleleads = [];
  const now = new Date();

  if (leads) {
    leads.forEach(l => {
      const s = l.stage || 'new';
      stageBreakdown[s] = (stageBreakdown[s] || 0) + 1;

      const history = l.sequenceHistory || [];
      const lastAction = history.length > 0
        ? new Date(history[history.length - 1].completedAt)
        : new Date(l.createdAt);
      const daysSince = Math.floor((now - lastAction) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7 && l.stage !== 'closed' && l.stage !== 'dead') {
        staleleads.push({ ...l, daysSince });
      }
    });
  }

  const sequenceRunning = leads ? leads.filter(l => {
    const next = getNextAction(l);
    return next && l.stage !== 'closed' && l.stage !== 'dead';
  }).length : 0;

  const sequenceComplete = leads ? leads.filter(l => {
    const next = getNextAction(l);
    return !next && (l.sequenceHistory || []).length > 0;
  }).length : 0;

  async function handleWriteEmail(action) {
    setEmailModal(action);
    setLoading(true);
    try {
      const res = await fetch('/api/email-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: action.lead,
          sequenceDay: action.day,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmailDraft(data);
      }
    } catch (err) {
      console.error('Email write failed:', err);
    }
    setLoading(false);
  }

  async function handleSendEmail() {
    if (!emailDraft || !emailModal) return;
    setLoading(true);
    try {
      await fetch('/api/email-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailModal.lead.email,
          subject: emailDraft.subject,
          body: emailDraft.body,
          leadId: emailModal.lead.id,
        }),
      });
    } catch (err) {
      console.error('Email send failed:', err);
    }
    setEmailModal(null);
    setEmailDraft(null);
    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Good morning.</h1>
        <p style={styles.subtitle}>Here is what needs your attention today.</p>
      </div>

      <div style={styles.grid}>
        <div style={styles.mainCol}>
          <Card>
            <div style={styles.sectionTitle}>Today's Actions</div>
            {todayActions.length === 0 ? (
              <p style={styles.emptyText}>No actions due today. All sequences are on track.</p>
            ) : (
              <div style={styles.actionList}>
                {todayActions.map((action, i) => (
                  <div key={i} style={styles.actionCard}>
                    <div style={styles.actionTop}>
                      <Tag label={`T${action.lead.tier}`} color={tierColors[action.lead.tier]} />
                      <span style={styles.actionFirm}>{action.lead.firmName}</span>
                      <Tag
                        label={action.channel}
                        color={
                          action.channel === 'email' ? colors.blue :
                          action.channel === 'linkedin' ? colors.purple :
                          action.channel === 'call' ? colors.green :
                          colors.textMuted
                        }
                      />
                    </div>
                    <p style={styles.actionDesc}>
                      Day {action.day}: {action.action}
                      {action.isOverdue && <span style={styles.overdue}> (overdue)</span>}
                    </p>
                    <div style={styles.actionBtns}>
                      {action.channel === 'email' && (
                        <button style={styles.actionBtn} onClick={() => handleWriteEmail(action)}>
                          Write Email
                        </button>
                      )}
                      {action.channel === 'linkedin' && (
                        <button style={styles.actionBtn} onClick={() => handleWriteEmail(action)}>
                          Draft Message
                        </button>
                      )}
                      {action.channel === 'call' && (
                        <button style={styles.actionBtn} onClick={() => navigate(`/lead/${action.lead.id}`)}>
                          View Talk Track
                        </button>
                      )}
                      <button
                        style={styles.viewBtn}
                        onClick={() => navigate(`/lead/${action.lead.id}`)}
                      >
                        View Lead
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {recentReplies.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <div style={styles.sectionTitle}>Overnight Replies</div>
              <div style={styles.replyList}>
                {recentReplies.map((reply, i) => (
                  <div key={i} style={styles.replyRow}>
                    <Tag
                      label={reply.sentiment}
                      color={
                        reply.sentiment === 'positive' ? colors.green :
                        reply.sentiment === 'negative' ? colors.red :
                        colors.textSecondary
                      }
                    />
                    <span style={styles.replyLead}>{reply.leadId}</span>
                    <span style={styles.replyTime}>
                      {new Date(reply.repliedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div style={styles.sideCol}>
          <Card>
            <div style={styles.sectionTitle}>Pipeline Health</div>
            <div style={styles.statGrid}>
              {Object.entries(stageBreakdown).map(([stage, count]) => (
                <div key={stage} style={styles.statRow}>
                  <span style={styles.statLabel}>{stageLabels[stage] || stage}</span>
                  <span style={styles.statValue}>{count}</span>
                </div>
              ))}
            </div>
            {staleleads.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ ...styles.sectionTitle, color: colors.red, marginBottom: 6 }}>
                  Stale Leads ({staleleads.length})
                </div>
                {staleleads.slice(0, 5).map(l => (
                  <div key={l.id} style={styles.staleRow}>
                    <span style={styles.staleName}>{l.firmName}</span>
                    <span style={styles.staleDays}>{l.daysSince}d</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ marginTop: 12 }}>
            <div style={styles.sectionTitle}>Sequence Status</div>
            <div style={styles.statGrid}>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Running</span>
                <span style={{ ...styles.statValue, color: colors.blue }}>{sequenceRunning}</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Completed</span>
                <span style={{ ...styles.statValue, color: colors.green }}>{sequenceComplete}</span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Total Emails Sent</span>
                <span style={styles.statValue}>{totalSends}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {emailModal && (
        <div style={styles.overlay} onClick={() => { setEmailModal(null); setEmailDraft(null); }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                Email for {emailModal.lead.firmName} — Day {emailModal.day}
              </h3>
              <button style={styles.closeBtn} onClick={() => { setEmailModal(null); setEmailDraft(null); }}>
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              {loading ? (
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
                    rows={12}
                  />
                </>
              ) : (
                <div style={styles.loadingText}>Failed to generate email.</div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => { setEmailModal(null); setEmailDraft(null); }}>
                Cancel
              </button>
              {emailDraft && (
                <button style={styles.sendBtn} onClick={handleSendEmail} disabled={loading}>
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

const styles = {
  container: {
    flex: 1,
    padding: 24,
    overflow: 'auto',
    fontFamily: font,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: '0 0 4px',
    fontFamily: font,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    margin: 0,
  },
  grid: {
    display: 'flex',
    gap: 20,
  },
  mainCol: {
    flex: 1,
    minWidth: 0,
  },
  sideCol: {
    width: 280,
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    margin: 0,
  },
  actionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  actionCard: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: 12,
  },
  actionTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  actionFirm: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
    flex: 1,
  },
  actionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    margin: '0 0 8px',
    lineHeight: 1.4,
  },
  overdue: {
    color: colors.red,
    fontWeight: 600,
  },
  actionBtns: {
    display: 'flex',
    gap: 8,
  },
  actionBtn: {
    background: colors.amber,
    color: colors.bg0,
    border: 'none',
    borderRadius: 4,
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
  },
  viewBtn: {
    background: colors.bg3,
    color: colors.textSecondary,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '5px 12px',
    fontSize: 11,
    fontFamily: font,
    cursor: 'pointer',
  },
  replyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  replyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  replyLead: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
  replyTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  staleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: 11,
  },
  staleName: {
    color: colors.red,
  },
  staleDays: {
    color: colors.red,
    fontWeight: 600,
  },
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
    width: 600,
    maxHeight: '80vh',
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
