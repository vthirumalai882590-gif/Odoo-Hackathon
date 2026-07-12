import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Esc keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      window.addEventListener('keydown', handleKeyDown);
      
      // Focus trapping
      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (!isOpen && previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  // Keep focus trapped
  const handleTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    if (!containerRef.current) return;

    const focusable = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            ref={containerRef}
            onKeyDown={handleTabKey}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm rounded-lg border shadow-2xl overflow-hidden flex flex-col z-10"
            style={{
              background: 'var(--ink-raised)',
              borderColor: isDestructive ? 'var(--alert)' : 'var(--moss-line)',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div className="flex justify-between items-center p-4 border-b border-moss-line">
              <div className="flex items-center gap-2">
                {isDestructive && <AlertTriangle size={16} style={{ color: 'var(--alert)' }} />}
                <span
                  id="confirm-dialog-title"
                  className="text-xs uppercase tracking-wider font-bold text-paper"
                >
                  {title}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-white/5 text-paper-dim hover:text-paper transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 text-xs leading-relaxed text-paper-dim">
              {message}
            </div>

            <div className="flex justify-end gap-2 p-3 border-t border-moss-line bg-white/2 cursor-default">
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded border border-moss-line hover:bg-white/5 text-xs text-paper-dim hover:text-paper font-semibold transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-3.5 py-1.5 rounded text-xs text-white font-semibold transition-colors cursor-pointer ${
                  isDestructive ? 'bg-alert hover:bg-alert/90' : 'bg-canopy hover:bg-canopy/90'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default ConfirmDialog;
