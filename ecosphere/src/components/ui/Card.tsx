import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

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
  const location = useLocation();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const path = location.pathname;

  // Auto-derive accent from route using new pillar tokens
  let computedAccent = accentColor;
  if (!computedAccent) {
    if (path.includes('/environmental')) {
      computedAccent = 'var(--color-environmental)';
    } else if (path.includes('/social')) {
      computedAccent = 'var(--color-social)';
    } else if (path.includes('/governance')) {
      computedAccent = 'var(--color-governance)';
    } else if (path.includes('/gamification')) {
      computedAccent = 'var(--color-xp-gold)';
    }
  }

  return (
    <div
      className={`rounded-2xl border relative overflow-hidden transition-all duration-200 ${glass ? 'glass-card' : ''} ${noPadding ? '' : 'p-5'} ${className}`}
      style={{
        background: glass
          ? undefined
          : isLight
            ? 'rgba(255,255,255,0.85)'
            : 'var(--color-surface-2)',
        borderColor: computedAccent
          ? `color-mix(in srgb, ${computedAccent} 25%, var(--color-surface-border))`
          : 'var(--color-surface-border)',
        boxShadow: isLight
          ? '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
          : '0 2px 12px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Left accent bar */}
      {computedAccent && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
          style={{
            background: `linear-gradient(180deg, ${computedAccent}, color-mix(in srgb, ${computedAccent} 30%, transparent))`,
          }}
        />
      )}

      {(eyebrow || title) && (
        <div className={`${computedAccent ? 'pl-2' : ''} ${noPadding ? 'px-5 pt-5 pb-0' : 'pb-4 mb-2 border-b'}`}
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          {eyebrow && (
            <div
              className="text-[10px] tracking-[0.15em] uppercase mb-1 font-semibold"
              style={{ color: computedAccent || 'var(--color-text-tertiary)' }}
            >
              {eyebrow}
            </div>
          )}
          {title && (
            <h3
              className="text-base font-semibold"
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h3>
          )}
        </div>
      )}

      <div className={`${computedAccent ? 'pl-2' : ''} ${noPadding && (eyebrow || title) ? 'px-5 pb-5 pt-3' : ''}`}>
        {children}
      </div>
    </div>
  );
}
