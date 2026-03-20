import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, font } from '../styles/tokens';
import Card from '../components/Card';
import Tag from '../components/Tag';

const PLATFORM_ICONS = { email: '✉', linkedin: '◈', instagram: '◎', facebook: '▣', google: '◉' };
const SENTIMENT_COLORS = {
  positive: colors.green,
  neutral: colors.textSecondary,
  negative: colors.red,
  inquiry: colors.amber,
};

const FILTERS = ['all', 'unread', 'positive', 'inquiry', 'needs-reply'];
const PLATFORM_FILTERS = ['all', 'email', 'linkedin', 'instagram', 'facebook', 'google'];

export default function UnifiedInbox({ messages, updateMessage, markRead, leads }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const filtered = (messages || []).filter(m => {
    if (filter === 'unread' && m.read) return false;
    if (filter === 'positive' && m.sentiment !== 'positive') return false;
    if (filter === 'inquiry' && m.sentiment !== 'inquiry') return false;
    if (filter === 'needs-reply' && m.repliedAt) return false;
    if (platformFilter !== 'all' && m.platform !== platformFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (m.senderName?.toLowerCase().includes(q) ||
              m.content?.toLowerCase().includes(q) ||
              m.subject?.toLowerCase().includes(q));
    }
    return true;
  }).sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

  function handleSelect(msg) {
    setSelected(msg);
    setReplyText(msg.draft || '');
    if (!msg.read && markRead) markRead(msg.id);
  }

  async function handleGenerateDraft(msg) {
    setDraftLoading(true);
    const lead = msg.leadId && leads ? leads.find(l => l.id === msg.leadId) : null;

    try {
      const res = await fetch('/api/inbox-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg.content,
          platform: msg.platform,
          sentiment: msg.sentiment,
          leadContext: lead ? {
            firmName: lead.firmName,
            practiceArea: lead.practiceArea,
            tier: lead.tier,
            city: lead.city,
            county: lead.county,
          } : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReplyText(data.draft || '');
        if (updateMessage) updateMessage(msg.id, { draft: data.draft });
      }
    } catch (err) {
      console.error('Draft generation failed:', err);
    }
    setDraftLoading(false);
  }

  async function handleSendReply(msg) {
    if (!replyText.trim()) return;
    setSending(true);

    try {
      if (msg.platform === 'email') {
        await fetch('/api/email-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: msg.senderEmail,
            subject: `Re: ${msg.subject || ''}`,
            body: replyText,
            leadId: msg.leadId,
          }),
        });
      }
      // For social platforms, mark as needing manual send
      if (updateMessage) {
        updateMessage(msg.id, {
          repliedAt: new Date().toISOString(),
          draft: replyText,
        });
      }
      setSelected({ ...msg, repliedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Reply send failed:', err);
    }
    setSending(false);
  }

  return (
    <div style={styles.container}>
      <div style={styles.topbar}>
        <h1 style={styles.title}>Unified Inbox</h1>
        <div style={styles.filterRow}>
          {FILTERS.map(f => (
            <button
              key={f}
              style={{
                ...styles.filterBtn,
                background: filter === f ? colors.bg4 : 'transparent',
                color: filter === f ? colors.amber : colors.textSecondary,
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'needs-reply' ? 'Needs Reply' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.subBar}>
        <div style={styles.platformFilters}>
          {PLATFORM_FILTERS.map(p => (
            <button
              key={p}
              style={{
                ...styles.platBtn,
                color: platformFilter === p ? colors.amber : colors.textMuted,
              }}
              onClick={() => setPlatformFilter(p)}
            >
              {p === 'all' ? 'All' : `${PLATFORM_ICONS[p] || ''} ${p}`}
            </button>
          ))}
        </div>
        <input
          style={styles.searchInput}
          placeholder="Search messages..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={styles.layout}>
        {/* Message List */}
        <div style={styles.listPanel}>
          {filtered.length === 0 ? (
            <div style={styles.emptyList}>
              <span style={{ color: colors.textMuted, fontSize: 13 }}>No messages match filters.</span>
            </div>
          ) : (
            filtered.map(msg => (
              <div
                key={msg.id}
                style={{
                  ...styles.msgRow,
                  background: selected?.id === msg.id ? colors.bg4 : 'transparent',
                  borderLeft: !msg.read ? `3px solid ${colors.amber}` : '3px solid transparent',
                }}
                onClick={() => handleSelect(msg)}
              >
                <div style={styles.msgRowTop}>
                  <span style={styles.msgPlatformIcon}>{PLATFORM_ICONS[msg.platform] || '◇'}</span>
                  <span style={styles.msgSender}>{msg.senderName}</span>
                  <Tag label={msg.sentiment} color={SENTIMENT_COLORS[msg.sentiment]} />
                </div>
                <div style={styles.msgPreview}>
                  {msg.subject && <span style={styles.msgSubject}>{msg.subject} — </span>}
                  {msg.content?.slice(0, 80)}{msg.content?.length > 80 ? '...' : ''}
                </div>
                <div style={styles.msgTime}>
                  {new Date(msg.receivedAt).toLocaleDateString()} {new Date(msg.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.repliedAt && <Tag label="Replied" color={colors.green} />}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div style={styles.detailPanel}>
          {!selected ? (
            <div style={styles.emptyDetail}>
              <span style={{ color: colors.textMuted, fontSize: 13 }}>Select a message to view</span>
            </div>
          ) : (
            <div style={styles.detailContent}>
              <div style={styles.detailHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{PLATFORM_ICONS[selected.platform] || '◇'}</span>
                  <Tag label={selected.platform} color={colors.blue} />
                  <Tag label={selected.sentiment} color={SENTIMENT_COLORS[selected.sentiment]} />
                </div>
                {selected.leadId && (
                  <button
                    style={styles.viewLeadBtn}
                    onClick={() => navigate(`/lead/${selected.leadId}`)}
                  >
                    View Lead
                  </button>
                )}
              </div>

              <div style={styles.detailFrom}>
                <span style={styles.fromLabel}>From:</span>
                <span style={styles.fromValue}>{selected.senderName}</span>
                {selected.senderEmail && (
                  <span style={styles.fromEmail}>&lt;{selected.senderEmail}&gt;</span>
                )}
              </div>

              {selected.subject && (
                <div style={styles.detailSubject}>{selected.subject}</div>
              )}

              <Card style={{ marginTop: 12 }}>
                <p style={styles.messageBody}>{selected.content}</p>
              </Card>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={styles.sectionTitle}>Reply</div>
                  <button style={styles.draftBtn} onClick={() => handleGenerateDraft(selected)} disabled={draftLoading}>
                    {draftLoading ? 'Drafting...' : 'AI Draft'}
                  </button>
                </div>
                <textarea
                  style={styles.replyTextarea}
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={6}
                  placeholder="Write your reply..."
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                  {!selected.leadId && (
                    <button style={styles.markLeadBtn}>
                      Mark as Lead
                    </button>
                  )}
                  <button
                    style={styles.sendReplyBtn}
                    onClick={() => handleSendReply(selected)}
                    disabled={sending || !replyText.trim()}
                  >
                    {sending ? 'Sending...' : selected.repliedAt ? 'Send Again' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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
    padding: '14px 24px',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg1,
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: 0,
    fontFamily: font,
  },
  filterRow: {
    display: 'flex',
    gap: 4,
  },
  filterBtn: {
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 11,
    fontFamily: font,
    cursor: 'pointer',
  },
  subBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 24px',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg1,
  },
  platformFilters: {
    display: 'flex',
    gap: 8,
  },
  platBtn: {
    background: 'none',
    border: 'none',
    fontSize: 11,
    fontFamily: font,
    cursor: 'pointer',
    padding: '2px 4px',
  },
  searchInput: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '5px 10px',
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: font,
    outline: 'none',
    width: 200,
  },
  layout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  listPanel: {
    width: 380,
    borderRight: `1px solid ${colors.border}`,
    overflow: 'auto',
    flexShrink: 0,
  },
  emptyList: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  msgRow: {
    padding: '12px 16px',
    borderBottom: `1px solid ${colors.border}`,
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  msgRowTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  msgPlatformIcon: {
    fontSize: 12,
    color: colors.amber,
  },
  msgSender: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
    flex: 1,
  },
  msgPreview: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 1.4,
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  msgSubject: {
    fontWeight: 600,
    color: colors.textPrimary,
  },
  msgTime: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 10,
    color: colors.textMuted,
  },
  detailPanel: {
    flex: 1,
    overflow: 'auto',
  },
  emptyDetail: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  detailContent: {
    padding: 24,
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewLeadBtn: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '4px 12px',
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: font,
    cursor: 'pointer',
  },
  detailFrom: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  fromLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  fromValue: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  fromEmail: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  detailSubject: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  messageBody: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 1.6,
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  draftBtn: {
    background: colors.purple,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: font,
    cursor: 'pointer',
  },
  replyTextarea: {
    width: '100%',
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '10px 12px',
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: font,
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.5,
  },
  markLeadBtn: {
    background: 'none',
    border: `1px solid ${colors.amber}40`,
    borderRadius: 4,
    padding: '6px 14px',
    fontSize: 12,
    color: colors.amber,
    fontFamily: font,
    cursor: 'pointer',
  },
  sendReplyBtn: {
    background: colors.amber,
    border: 'none',
    borderRadius: 6,
    padding: '6px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: colors.bg0,
    fontFamily: font,
    cursor: 'pointer',
  },
};
