import React, { useState, useEffect, useRef } from 'react';
import { Edit2 } from 'lucide-react';

interface InlineEditCellProps {
  value: string | number;
  onSave: (newValue: any) => Promise<void> | void;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: { value: string; label: string }[];
  className?: string;
  isMono?: boolean;
}

export const InlineEditCell: React.FC<InlineEditCellProps> = ({
  value,
  onSave,
  type = 'text',
  options = [],
  className = '',
  isMono = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      await saveChange();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const saveChange = async () => {
    if (editValue !== value) {
      try {
        let finalValue: any = editValue;
        if (type === 'number') {
          finalValue = parseFloat(editValue as string) || 0;
        }
        await onSave(finalValue);
      } catch (err) {
        console.error('Failed inline save:', err);
      }
    }
    setIsEditing(false);
  };

  if (isEditing) {
    if (type === 'select') {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveChange}
          onKeyDown={handleKeyDown}
          className={`px-1.5 py-0.5 rounded bg-ink border border-moss-line text-xs text-paper focus:outline-none focus:border-canopy ${className}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: 'var(--ink)' }}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={saveChange}
        onKeyDown={handleKeyDown}
        className={`px-1.5 py-0.5 rounded bg-ink border border-moss-line text-xs text-paper focus:outline-none focus:border-canopy ${
          isMono ? 'font-mono-data' : ''
        } ${className}`}
      />
    );
  }

  // Display mode
  let displayLabel = value;
  if (type === 'select') {
    const selectedOpt = options.find((o) => o.value === value);
    if (selectedOpt) {
      displayLabel = selectedOpt.label;
    }
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`group flex items-center justify-between gap-1.5 cursor-pointer hover:bg-white/5 py-1 px-1.5 rounded transition-all ${
        isMono ? 'font-mono-data' : ''
      } ${className}`}
    >
      <span className="truncate">{displayLabel}</span>
      <Edit2
        size={11}
        className="opacity-0 group-hover:opacity-60 transition-opacity text-paper-dim shrink-0"
      />
    </div>
  );
};
export default InlineEditCell;
