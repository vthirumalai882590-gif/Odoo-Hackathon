import { motion } from 'framer-motion';

interface GrowthRingGaugeProps {
  environmental: number; // 0-100
  social: number;        // 0-100
  governance: number;    // 0-100
  overall: number;       // 0-100 weighted
  size?: number;
}

// Each pillar is drawn as a ring; ring thickness communicates the score,
// and rings animate outward on mount — evoking tree-ring growth /
// a ledger's concentric audit trail.
export default function GrowthRingGauge({
  environmental,
  social,
  governance,
  overall,
  size = 240,
}: GrowthRingGaugeProps) {
  const center = size / 2;
  const rings = [
    { label: 'Environmental', value: environmental, color: 'var(--canopy)', radius: size * 0.42 },
    { label: 'Social', value: social, color: 'var(--slate)', radius: size * 0.32 },
    { label: 'Governance', value: governance, color: 'var(--amber)', radius: size * 0.22 },
  ];

  return (
    <div className="relative inline-flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ring) => {
          const circumference = 2 * Math.PI * ring.radius;
          const dash = (ring.value / 100) * circumference;
          return (
            <g key={ring.label} transform={`rotate(-90 ${center} ${center})`}>
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke="var(--moss-line)"
                strokeWidth={10}
              />
              <motion.circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - dash }}
                transition={{ duration: 1.1, ease: 'easeOut', delay: 0.15 }}
              />
            </g>
          );
        })}
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          fill="var(--paper)"
          fontFamily="var(--font-mono)"
          fontSize={size * 0.16}
          fontWeight={600}
        >
          {overall.toFixed(0)}
        </text>
        <text
          x={center}
          y={center + 16}
          textAnchor="middle"
          fill="var(--paper-dim)"
          fontFamily="var(--font-body)"
          fontSize={size * 0.045}
          letterSpacing="0.08em"
        >
          ESG SCORE
        </text>
      </svg>
      <div className="flex gap-4 text-xs font-body">
        {rings.map((ring) => (
          <div key={ring.label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: ring.color }}
            />
            <span style={{ color: 'var(--paper-dim)' }}>{ring.label}</span>
            <span className="font-mono-data" style={{ color: 'var(--paper)' }}>
              {ring.value.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
