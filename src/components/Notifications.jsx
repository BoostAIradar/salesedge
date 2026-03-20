import { colors, font } from '../styles/tokens';

const TYPE_STYLES = {
  success: { bg: `${colors.green}15`, border: `${colors.green}40`, color: colors.green, icon: '✓' },
  info: { bg: `${colors.blue}15`, border: `${colors.blue}40`, color: colors.blue, icon: 'ℹ' },
  warning: { bg: `${colors.amber}15`, border: `${colors.amber}40`, color: colors.amber, icon: '⚠' },
  insight: { bg: `${colors.purple}15`, border: `${colors.purple}40`, color: colors.purple, icon: '◈' },
};

export default function Notifications({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map(toast => {
        const ts = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
        return (
          <div
            key={toast.id}
            style={{
              ...styles.toast,
              background: ts.bg,
              borderColor: ts.border,
            }}
            onClick={() => onDismiss(toast.id)}
          >
            <span style={{ ...styles.icon, color: ts.color }}>{ts.icon}</span>
            <span style={styles.message}>{toast.message}</span>
            <button style={styles.dismiss} onClick={() => onDismiss(toast.id)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: 16,
    right: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 9999,
    maxWidth: 360,
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid',
    fontFamily: font,
    cursor: 'pointer',
    animation: 'slideIn 0.2s ease-out',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
  },
  icon: {
    fontSize: 14,
    flexShrink: 0,
  },
  message: {
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 1.4,
  },
  dismiss: {
    background: 'none',
    border: 'none',
    color: colors.textMuted,
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: font,
    flexShrink: 0,
  },
};
