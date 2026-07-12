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

  let computedAccent = accentColor;
  if (!computedAccent) {
    if (path.includes('/environmental')) {
      computedAccent = 'var(--canopy)';
    } else if (path.includes('/social') || path.includes('/governance')) {
      computedAccent = 'var(--slate)';
    } else if (path.includes('/gamification')) {
      computedAccent = 'var(--purple)';
    }
  }

  // Dynamic box shadow
  const getBoxShadow = () => {
    if (isLight) {
      return computedAccent
        ? `0 1px 2px rgba(27,38,32,0.06), 0 4px 12px rgba(27,38,32,0.04), 0 0 0 1px ${computedAccent}18 inset`
        : '0 1px 2px rgba(27,38,32,0.06), 0 4px 12px rgba(27,38,32,0.04)';
    } else {
      return computedAccent
        ? `0 2px 12px rgba(0,0,0,0.35), 0 0 0 1px ${computedAccent}15 inset`
        : '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)';
    }
  };

  return (
    <div
      className={`rounded-xl border relative overflow-hidden ${glass ? 'glass-card' : ''} ${noPadding ? '' : 'p-5'} ${className}`}
      style={{
        background: glass ? undefined : 'var(--ink-raised)',
        borderColor: computedAccent ? `color-mix(in srgb, ${computedAccent} 30%, var(--moss-line))` : 'var(--moss-line)',
        boxShadow: getBoxShadow(),
        transition: 'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      {computedAccent && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
          style={{
            background: isLight
              ? `linear-gradient(180deg, ${computedAccent} 0%, color-mix(in srgb, ${computedAccent} 40%, transparent) 100%)`
              : `linear-gradient(180deg, ${computedAccent}, transparent)`,
          }}
        />
      )}
      {(eyebrow || title) && (
        <div className={noPadding ? 'px-5 pt-5 pb-0' : 'pb-4 mb-2 border-b border-[var(--moss-line)]'}>
          {eyebrow && (
            <div className="text-[10px] tracking-[0.15em] uppercase mb-1 font-semibold" style={{ color: computedAccent || 'var(--paper-dim)' }}>
              {eyebrow}
            </div>
          )}
          {title && (
            <h3 className="font-display text-base font-semibold" style={{ color: 'var(--paper)', letterSpacing: '-0.01em', fontFamily: 'var(--font-display)' }}>
              {title}
            </h3>
          )}
        </div>
      )}
      <div className={noPadding && (eyebrow || title) ? 'px-5 pb-5 pt-3' : ''}>{children}</div>
    </div>
  );
}
