import { NavLink } from 'react-router-dom';
import { colors, font } from '../styles/tokens';
import { getTotalSends } from '../engine/learning';

export default function Sidebar({ todayActionCount, scheduledPostCount, unreadInboxCount, hasUnreadReport, lastReportDate }) {
  const totalSends = getTotalSends();

  const NAV_ITEMS = [
    { path: '/', label: 'Pipeline', icon: '▤' },
    {
      path: '/email-performance', label: 'Email Performance', icon: '◎',
      badge: totalSends > 0 ? totalSends : null,
      badgeColor: colors.amber,
    },
    {
      path: '/morning', label: 'Morning Briefing', icon: '◑',
      badge: todayActionCount > 0 ? todayActionCount : null,
      badgeColor: colors.amber,
    },
    {
      path: '/content', label: 'Content Calendar', icon: '⊞',
      badge: scheduledPostCount > 0 ? scheduledPostCount : null,
      badgeColor: colors.blue,
    },
    {
      path: '/inbox', label: 'Unified Inbox', icon: '◉',
      badge: unreadInboxCount > 0 ? unreadInboxCount : null,
      badgeColor: unreadInboxCount > 0 ? colors.red : colors.amber,
    },
    {
      path: '/reports', label: 'Weekly Report', icon: '◈',
      badge: hasUnreadReport ? 'NEW' : null,
      badgeColor: colors.green,
    },
  ];

  return (
    <nav style={styles.sidebar}>
      <div style={styles.logo}>
        <span style={styles.logoIcon}>⬡</span>
        <span style={styles.logoText}>SalesEdge</span>
      </div>
      <div style={styles.subtitle}>LegalEdge Acquisition OS</div>
      <div style={styles.nav}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              ...styles.link,
              background: isActive ? colors.bg4 : 'transparent',
              color: isActive ? colors.amber : colors.textSecondary,
              borderLeft: isActive ? `2px solid ${colors.amber}` : '2px solid transparent',
            })}
          >
            <span style={styles.icon}>{item.icon}</span>
            {item.label}
            {item.badge != null && (
              <span style={{ ...styles.badge, background: item.badgeColor || colors.amber }}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
      <div style={styles.footer}>
        <div style={styles.footerLine}>Phase 3 — Active</div>
        <div style={{ ...styles.footerLine, color: colors.textMuted }}>v0.3.0</div>
        {scheduledPostCount > 0 && (
          <div style={styles.footerStat}>Posts queued: {scheduledPostCount}</div>
        )}
        {unreadInboxCount > 0 && (
          <div style={{ ...styles.footerStat, color: colors.red }}>Inbox unread: {unreadInboxCount}</div>
        )}
        {lastReportDate && (
          <div style={styles.footerStat}>Last report: {lastReportDate}</div>
        )}
      </div>
    </nav>
  );
}

const styles = {
  sidebar: {
    width: 240,
    minWidth: 240,
    height: '100vh',
    background: colors.bg1,
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font,
    position: 'sticky',
    top: 0,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '24px 20px 4px',
  },
  logoIcon: {
    fontSize: 22,
    color: colors.amber,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: colors.textPrimary,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    padding: '0 20px 20px',
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 20px',
    fontSize: 13,
    textDecoration: 'none',
    transition: 'all 0.15s',
    fontFamily: font,
  },
  icon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  badge: {
    marginLeft: 'auto',
    color: colors.bg0,
    fontSize: 10,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 8,
    minWidth: 18,
    textAlign: 'center',
  },
  footer: {
    padding: '16px 20px',
    borderTop: `1px solid ${colors.border}`,
  },
  footerLine: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 1.6,
  },
  footerStat: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 1.6,
    marginTop: 2,
  },
};
