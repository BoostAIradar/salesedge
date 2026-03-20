import { colors, font } from '../styles/tokens';

export default function Tag({ label, color = colors.textMuted, bg }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontFamily: font,
        fontWeight: 500,
        color: color,
        background: bg || `${color}15`,
        border: `1px solid ${color}30`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
