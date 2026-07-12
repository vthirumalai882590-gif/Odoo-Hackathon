import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

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
  accent = 'var(--color-brand-400)',
  icon,
  subLabel,
}: KpiTileProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="rounded-2xl border p-5 flex flex-col gap-3 relative overflow-hidden group elevation-1"
      style={{
        background: 'var(--color-surface-2)',
        borderColor: 'var(--color-surface-border)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${accent} 30%, var(--color-surface-border))`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-surface-border)';
      }}
    >
      {/* Radial accent glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${accent} 12%, transparent), transparent 65%)` }}
      />

      <div className="flex items-center justify-between relative z-10">
        <div
          className="text-[11px] tracking-[0.08em] uppercase font-semibold"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </div>
        {icon && (
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              color: accent,
              border: `1px solid color-mix(in srgb, ${accent} 20%, transparent)`,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="relative z-10">
        <div
          className="text-2xl font-bold font-mono animate-count-up"
          style={{ color: accent, fontFamily: 'var(--font-mono)' }}
        >
          {value}
        </div>
        {subLabel && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {subLabel}
          </div>
        )}
      </div>

      {delta && (
        <div
          className="flex items-center gap-1 text-xs font-semibold relative z-10"
          style={{
            color: deltaPositive ? 'var(--color-brand-400)' : 'var(--color-diff-hard)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span className="text-[10px]">{deltaPositive ? '▲' : '▼'}</span>
          {delta}
        </div>
      )}
    </motion.div>
  );
}
