import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  eyebrow?: string;
  accentColor?: string;
  noPadding?: boolean;
  glass?: boolean;
}

export default function Card({
  children,
  className = '',
  title,
  eyebrow,
  accentColor,
  noPadding = false,
  glass = false,
}: CardProps) {
  return (
    <div
      className={`rounded-xl border relative overflow-hidden ${glass ? 'glass-card' : ''} ${noPadding ? '' : 'p-5'} ${className}`}
      style={{
        background: glass ? undefined : 'var(--ink-raised)',
        borderColor: accentColor ? `${accentColor}30` : 'var(--moss-line)',
        boxShadow: accentColor
          ? `0 2px 12px rgba(0,0,0,0.35), 0 0 0 1px ${accentColor}15 inset`
          : '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {accentColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl"
          style={{ background: `linear-gradient(180deg, ${accentColor}, transparent)` }}
        />
      )}
      {(eyebrow || title) && (
        <div className={noPadding ? 'px-5 pt-5 pb-0' : 'pb-4 mb-2 border-b border-[var(--moss-line)]'}>
          {eyebrow && (
            <div className="text-[10px] tracking-[0.15em] uppercase mb-1 font-semibold" style={{ color: accentColor || 'var(--paper-dim)' }}>
              {eyebrow}
            </div>
          )}
          {title && (
            <h3 className="font-display text-base font-semibold" style={{ color: 'var(--paper)', letterSpacing: '-0.01em' }}>
              {title}
            </h3>
          )}
        </div>
      )}
      <div className={noPadding && (eyebrow || title) ? 'px-5 pb-5 pt-3' : ''}>{children}</div>
    </div>
  );
}
