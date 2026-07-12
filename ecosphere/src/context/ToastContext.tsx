import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X, RotateCcw } from 'lucide-react';

export interface ToastOptions {
  id?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  undoAction?: () => void;
  undoLabel?: string;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<(Required<Omit<ToastOptions, 'undoAction' | 'undoLabel'>> & { undoAction?: () => void; undoLabel?: string })[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = 'info', duration = 5000, undoAction, undoLabel = 'Undo' }: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setToasts((prev) => [...prev, { id, message, type, duration, undoAction, undoLabel }]);
    
    setTimeout(() => {
      hideToast(id);
    }, duration);
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            let icon = <Info size={16} style={{ color: 'var(--paper-dim)' }} />;
            let borderStyle = 'var(--moss-line)';
            if (toast.type === 'success') {
              icon = <CheckCircle2 size={16} style={{ color: 'var(--canopy)' }} />;
            } else if (toast.type === 'error') {
              icon = <AlertCircle size={16} style={{ color: 'var(--alert)' }} />;
              borderStyle = 'var(--alert)';
            } else if (toast.type === 'warning') {
              icon = <AlertCircle size={16} style={{ color: 'var(--amber)' }} />;
              borderStyle = 'var(--amber)';
            }

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                className="pointer-events-auto border flex items-center justify-between p-3.5 rounded-lg shadow-xl text-xs backdrop-blur-md"
                style={{
                  background: 'rgba(18, 28, 23, 0.92)',
                  borderColor: borderStyle,
                  color: 'var(--paper)'
                }}
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                  <div className="shrink-0">{icon}</div>
                  <span className="truncate leading-relaxed font-sans">{toast.message}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {toast.undoAction && (
                    <button
                      onClick={() => {
                        toast.undoAction?.();
                        hideToast(toast.id);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-amber font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <RotateCcw size={10} />
                      {toast.undoLabel}
                    </button>
                  )}
                  <button
                    onClick={() => hideToast(toast.id)}
                    className="p-1 rounded hover:bg-white/5 text-paper-dim hover:text-paper transition-colors cursor-pointer"
                    aria-label="Close notification"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
