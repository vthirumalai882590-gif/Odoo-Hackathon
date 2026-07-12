import type { ReactNode } from 'react';

interface KpiTileProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  accent?: string;
  icon?: ReactNode;
  subLabel?: string;
}

export default function KpiTile({
  label,
  value,
  delta,
  deltaPositive = true,
  accent = 'var(--paper)',
  icon,
  subLabel,
}: KpiTileProps) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3 relative overflow-hidden group transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'var(--ink-raised)',
        borderColor: 'var(--moss-line)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${accent}08, transparent 60%)` }}
      />

      <div className="flex items-center justify-between">
        <div className="text-[11px] tracking-wide uppercase font-medium" style={{ color: 'var(--paper-dim)' }}>
          {label}
        </div>
        {icon && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${accent}18`, color: accent }}
          >
            {icon}
          </div>
        )}
      </div>

      <div>
        <div className="font-mono-data text-2xl font-bold animate-count-up" style={{ color: accent }}>
          {value}
        </div>
        {subLabel && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--paper-dim)' }}>{subLabel}</div>
        )}
      </div>

      {delta && (
        <div
          className="flex items-center gap-1 text-xs font-mono-data font-semibold"
          style={{ color: deltaPositive ? 'var(--canopy-bright)' : 'var(--alert)' }}
        >
          <span className="text-[10px]">{deltaPositive ? '▲' : '▼'}</span>
          {delta}
        </div>
      )}
    </div>
  );
}
