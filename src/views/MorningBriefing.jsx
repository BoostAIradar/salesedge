import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, font, tierColors, stageLabels, stageColors } from '../styles/tokens';
import Card from '../components/Card';
import Tag from '../components/Tag';
import CallScriptModal from '../components/CallScriptModal';
import { getTodayActions, getNextAction, markActionComplete, getSequenceHealth } from '../engine/sequence';
import { getRecentReplies, getTotalSends, getSystemInsights } from '../engine/learning';

const LAST_BRIEFING_KEY = 'salesedge:lastBriefingAt';
const STAGES_ORDER = ['new', 'contacted', 'replied', 'demo-booked', 'closed'];

export default function MorningBriefing({ leads, updateLead, updateStage, posts, inboxMessages, addNotification }) {
  const navigate = useNavigate();
  const [todayActions, setTodayActions] = useState([]);
  const [emailModal, setEmailModal] = useState(null);
  const [emailDraft, setEmailDraft] = useState(null);
  const [linkedinModal, setLinkedinModal] = useState(null);
  const [linkedinDraft, setLinkedinDraft] = useState(null);
  const [callModal, setCallModal] = useState(null);
  const [callScript, setCallScript] = useState(null);
  const [loading, setLoading] = useState(false);

  // Track last briefing open
  useEffect(() => {
    localStorage.setItem(LAST_BRIEFING_KEY, new Date().toISOString());
  }, []);

  useEffect(() => {
    if (leads) setTodayActions(getTodayActions(leads));
  }, [leads]);

  // Auto-refresh every 30 min
  useEffect(() => {
    const interval = setInterval(() => {
      if (leads) setTodayActions(getTodayActions(leads));
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [leads]);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 10 ? 'Good morning.' : hour < 14 ? 'Good afternoon.' : 'Good evening.';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // North star
  const demosBooked = leads ? leads.filter(l => l.stage === 'demo-booked' || l.stage === 'closed').length : 0;

  // System status
  const sequenceHealth = useMemo(() => leads ? getSequenceHealth(leads) : null, [leads]);
  const todayPosts = (posts || []).filter(p => {
    if (!p.scheduledAt) return false;
    return p.scheduledAt.split('T')[0] === new Date().toISOString().split('T')[0];
  });
  const unreadInbox = (inboxMessages || []).filter(m => !m.read).length;

  // Stale leads
  const now = new Date();
  const staleLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => {
      if (l.stage === 'closed' || l.stage === 'dead') return false;
      const history = l.sequenceHistory || [];
      const lastAction = history.length > 0
        ? new Date(history[history.length - 1].completedAt)
        : new Date(l.createdAt);
      return Math.floor((now - lastAction) / (1000 * 60 * 60 * 24)) >= 7;
    }).map(l => {
      const history = l.sequenceHistory || [];
      const lastAction = history.length > 0
        ? new Date(history[history.length - 1].completedAt)
        : new Date(l.createdAt);
      return { ...l, daysSince: Math.floor((now - lastAction) / (1000 * 60 * 60 * 24)) };
    });
  }, [leads]);

  // Pipeline funnel
  const funnel = useMemo(() => {
    if (!leads) return {};
    const counts = {};
    STAGES_ORDER.forEach(s => { counts[s] = 0; });
    leads.forEach(l => { if (counts[l.stage] !== undefined) counts[l.stage]++; });
    return counts;
  }, [leads]);

  // Overnight replies
  const lastBriefingAt = localStorage.getItem(LAST_BRIEFING_KEY);
  const overnightReplies = (inboxMessages || []).filter(m => {
    if (!lastBriefingAt) return !m.read;
    return new Date(m.receivedAt) > new Date(lastBriefingAt);
  });

  // System insights
  const insights = useMemo(() => getSystemInsights(), []);

  // Sorted actions: tier 1 first, then by channel priority
  const channelPriority = { email: 2, linkedin: 1, call: 3, nurture: 0 };
  const sortedActions = [...todayActions].sort((a, b) => {
    if (a.lead.tier !== b.lead.tier) return a.lead.tier - b.lead.tier;
    return (channelPriority[b.channel] || 0) - (channelPriority[a.channel] || 0);
  });

  // === Action Handlers ===
  async function handleWriteEmail(action) {
    setEmailModal(action);
    setLoading(true);
    try {
      const res = await fetch('/api/email-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: action.lead, sequenceDay: action.day }),
      });
      if (res.ok) setEmailDraft(await res.json());
    } catch (err) { console.error('Email write failed:', err); }
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
      const historyUpdate = markActionComplete(emailModal.lead, emailModal);
      updateLead(emailModal.lead.id, historyUpdate);
      if (emailModal.lead.stage === 'new') updateStage(emailModal.lead.id, 'contacted');
      if (addNotification) addNotification('success', `Email sent to ${emailModal.lead.firmName}`);
    } catch (err) { console.error('Send failed:', err); }
    setEmailModal(null); setEmailDraft(null); setLoading(false);
  }

  async function handleLinkedIn(action) {
    setLinkedinModal(action);
    setLoading(true);
    try {
      const res = await fetch('/api/linkedin-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: action.lead,
          messageType: 'connect_request',
          sequenceDay: action.day,
        }),
      });
      if (res.ok) setLinkedinDraft(await res.json());
    } catch (err) { console.error('LinkedIn write failed:', err); }
    setLoading(false);
  }

  function handleCopyLinkedIn() {
    if (linkedinDraft?.message) {
      navigator.clipboard.writeText(linkedinDraft.message);
      window.open('https://www.linkedin.com', '_blank');
      const historyUpdate = markActionComplete(linkedinModal.lead, linkedinModal);
      updateLead(linkedinModal.lead.id, historyUpdate);
      if (addNotification) addNotification('success', `LinkedIn message copied for ${linkedinModal.lead.firmName}`);
    }
    setLinkedinModal(null); setLinkedinDraft(null);
  }

  async function handleCallScript(action) {
    setCallModal(action);
    setLoading(true);
    try {
      const res = await fetch('/api/call-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: action.lead,
          callType: action.lead.stage === 'new' ? 'cold_call' : 'follow_up',
          previousTouches: action.lead.sequenceHistory || [],
        }),
      });
      if (res.ok) setCallScript(await res.json());
    } catch (err) { console.error('Call script failed:', err); }
    setLoading(false);
  }

  function handleLogCall(outcome) {
    if (!callModal) return;
    const historyUpdate = markActionComplete(callModal.lead, { ...callModal, callOutcome: outcome });
    updateLead(callModal.lead.id, historyUpdate);
    if (outcome === 'connected' && callModal.lead.stage === 'contacted') {
      updateStage(callModal.lead.id, 'replied');
    }
    if (addNotification) addNotification('success', `Call logged: ${outcome} — ${callModal.lead.firmName}`);
    setCallModal(null); setCallScript(null);
  }

  function handleStaleAction(lead) {
    const next = getNextAction(lead);
    if (next?.channel === 'email') handleWriteEmail({ ...next, lead });
    else if (next?.channel === 'call') handleCallScript({ ...next, lead });
    else navigate(`/lead/${lead.id}`);
  }

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.headerSection}>
        <div style={styles.greetingRow}>
          <div>
            <h1 style={styles.greeting}>{greeting}</h1>
            <span style={styles.date}>{dateStr}</span>
          </div>
          <div style={styles.northStar}>
            <div style={styles.nsLabel}>Demos Booked</div>
            <div style={styles.nsValue}>{demosBooked}</div>
            <div style={styles.nsTarget}>/ 5 target</div>
          </div>
        </div>
        <div style={styles.statusRow}>
          <StatusPill label="Sequences" value={sequenceHealth?.activeSequences || 0} color={colors.blue} />
          <StatusPill label="Posts Today" value={todayPosts.length} color={colors.purple} />
          <StatusPill label="Inbox Unread" value={unreadInbox} color={unreadInbox > 0 ? colors.red : colors.textMuted} />
          <StatusPill label="Stale Leads" value={staleLeads.length} color={staleLeads.length > 0 ? colors.amber : colors.textMuted} />
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.mainCol}>
          {/* TODAY'S ACTIONS */}
          <Card>
            <div style={styles.sectionTitle}>Today's Actions ({sortedActions.length})</div>
            {sortedActions.length === 0 ? (
              <p style={styles.emptyText}>No actions due today. All sequences on track.</p>
            ) : (
              <div style={styles.actionList}>
                {sortedActions.map((action, i) => (
                  <div key={i} style={styles.actionCard}>
                    <div style={styles.actionLeft}>
                      <Tag label={`T${action.lead.tier}`} color={tierColors[action.lead.tier]} />
                      <div>
                        <div style={styles.actionFirm}>{action.lead.firmName}</div>
                        <div style={styles.actionContact}>{action.lead.contactName || '—'}</div>
                      </div>
                    </div>
                    <div style={styles.actionCenter}>
                      <span style={styles.channelIcon}>
                        {action.channel === 'email' ? '✉' : action.channel === 'linkedin' ? '◈' : action.channel === 'call' ? '☏' : '◇'}
                      </span>
                      <div>
                        <div style={styles.actionLabel}>{action.action}</div>
                        <div style={styles.actionReason}>
                          Day {action.day}
                          {action.isOverdue && <span style={{ color: colors.red }}> — overdue</span>}
                        </div>
                      </div>
                    </div>
                    <div style={styles.actionRight}>
                      {action.channel === 'email' && (
                        <button style={styles.actionBtn} onClick={() => handleWriteEmail(action)}>Write + Send</button>
                      )}
                      {action.channel === 'linkedin' && (
                        <button style={styles.actionBtn} onClick={() => handleLinkedIn(action)}>Draft Message</button>
                      )}
                      {action.channel === 'call' && (
                        <button style={styles.actionBtn} onClick={() => handleCallScript(action)}>Open Call Script</button>
                      )}
                      {action.channel === 'nurture' && (
                        <button style={styles.viewBtn} onClick={() => navigate(`/lead/${action.lead.id}`)}>Review</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* OVERNIGHT REPLIES */}
          <Card style={{ marginTop: 16 }}>
            <div style={styles.sectionTitle}>Overnight Replies ({overnightReplies.length})</div>
            {overnightReplies.length === 0 ? (
              <p style={styles.emptyText}>No new replies overnight.</p>
            ) : (
              <div style={styles.replyList}>
                {overnightReplies.slice(0, 5).map(reply => (
                  <div key={reply.id} style={styles.replyCard}>
                    <div style={styles.replyTop}>
                      <span style={styles.replyPlatform}>
                        {reply.platform === 'email' ? '✉' : reply.platform === 'linkedin' ? '◈' : '◇'}
                      </span>
                      <span style={styles.replySender}>{reply.senderName}</span>
                      <Tag label={reply.sentiment} color={
                        reply.sentiment === 'positive' ? colors.green :
                        reply.sentiment === 'negative' ? colors.red :
                        reply.sentiment === 'inquiry' ? colors.amber :
                        colors.textSecondary
                      } />
                    </div>
                    <p style={styles.replyPreview}>{reply.content?.slice(0, 100)}{reply.content?.length > 100 ? '...' : ''}</p>
                    <button style={styles.viewBtn} onClick={() => navigate('/inbox')}>View + Reply</button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* CONTENT TODAY */}
          {todayPosts.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <div style={styles.sectionTitle}>Content Today</div>
              {todayPosts.map(post => (
                <div key={post.id} style={styles.postRow}>
                  <span style={styles.postIcon}>
                    {post.platform === 'linkedin' ? '◈' : post.platform === 'instagram' ? '◎' : post.platform === 'facebook' ? '▣' : '◉'}
                  </span>
                  <span style={styles.postTopic}>{post.topic || 'Untitled'}</span>
                  <Tag label={post.status} color={
                    post.status === 'published' ? colors.green :
                    post.status === 'scheduled' ? colors.blue :
                    colors.textMuted
                  } />
                  <button style={styles.viewBtn} onClick={() => navigate('/content')}>
                    {post.status === 'scheduled' ? 'Publish' : 'View'}
                  </button>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div style={styles.sideCol}>
          {/* PIPELINE PULSE */}
          <Card>
            <div style={styles.sectionTitle}>Pipeline Pulse</div>
            <div style={styles.funnel}>
              {STAGES_ORDER.map((stage, i) => (
                <div key={stage} style={styles.funnelRow}>
                  <span style={{ ...styles.funnelDot, background: stageColors[stage] }} />
                  <span style={styles.funnelLabel}>{stageLabels[stage]}</span>
                  <span style={styles.funnelCount}>{funnel[stage] || 0}</span>
                  {i < STAGES_ORDER.length - 1 && (
                    <span style={styles.funnelArrow}>→</span>
                  )}
                </div>
              ))}
            </div>
            {staleLeads.length > 0 && (
              <div style={styles.staleSection}>
                <div style={{ ...styles.sectionTitle, color: colors.red, marginTop: 12 }}>
                  Stale Leads ({staleLeads.length})
                </div>
                {staleLeads.slice(0, 5).map(l => (
                  <div key={l.id} style={styles.staleRow}>
                    <span style={styles.staleName}>{l.firmName}</span>
                    <span style={styles.staleDays}>{l.daysSince}d</span>
                    <button style={styles.staleBtn} onClick={() => handleStaleAction(l)}>Act</button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* SYSTEM INSIGHTS */}
          {insights.length > 0 && (
            <Card style={{ marginTop: 12 }}>
              <div style={styles.sectionTitle}>System Insights</div>
              {insights.slice(0, 3).map((insight, i) => (
                <div key={i} style={styles.insightCard}>
                  <span style={styles.insightIcon}>◈</span>
                  <span style={styles.insightText}>{insight}</span>
                </div>
              ))}
            </Card>
          )}

          {/* SEQUENCE HEALTH */}
          {sequenceHealth && (
            <Card style={{ marginTop: 12 }}>
              <div style={styles.sectionTitle}>Sequence Health</div>
              <StatRow label="Active" value={sequenceHealth.activeSequences} />
              <StatRow label="Stalled" value={sequenceHealth.stalledSequences} color={sequenceHealth.stalledSequences > 0 ? colors.red : null} />
              <StatRow label="Completed (week)" value={sequenceHealth.completedThisWeek} />
              {sequenceHealth.topDropOffDay > 0 && (
                <StatRow label="Drop-off point" value={`Day ${sequenceHealth.topDropOffDay}`} color={colors.amber} />
              )}
            </Card>
          )}
        </div>
      </div>

      {/* EMAIL MODAL */}
      {emailModal && (
        <div style={styles.overlay} onClick={() => { setEmailModal(null); setEmailDraft(null); }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Email — {emailModal.lead.firmName} · Day {emailModal.day}</h3>
              <button style={styles.closeBtn} onClick={() => { setEmailModal(null); setEmailDraft(null); }}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {loading ? <div style={styles.loadingText}>Generating email...</div> : emailDraft ? (
                <>
                  <label style={styles.fieldLabel}>Subject</label>
                  <input style={styles.input} value={emailDraft.subject} onChange={e => setEmailDraft({ ...emailDraft, subject: e.target.value })} />
                  <label style={{ ...styles.fieldLabel, marginTop: 12 }}>Body</label>
                  <textarea style={styles.textarea} value={emailDraft.body} onChange={e => setEmailDraft({ ...emailDraft, body: e.target.value })} rows={12} />
                </>
              ) : <div style={styles.loadingText}>Failed to generate.</div>}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => { setEmailModal(null); setEmailDraft(null); }}>Cancel</button>
              {emailDraft && <button style={styles.sendBtn} onClick={handleSendEmail} disabled={loading}>Send Now</button>}
            </div>
          </div>
        </div>
      )}

      {/* LINKEDIN MODAL */}
      {linkedinModal && (
        <div style={styles.overlay} onClick={() => { setLinkedinModal(null); setLinkedinDraft(null); }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>LinkedIn — {linkedinModal.lead.firmName}</h3>
              <button style={styles.closeBtn} onClick={() => { setLinkedinModal(null); setLinkedinDraft(null); }}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {loading ? <div style={styles.loadingText}>Drafting message...</div> : linkedinDraft ? (
                <>
                  <label style={styles.fieldLabel}>Message ({linkedinDraft.characterCount || 0} chars)</label>
                  <textarea style={styles.textarea} value={linkedinDraft.message} onChange={e => setLinkedinDraft({ ...linkedinDraft, message: e.target.value, characterCount: e.target.value.length })} rows={6} />
                  {linkedinDraft.hookUsed && (
                    <div style={{ marginTop: 8 }}>
                      <Tag label={`Hook: ${linkedinDraft.hookUsed}`} color={colors.amber} />
                    </div>
                  )}
                  {linkedinDraft.suggestedTiming && (
                    <div style={{ marginTop: 4 }}>
                      <Tag label={`Best time: ${linkedinDraft.suggestedTiming}`} color={colors.blue} />
                    </div>
                  )}
                </>
              ) : <div style={styles.loadingText}>Failed to generate.</div>}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => { setLinkedinModal(null); setLinkedinDraft(null); }}>Cancel</button>
              {linkedinDraft && <button style={styles.sendBtn} onClick={handleCopyLinkedIn}>Copy + Open LinkedIn</button>}
            </div>
          </div>
        </div>
      )}

      {/* CALL SCRIPT MODAL */}
      {callModal && callScript && (
        <CallScriptModal
          lead={callModal.lead}
          script={callScript}
          onClose={() => { setCallModal(null); setCallScript(null); }}
          onLogCall={handleLogCall}
        />
      )}
    </div>
  );
}

function StatusPill({ label, value, color }) {
  return (
    <div style={spStyles.pill}>
      <span style={spStyles.label}>{label}</span>
      <span style={{ ...spStyles.value, color }}>{value}</span>
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div style={spStyles.statRow}>
      <span style={spStyles.statLabel}>{label}</span>
      <span style={{ ...spStyles.statValue, color: color || colors.textPrimary }}>{value}</span>
    </div>
  );
}

const spStyles = {
  pill: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 14px', background: colors.bg3, borderRadius: 6, border: `1px solid ${colors.border}` },
  label: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' },
  value: { fontSize: 18, fontWeight: 700, marginTop: 2 },
  statRow: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 12 },
  statLabel: { color: colors.textSecondary },
  statValue: { fontWeight: 600 },
};

const styles = {
  container: { flex: 1, overflow: 'auto', fontFamily: font },
  headerSection: { padding: '20px 24px', borderBottom: `1px solid ${colors.border}`, background: colors.bg1 },
  greetingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: 700, color: colors.textPrimary, margin: 0, fontFamily: font },
  date: { fontSize: 12, color: colors.textSecondary },
  northStar: { textAlign: 'center' },
  nsLabel: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em' },
  nsValue: { fontSize: 36, fontWeight: 700, color: colors.amber },
  nsTarget: { fontSize: 11, color: colors.textMuted },
  statusRow: { display: 'flex', gap: 10 },
  grid: { display: 'flex', gap: 20, padding: 24 },
  mainCol: { flex: 1, minWidth: 0 },
  sideCol: { width: 280, flexShrink: 0 },
  sectionTitle: { fontSize: 11, fontWeight: 600, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 },
  emptyText: { fontSize: 13, color: colors.textMuted, margin: 0 },
  actionList: { display: 'flex', flexDirection: 'column', gap: 8 },
  actionCard: { display: 'flex', alignItems: 'center', gap: 12, background: colors.bg4, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 12 },
  actionLeft: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 },
  actionFirm: { fontSize: 13, fontWeight: 600, color: colors.textPrimary },
  actionContact: { fontSize: 11, color: colors.textSecondary },
  actionCenter: { flex: 1, display: 'flex', alignItems: 'center', gap: 8 },
  channelIcon: { fontSize: 14, color: colors.amber },
  actionLabel: { fontSize: 12, color: colors.textPrimary },
  actionReason: { fontSize: 11, color: colors.textSecondary },
  actionRight: { flexShrink: 0 },
  actionBtn: { background: colors.amber, color: colors.bg0, border: 'none', borderRadius: 4, padding: '5px 12px', fontSize: 11, fontWeight: 600, fontFamily: font, cursor: 'pointer' },
  viewBtn: { background: colors.bg3, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: 4, padding: '4px 10px', fontSize: 11, fontFamily: font, cursor: 'pointer' },
  replyList: { display: 'flex', flexDirection: 'column', gap: 8 },
  replyCard: { background: colors.bg4, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 10 },
  replyTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  replyPlatform: { fontSize: 12, color: colors.amber },
  replySender: { fontSize: 13, fontWeight: 600, color: colors.textPrimary, flex: 1 },
  replyPreview: { fontSize: 12, color: colors.textSecondary, margin: '0 0 6px', lineHeight: 1.4 },
  postRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${colors.border}` },
  postIcon: { fontSize: 12, color: colors.amber },
  postTopic: { flex: 1, fontSize: 12, color: colors.textPrimary },
  funnel: { display: 'flex', flexDirection: 'column', gap: 4 },
  funnelRow: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 },
  funnelDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  funnelLabel: { color: colors.textSecondary, flex: 1 },
  funnelCount: { fontWeight: 600, color: colors.textPrimary, minWidth: 20, textAlign: 'right' },
  funnelArrow: { color: colors.textMuted, fontSize: 10 },
  staleSection: {},
  staleRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 11 },
  staleName: { flex: 1, color: colors.red },
  staleDays: { color: colors.red, fontWeight: 600 },
  staleBtn: { background: colors.amber, color: colors.bg0, border: 'none', borderRadius: 3, padding: '2px 8px', fontSize: 10, fontWeight: 600, fontFamily: font, cursor: 'pointer' },
  insightCard: { display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', borderBottom: `1px solid ${colors.border}` },
  insightIcon: { color: colors.purple, fontSize: 12, flexShrink: 0, marginTop: 2 },
  insightText: { fontSize: 12, color: colors.textPrimary, lineHeight: 1.4 },
  // Modals
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: colors.bg2, border: `1px solid ${colors.border}`, borderRadius: 12, width: 600, maxHeight: '80vh', overflow: 'auto', fontFamily: font },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${colors.border}` },
  modalTitle: { fontSize: 14, fontWeight: 700, color: colors.textPrimary, margin: 0, fontFamily: font },
  closeBtn: { background: 'none', border: 'none', color: colors.textSecondary, fontSize: 16, cursor: 'pointer', fontFamily: font },
  modalBody: { padding: 20 },
  loadingText: { fontSize: 13, color: colors.amber, textAlign: 'center', padding: 20 },
  fieldLabel: { display: 'block', fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 },
  input: { width: '100%', background: colors.bg4, border: `1px solid ${colors.border}`, borderRadius: 4, padding: '8px 10px', fontSize: 13, color: colors.textPrimary, fontFamily: font, outline: 'none' },
  textarea: { width: '100%', background: colors.bg4, border: `1px solid ${colors.border}`, borderRadius: 4, padding: '8px 10px', fontSize: 13, color: colors.textPrimary, fontFamily: font, outline: 'none', resize: 'vertical', lineHeight: 1.5 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: `1px solid ${colors.border}` },
  cancelBtn: { background: colors.bg4, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 16px', fontSize: 13, color: colors.textSecondary, fontFamily: font, cursor: 'pointer' },
  sendBtn: { background: colors.amber, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: colors.bg0, fontFamily: font, cursor: 'pointer' },
};
