import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import CommandPalette from '../ui/CommandPalette';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function AppShell() {
  const [showHelp, setShowHelp] = useState(false);

  // Bind key sequences (g then d/e/s/o/g/r/c) and '?'
  useKeyboardShortcuts(() => setShowHelp(true));

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--color-canvas)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette />

      {/* Keyboard Shortcuts Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHelp(false)}
              className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
            />

            {/* Help Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-lg border shadow-2xl p-5 z-10 flex flex-col gap-4"
              style={{
                background: 'var(--ink-raised)',
                borderColor: 'var(--moss-line)',
              }}
            >
              <div className="flex justify-between items-center border-b border-moss-line pb-2.5">
                <span className="text-xs uppercase tracking-wider font-bold text-amber">
                  Keyboard Shortcuts
                </span>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1 rounded hover:bg-white/5 text-paper-dim hover:text-paper transition-colors cursor-pointer"
                  aria-label="Close help"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-3 text-xs leading-relaxed">
                <div className="grid grid-cols-2 gap-2 border-b border-moss-line/30 pb-2">
                  <span className="font-semibold text-paper">Command / Interaction</span>
                  <span className="font-mono text-amber text-right">Shortcut</span>
                </div>
                
                <div className="flex justify-between items-center py-1">
                  <span className="text-paper-dim">Command Palette Search</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-moss-line font-mono text-[10px] text-paper">Ctrl/Cmd + K</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-paper-dim">Focus Table Search/Filter</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-moss-line font-mono text-[10px] text-paper">/</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-paper-dim">Dismiss open modals</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-moss-line font-mono text-[10px] text-paper">Esc</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-paper-dim">Show Shortcuts Guide</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 border border-moss-line font-mono text-[10px] text-paper">?</span>
                </div>

                <div className="mt-2 border-t border-moss-line/30 pt-2">
                  <span className="text-[10px] uppercase text-canopy font-bold tracking-wider block mb-2">Navigation Sequences</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { target: 'Dashboard Overview', keys: 'g then d' },
                      { target: 'Environmental Pillar', keys: 'g then e' },
                      { target: 'Social Pillar', keys: 'g then s' },
                      { target: 'Governance Pillar', keys: 'g then o' },
                      { target: 'Gamification Center', keys: 'g then g' },
                      { target: 'Reports Dashboard', keys: 'g then r' },
                      { target: 'Configuration settings', keys: 'g then c' },
                    ].map((seq, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-paper-dim">Go to {seq.target}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-moss-line font-mono text-[10px] text-paper">{seq.keys}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
