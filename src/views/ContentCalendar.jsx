import { useState, useMemo } from 'react';
import { colors, font } from '../styles/tokens';
import Card from '../components/Card';
import Tag from '../components/Tag';
import { getWeekString, getWeekDates } from '../store/posts';
import { getContentThemes } from '../engine/learning';

const PLATFORMS = ['all', 'linkedin', 'instagram', 'facebook', 'google'];
const PLATFORM_ICONS = { linkedin: '◈', instagram: '◎', facebook: '▣', google: '◉' };
const STATUS_COLORS = {
  draft: colors.textMuted,
  scheduled: colors.blue,
  published: colors.green,
  failed: colors.red,
};
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TOPICS = [
  'FL CONDO Act compliance burden',
  'HOA foreclosure lis pendens deadline risk',
  'Eviction notice automation',
  'Morning matter overview for solo attorneys',
  'Revenue leakage from unbilled research time',
  'Batch HOA intake workflow',
  'LegalEdge case study: 120 matters, 1 attorney',
  'FL real estate litigation market trends',
];

export default function ContentCalendar({ posts, addPost, updatePost, deletePost }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [selectedPost, setSelectedPost] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generateTheme, setGenerateTheme] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState(null);

  const currentWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return getWeekString(d);
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(currentWeek), [currentWeek]);

  const weekPosts = useMemo(() => {
    let filtered = (posts || []).filter(p => p.calendarWeek === currentWeek);
    if (platformFilter !== 'all') {
      filtered = filtered.filter(p => p.platform === platformFilter);
    }
    return filtered;
  }, [posts, currentWeek, platformFilter]);

  function getPostsForDay(date) {
    const dateStr = date.toISOString().split('T')[0];
    return weekPosts.filter(p => {
      if (!p.scheduledAt) return false;
      return p.scheduledAt.split('T')[0] === dateStr;
    });
  }

  async function handleGenerateWeek() {
    setGenerating(true);
    const themes = getContentThemes();
    const preview = [];

    const platforms = ['linkedin', 'instagram', 'facebook', 'google', 'linkedin', 'facebook', 'linkedin'];

    for (let i = 0; i < 7; i++) {
      const platform = platforms[i];
      const topic = TOPICS[i % TOPICS.length];
      const date = new Date(weekDates[i]);
      date.setHours(9, 0, 0, 0);

      try {
        const res = await fetch('/api/social-write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform,
            topic,
            weekTheme: generateTheme || themes[0] || '',
            winningTopics: themes,
            targetICP: 'Solo and small firm HOA foreclosure and eviction attorneys in Miami-Dade and Broward',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          preview.push({
            ...data,
            platform,
            scheduledAt: date.toISOString(),
            calendarWeek: currentWeek,
            claudeGenerated: true,
            status: 'draft',
          });
        } else {
          preview.push({
            platform,
            topic,
            content: `[Generation failed for ${DAY_NAMES[i]}]`,
            hashtags: [],
            scheduledAt: date.toISOString(),
            calendarWeek: currentWeek,
            claudeGenerated: true,
            status: 'draft',
          });
        }
      } catch {
        preview.push({
          platform,
          topic,
          content: `[Generation failed for ${DAY_NAMES[i]}]`,
          hashtags: [],
          scheduledAt: date.toISOString(),
          calendarWeek: currentWeek,
          claudeGenerated: true,
          status: 'draft',
        });
      }
    }

    setGeneratedPreview(preview);
    setGenerating(false);
  }

  function confirmGenerated() {
    if (!generatedPreview || !addPost) return;
    for (const post of generatedPreview) {
      addPost(post);
    }
    setGeneratedPreview(null);
    setShowGenerate(false);
  }

  function handleAddPost(dayIndex) {
    if (!addPost) return;
    const date = new Date(weekDates[dayIndex]);
    date.setHours(9, 0, 0, 0);
    const newPost = addPost({
      platform: 'linkedin',
      content: '',
      topic: '',
      scheduledAt: date.toISOString(),
      calendarWeek: currentWeek,
      status: 'draft',
    });
    setSelectedPost(newPost);
  }

  async function handlePublish(post) {
    if (!updatePost) return;
    updatePost(post.id, { status: 'scheduled' });

    try {
      const res = await fetch('/api/social-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: post.platform,
          content: post.content + (post.hashtags?.length ? '\n\n' + post.hashtags.map(h => `#${h}`).join(' ') : ''),
          postId: post.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        updatePost(post.id, {
          status: 'published',
          publishedAt: data.publishedAt,
          platformPostId: data.platformPostId,
        });
      } else {
        updatePost(post.id, { status: 'failed' });
      }
    } catch {
      updatePost(post.id, { status: 'failed' });
    }
    setSelectedPost(null);
  }

  // Platform performance summary
  const platformStats = useMemo(() => {
    const stats = {};
    for (const p of (posts || [])) {
      if (p.status !== 'published') continue;
      if (!stats[p.platform]) stats[p.platform] = { posts: 0, totalEng: 0, totalImp: 0, topics: {} };
      stats[p.platform].posts++;
      stats[p.platform].totalEng += p.metrics?.engagements || 0;
      stats[p.platform].totalImp += p.metrics?.impressions || 0;
      const t = p.topic || 'other';
      stats[p.platform].topics[t] = (stats[p.platform].topics[t] || 0) + (p.metrics?.engagements || 0);
    }
    return stats;
  }, [posts]);

  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div style={styles.container}>
      <div style={styles.topbar}>
        <div style={styles.topLeft}>
          <h1 style={styles.title}>Content Calendar</h1>
          <div style={styles.weekNav}>
            <button style={styles.weekBtn} onClick={() => setWeekOffset(w => w - 1)}>←</button>
            <span style={styles.weekLabel}>{weekLabel}</span>
            <button style={styles.weekBtn} onClick={() => setWeekOffset(w => w + 1)}>→</button>
          </div>
        </div>
        <button style={styles.generateBtn} onClick={() => setShowGenerate(true)}>
          Generate Week
        </button>
      </div>

      <div style={styles.filterBar}>
        {PLATFORMS.map(p => (
          <button
            key={p}
            style={{
              ...styles.filterBtn,
              background: platformFilter === p ? colors.bg4 : 'transparent',
              color: platformFilter === p ? colors.amber : colors.textSecondary,
            }}
            onClick={() => setPlatformFilter(p)}
          >
            {p === 'all' ? 'All' : `${PLATFORM_ICONS[p] || ''} ${p.charAt(0).toUpperCase() + p.slice(1)}`}
          </button>
        ))}
      </div>

      <div style={styles.calendarGrid}>
        {DAY_NAMES.map((day, i) => (
          <div key={day} style={styles.dayColumn}>
            <div style={styles.dayHeader}>
              <span style={styles.dayName}>{day}</span>
              <span style={styles.dayDate}>{weekDates[i].getDate()}</span>
            </div>
            <div style={styles.dayBody}>
              {getPostsForDay(weekDates[i]).map(post => (
                <div
                  key={post.id}
                  style={styles.postCard}
                  onClick={() => setSelectedPost(post)}
                >
                  <div style={styles.postTop}>
                    <span style={styles.platformIcon}>{PLATFORM_ICONS[post.platform] || '◇'}</span>
                    <Tag label={post.status} color={STATUS_COLORS[post.status]} />
                  </div>
                  <span style={styles.postTopic}>{post.topic || 'Untitled'}</span>
                </div>
              ))}
              <button style={styles.addBtn} onClick={() => handleAddPost(i)}>
                + Add Post
              </button>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(platformStats).length > 0 && (
        <div style={styles.perfSection}>
          <div style={styles.sectionTitle}>Platform Performance</div>
          <div style={styles.perfGrid}>
            {Object.entries(platformStats).map(([platform, stat]) => (
              <Card key={platform} style={styles.perfCard}>
                <div style={styles.perfPlatform}>
                  {PLATFORM_ICONS[platform] || '◇'} {platform}
                </div>
                <div style={styles.perfStat}>
                  <span style={styles.perfLabel}>Posts</span>
                  <span style={styles.perfValue}>{stat.posts}</span>
                </div>
                <div style={styles.perfStat}>
                  <span style={styles.perfLabel}>Avg Engagement</span>
                  <span style={styles.perfValue}>
                    {stat.totalImp > 0
                      ? ((stat.totalEng / stat.totalImp) * 100).toFixed(1) + '%'
                      : '—'}
                  </span>
                </div>
                <div style={styles.perfStat}>
                  <span style={styles.perfLabel}>Best Topic</span>
                  <span style={styles.perfValue}>
                    {Object.entries(stat.topics).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Post Detail Panel */}
      {selectedPost && (
        <div style={styles.overlay} onClick={() => setSelectedPost(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{PLATFORM_ICONS[selectedPost.platform] || '◇'}</span>
                <Tag label={selectedPost.platform} color={colors.blue} />
                <Tag label={selectedPost.status} color={STATUS_COLORS[selectedPost.status]} />
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedPost(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <label style={styles.fieldLabel}>Topic</label>
              <input
                style={styles.input}
                value={selectedPost.topic || ''}
                onChange={e => {
                  setSelectedPost({ ...selectedPost, topic: e.target.value });
                  if (updatePost) updatePost(selectedPost.id, { topic: e.target.value });
                }}
              />
              <label style={{ ...styles.fieldLabel, marginTop: 12 }}>Content</label>
              <textarea
                style={styles.textarea}
                value={selectedPost.content || ''}
                onChange={e => {
                  setSelectedPost({ ...selectedPost, content: e.target.value });
                  if (updatePost) updatePost(selectedPost.id, { content: e.target.value });
                }}
                rows={10}
              />
              <label style={{ ...styles.fieldLabel, marginTop: 12 }}>Hashtags</label>
              <input
                style={styles.input}
                value={(selectedPost.hashtags || []).join(', ')}
                onChange={e => {
                  const tags = e.target.value.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
                  setSelectedPost({ ...selectedPost, hashtags: tags });
                  if (updatePost) updatePost(selectedPost.id, { hashtags: tags });
                }}
                placeholder="comma separated"
              />
              {selectedPost.status === 'published' && selectedPost.metrics && (
                <div style={{ marginTop: 16 }}>
                  <div style={styles.sectionTitle}>Metrics</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <MiniStat label="Impressions" value={selectedPost.metrics.impressions} />
                    <MiniStat label="Engagement" value={`${(selectedPost.metrics.engagementRate * 100).toFixed(1)}%`} />
                    <MiniStat label="Clicks" value={selectedPost.metrics.clicks} />
                  </div>
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button
                style={styles.deleteBtn}
                onClick={() => { if (deletePost) deletePost(selectedPost.id); setSelectedPost(null); }}
              >
                Delete
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedPost.status === 'draft' && (
                  <button
                    style={styles.scheduleBtn}
                    onClick={() => { if (updatePost) updatePost(selectedPost.id, { status: 'scheduled' }); setSelectedPost(null); }}
                  >
                    Schedule
                  </button>
                )}
                {(selectedPost.status === 'draft' || selectedPost.status === 'scheduled') && (
                  <button style={styles.publishBtn} onClick={() => handlePublish(selectedPost)}>
                    Publish Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Week Modal */}
      {showGenerate && (
        <div style={styles.overlay} onClick={() => { setShowGenerate(false); setGeneratedPreview(null); }}>
          <div style={{ ...styles.modal, maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Generate Week: {weekLabel}</h3>
              <button style={styles.closeBtn} onClick={() => { setShowGenerate(false); setGeneratedPreview(null); }}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {!generatedPreview ? (
                <>
                  <label style={styles.fieldLabel}>Week Theme (optional)</label>
                  <input
                    style={styles.input}
                    value={generateTheme}
                    onChange={e => setGenerateTheme(e.target.value)}
                    placeholder="e.g. FL CONDO Act updates"
                  />
                  <p style={{ fontSize: 12, color: colors.textSecondary, marginTop: 12 }}>
                    Claude will plan 7 posts across LinkedIn, Instagram, Facebook, and Google — one per day, optimized for your ICP.
                  </p>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {generatedPreview.map((post, i) => (
                    <div key={i} style={styles.previewCard}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Tag label={DAY_NAMES[i]} color={colors.textSecondary} />
                        <span>{PLATFORM_ICONS[post.platform] || '◇'}</span>
                        <Tag label={post.platform} color={colors.blue} />
                        <span style={{ fontSize: 11, color: colors.textMuted }}>{post.topic}</span>
                      </div>
                      <p style={{ fontSize: 12, color: colors.textPrimary, margin: 0, lineHeight: 1.4, maxHeight: 60, overflow: 'hidden' }}>
                        {post.content?.slice(0, 150)}{post.content?.length > 150 ? '...' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.cancelBtn} onClick={() => { setShowGenerate(false); setGeneratedPreview(null); }}>
                Cancel
              </button>
              {!generatedPreview ? (
                <button style={styles.publishBtn} onClick={handleGenerateWeek} disabled={generating}>
                  {generating ? 'Generating...' : 'Generate 7 Posts'}
                </button>
              ) : (
                <button style={styles.publishBtn} onClick={confirmGenerated}>
                  Confirm & Save All
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>{value}</div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'auto',
    fontFamily: font,
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg1,
    flexShrink: 0,
  },
  topLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: 0,
    fontFamily: font,
  },
  weekNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  weekBtn: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: font,
    cursor: 'pointer',
  },
  weekLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    minWidth: 170,
    textAlign: 'center',
  },
  generateBtn: {
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
  filterBar: {
    display: 'flex',
    gap: 4,
    padding: '8px 24px',
    borderBottom: `1px solid ${colors.border}`,
    background: colors.bg1,
  },
  filterBtn: {
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: '4px 12px',
    fontSize: 11,
    fontFamily: font,
    cursor: 'pointer',
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 1,
    background: colors.border,
    flex: 1,
    minHeight: 0,
  },
  dayColumn: {
    background: colors.bg2,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 200,
  },
  dayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    borderBottom: `1px solid ${colors.border}`,
  },
  dayName: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
  },
  dayDate: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.textPrimary,
  },
  dayBody: {
    flex: 1,
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  postCard: {
    background: colors.bg3,
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: 8,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  postTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  platformIcon: {
    fontSize: 12,
    color: colors.amber,
  },
  postTopic: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 1.3,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  addBtn: {
    background: 'none',
    border: `1px dashed ${colors.border}`,
    borderRadius: 4,
    padding: '6px',
    fontSize: 10,
    color: colors.textMuted,
    cursor: 'pointer',
    fontFamily: font,
    marginTop: 'auto',
  },
  perfSection: {
    padding: '16px 24px',
    borderTop: `1px solid ${colors.border}`,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10,
  },
  perfGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },
  perfCard: {
    padding: 12,
  },
  perfPlatform: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  perfStat: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    fontSize: 11,
  },
  perfLabel: {
    color: colors.textSecondary,
  },
  perfValue: {
    color: colors.textPrimary,
    fontWeight: 500,
    maxWidth: 100,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'right',
  },
  previewCard: {
    background: colors.bg4,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: 10,
  },
  // Modal styles
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
  modalFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: `1px solid ${colors.border}`,
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
  deleteBtn: {
    background: 'none',
    border: `1px solid ${colors.red}40`,
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    color: colors.red,
    fontFamily: font,
    cursor: 'pointer',
  },
  scheduleBtn: {
    background: colors.blue,
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    fontFamily: font,
    cursor: 'pointer',
  },
  publishBtn: {
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
