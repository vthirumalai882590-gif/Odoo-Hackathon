import React from 'react';
import { Inbox, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  accentColor?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  accentColor = 'var(--canopy)',
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
      <div
        className="mb-4 w-16 h-16 rounded-2xl flex items-center justify-center relative"
        style={{
          background: `${accentColor}12`,
          border: `1px solid ${accentColor}25`,
        }}
      >
        <div className="absolute inset-0 rounded-2xl" style={{ background: `radial-gradient(ellipse at center, ${accentColor}08, transparent)` }} />
        <div style={{ color: accentColor }}>
          {icon || <Inbox size={28} strokeWidth={1.5} />}
        </div>
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--paper)' }}>{title}</h3>
      {description && (
        <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--paper-dim)' }}>{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 btn-primary text-xs"
          style={{ fontSize: '12px', padding: '7px 14px' }}
        >
          <Plus size={13} />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
export default EmptyState;
