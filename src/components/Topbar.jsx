import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors, font } from '../styles/tokens';
import Tag from './Tag';

const VIEW_TITLES = {
  '/': 'Pipeline',
  '/email-performance': 'Email Performance',
  '/morning': 'Morning Briefing',
  '/content': 'Content Calendar',
  '/inbox': 'Unified Inbox',
  '/reports': 'Weekly Report',
};

export default function Topbar({ leads, notificationCount, onBellClick, systemStatus }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  const title = location.pathname.startsWith('/lead/')
    ? 'Lead Profile'
    : VIEW_TITLES[location.pathname] || 'SalesEdge';

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const results = searchOpen && searchQuery.length >= 2
    ? (leads || []).filter(l => {
        const q = searchQuery.toLowerCase();
        return (l.firmName?.toLowerCase().includes(q) ||
                l.contactName?.toLowerCase().includes(q) ||
                l.email?.toLowerCase().includes(q) ||
                l.county?.toLowerCase().includes(q));
      }).slice(0, 8)
    : [];

  function handleSelect(lead) {
    navigate(`/lead/${lead.id}`);
    setSearchOpen(false);
    setSearchQuery('');
  }

  const statusColor = systemStatus === 'error' ? colors.red
    : systemStatus === 'warning' ? colors.amber
    : colors.green;

  return (
    <div style={styles.topbar}>
      <div style={styles.left}>
        <span style={styles.title}>{title}</span>
      </div>

      <div style={styles.center}>
        {searchOpen ? (
          <div style={styles.searchWrap}>
            <input
              ref={searchRef}
              style={styles.searchInput}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search leads..."
              onBlur={() => setTimeout(() => { setSearchOpen(false); setSearchQuery(''); }, 200)}
            />
            {results.length > 0 && (
              <div style={styles.searchResults}>
                {results.map(lead => (
                  <div
                    key={lead.id}
                    style={styles.searchResult}
                    onMouseDown={() => handleSelect(lead)}
                  >
                    <span style={styles.resultFirm}>{lead.firmName}</span>
                    <span style={styles.resultContact}>{lead.contactName || '—'}</span>
                    <Tag label={`T${lead.tier}`} color={colors.amber} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button style={styles.searchBtn} onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }}>
            Search leads... <span style={styles.shortcut}>⌘K</span>
          </button>
        )}
      </div>

      <div style={styles.right}>
        <span style={{ ...styles.statusDot, background: statusColor }} />
        <button style={styles.bellBtn} onClick={onBellClick}>
          ◎
          {notificationCount > 0 && (
            <span style={styles.bellBadge}>{notificationCount}</span>
          )}
        </button>
        <span style={styles.version}>v0.4.0</span>
      </div>
    </div>
  );
}

const styles = {
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    height: 44,
    background: colors.bg1,
    borderBottom: `1px solid ${colors.border}`,
    fontFamily: font,
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 160,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
  },
  center: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    maxWidth: 400,
    position: 'relative',
  },
  searchBtn: {
    background: colors.bg3,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '5px 14px',
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: font,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shortcut: {
    fontSize: 10,
    color: colors.textMuted,
    background: colors.bg4,
    padding: '1px 5px',
    borderRadius: 3,
    border: `1px solid ${colors.border}`,
  },
  searchWrap: {
    width: '100%',
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    background: colors.bg3,
    border: `1px solid ${colors.amber}50`,
    borderRadius: 6,
    padding: '5px 14px',
    fontSize: 12,
    color: colors.textPrimary,
    fontFamily: font,
    outline: 'none',
  },
  searchResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    background: colors.bg2,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  searchResult: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 14px',
    cursor: 'pointer',
    borderBottom: `1px solid ${colors.border}`,
    transition: 'background 0.1s',
  },
  resultFirm: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textPrimary,
    flex: 1,
  },
  resultContact: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 120,
    justifyContent: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  bellBtn: {
    background: 'none',
    border: 'none',
    color: colors.textSecondary,
    fontSize: 16,
    cursor: 'pointer',
    position: 'relative',
    fontFamily: font,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    background: colors.red,
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    padding: '0 4px',
    borderRadius: 6,
    minWidth: 14,
    textAlign: 'center',
  },
  version: {
    fontSize: 10,
    color: colors.textMuted,
    background: colors.bg4,
    padding: '2px 6px',
    borderRadius: 4,
    border: `1px solid ${colors.border}`,
  },
};
