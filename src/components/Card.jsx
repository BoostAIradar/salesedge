import { colors, font } from '../styles/tokens';

export default function Card({ children, style, tint, onClick }) {
  const tintMap = {
    amber: { bg: `${colors.amber}08`, border: `${colors.amber}25` },
    red: { bg: `${colors.red}08`, border: `${colors.red}25` },
    blue: { bg: `${colors.blue}08`, border: `${colors.blue}25` },
    green: { bg: `${colors.green}08`, border: `${colors.green}25` },
  };
  const t = tint ? tintMap[tint] : null;

  return (
    <div
      onClick={onClick}
      style={{
        background: t?.bg || colors.bg3,
        border: `1px solid ${t?.border || colors.border}`,
        borderRadius: 8,
        padding: 16,
        fontFamily: font,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
        ...style,
      }}
      onMouseEnter={e => {
        if (onClick) e.currentTarget.style.borderColor = colors.borderHover;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = t?.border || colors.border;
      }}
    >
      {children}
    </div>
  );
}
