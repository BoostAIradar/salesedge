import { tierColors } from '../styles/tokens';
import { font } from '../styles/tokens';

export default function ScoreRing({ score, tier, size = 120, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = tierColors[tier] || tierColors[3];

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1E1E2C"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.8s ease-out',
          }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: font,
        }}
      >
        <span style={{ fontSize: size * 0.28, fontWeight: 700, color }}>
          {score}
        </span>
        <span style={{ fontSize: size * 0.1, color: '#9494AC', marginTop: 2 }}>
          ICP SCORE
        </span>
      </div>
    </div>
  );
}
