import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Search, Compass, Zap, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const runCommand = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
          />

          {/* Palette Box */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            className="relative w-full max-w-lg rounded-lg border shadow-2xl overflow-hidden flex flex-col z-10"
            style={{
              background: 'var(--ink-raised)',
              borderColor: 'var(--moss-line)',
            }}
          >
            <Command
              label="Global actions search"
              className="flex flex-col h-96 outline-none"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-moss-line shrink-0">
                <Search size={16} style={{ color: 'var(--paper-dim)' }} />
                <Command.Input
                  autoFocus
                  placeholder="Type a navigation command or quick action..."
                  className="w-full bg-transparent text-sm text-paper placeholder:text-paper-dim/50 outline-none"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-white/5 text-paper-dim hover:text-paper transition-colors cursor-pointer"
                  aria-label="Close search"
                >
                  <X size={14} />
                </button>
              </div>

              <Command.List className="flex-1 overflow-y-auto p-2 scrollbar-none divide-y divide-moss-line/30">
                <Command.Empty className="p-4 text-center text-xs text-paper-dim">
                  No matches found in the ESG ledger.
                </Command.Empty>

                <Command.Group
                  heading={
                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] uppercase tracking-wider text-amber font-bold font-mono">
                      <Zap size={10} /> Quick ESG Actions
                    </span>
                  }
                  className="py-1"
                >
                  {[
                    { label: 'Log Carbon Transaction', action: () => navigate('/environmental?tab=txs&action=new-tx') },
                    { label: 'New CSR Activity', action: () => navigate('/social?tab=activities&action=new-activity') },
                    { label: 'New Compliance Issue', action: () => navigate('/governance?tab=issues&action=new-issue') },
                    { label: 'New Challenge (Gamification)', action: () => navigate('/gamification?tab=challenges&action=new-challenge') },
                    { label: 'Redeem Reward Catalog', action: () => navigate('/gamification?tab=rewards&action=new-redemption') },
                  ].map((item, idx) => (
                    <Command.Item
                      key={idx}
                      onSelect={() => runCommand(item.action)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded text-xs text-paper-dim hover:text-paper hover:bg-moss cursor-pointer transition-colors outline-none font-sans font-medium"
                    >
                      <Zap size={12} className="text-amber shrink-0" />
                      <span>{item.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group
                  heading={
                    <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] uppercase tracking-wider text-canopy font-bold font-mono">
                      <Compass size={10} /> Jump Navigation
                    </span>
                  }
                  className="py-1"
                >
                  {[
                    { label: 'Go to Dashboard Overview', action: () => navigate('/') },
                    { label: 'Go to Environmental Scope 1/2/3', action: () => navigate('/environmental') },
                    { label: 'Go to Carbon Transactions Ledger', action: () => navigate('/environmental?tab=txs') },
                    { label: 'Go to Social Pillar & CSR', action: () => navigate('/social') },
                    { label: 'Go to CSR Approval Queue', action: () => navigate('/social?tab=approvals') },
                    { label: 'Go to Governance & Policies', action: () => navigate('/governance') },
                    { label: 'Go to Compliance Issues Tracker', action: () => navigate('/governance?tab=issues') },
                    { label: 'Go to Gamification & Challenges', action: () => navigate('/gamification') },
                    { label: 'Go to Gamification Leaderboard', action: () => navigate('/gamification?tab=leaderboard') },
                    { label: 'Go to Audit Reports & Builders', action: () => navigate('/reports') },
                    { label: 'Go to Platform Settings', action: () => navigate('/settings') },
                  ].map((item, idx) => (
                    <Command.Item
                      key={idx}
                      onSelect={() => runCommand(item.action)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded text-xs text-paper-dim hover:text-paper hover:bg-moss cursor-pointer transition-colors outline-none font-sans font-medium"
                    >
                      <Compass size={12} className="text-canopy shrink-0" />
                      <span>{item.label}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>

              <div className="px-4 py-2 border-t border-moss-line bg-white/2 shrink-0 flex justify-between items-center text-[10px] text-paper-dim font-mono-data">
                <span>Use arrows or type search</span>
                <span>ESC to dismiss</span>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default CommandPalette;
