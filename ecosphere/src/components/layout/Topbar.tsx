import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Zap, CheckCircle2, AlertTriangle, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { db, collection, onSnapshot, setDoc, doc } from '../../lib/firebase';
import type { AppNotification } from '../../types';
import { useTheme } from '../../context/ThemeContext';

export default function Topbar() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'notifications'), (snap: any) => {
      const list: AppNotification[] = [];
      snap.docs.forEach((d: any) => {
        const notif = d.data();
        if (notif.recipientEmployeeId === 'emp-thiru' || notif.recipientEmployeeId === 'emp-head-ops') {
          list.push(notif);
        }
      });
      setNotifications(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    try { await setDoc(doc(db, 'notifications', id), { read: true }, { merge: true }); }
    catch (e) { console.error(e); }
  };

  const handleMarkAllRead = async () => {
    try {
      for (const n of notifications) {
        if (!n.read) await setDoc(doc(db, 'notifications', n.id), { read: true }, { merge: true });
      }
    } catch (e) { console.error(e); }
  };

  const notifIcon = (type: string) => {
    if (type === 'BadgeUnlocked') return <Zap size={13} style={{ color: 'var(--amber)' }} />;
    if (type === 'ComplianceIssueRaised') return <AlertTriangle size={13} style={{ color: 'var(--alert)' }} />;
    return <CheckCircle2 size={13} style={{ color: 'var(--canopy)' }} />;
  };

  return (
    <header
      className="h-14 shrink-0 flex items-center justify-between px-6 border-b z-20 sticky top-0 backdrop-blur-md"
      style={{
        background: isLight
          ? 'rgba(251, 250, 244, 0.8)'
          : 'rgba(10, 15, 13, 0.8)',
        borderColor: 'var(--color-surface-border)',
        transition: 'background 0.25s ease',
      }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg w-72 transition-all duration-300 border border-moss-line focus-within:w-96 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-glow"
        style={{
          background: 'var(--color-surface-2)',
          borderColor: 'var(--color-surface-border)',
        }}
      >
        <Search size={14} style={{ color: 'var(--color-text-secondary)' }} />
        <input
          placeholder="Search departments, audits, employees…"
          className="bg-transparent outline-none text-xs w-full placeholder:opacity-50 text-text-primary"
          style={{ fontFamily: 'var(--font-body)' }}
        />
        <kbd
          className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold shrink-0"
          style={{
            background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
            color: 'var(--color-text-tertiary)',
            border: '1px solid var(--color-surface-border)',
          }}
        >
          Ctrl K
        </kbd>
      </div>

      <div className="flex items-center gap-3">

        {/* ── Theme Toggle ── */}
        <button
          onClick={toggleTheme}
          title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
          className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all duration-300 border"
          style={{
            background: isLight
              ? 'linear-gradient(135deg, #fef9c3, #fef08a)'
              : 'linear-gradient(135deg, #1e293b, #0f172a)',
            borderColor: isLight ? '#fcd34d' : '#334155',
            boxShadow: isLight
              ? '0 2px 8px rgba(251,191,36,0.3)'
              : '0 2px 8px rgba(15,23,42,0.5)',
          }}
        >
          <span
            className="absolute inset-0.5 rounded-lg transition-all duration-300"
            style={{
              background: isLight
                ? 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.4))'
                : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
            }}
          />
          <Sun
            size={13}
            className="relative z-10 transition-all duration-300"
            style={{ color: isLight ? '#d97706' : '#64748b', transform: isLight ? 'scale(1.1)' : 'scale(0.9)' }}
          />
          <span
            className="relative z-10 text-[10px] font-semibold tracking-wide"
            style={{ color: isLight ? '#92400e' : '#64748b' }}
          >
            {isLight ? 'Light' : 'Dark'}
          </span>
          <Moon
            size={13}
            className="relative z-10 transition-all duration-300"
            style={{ color: isLight ? '#94a3b8' : '#a78bfa', transform: isLight ? 'scale(0.9)' : 'scale(1.1)' }}
          />
        </button>

        {/* ── Bell ── */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 rounded-lg transition-colors cursor-pointer"
            style={{ background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)' }}
            aria-label="Notifications"
          >
            <Bell size={17} style={{ color: unreadCount > 0 ? 'var(--color-xp-gold)' : 'var(--color-text-secondary)' }} />
            {unreadCount > 0 && (
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: 'var(--color-xp-gold)', color: '#000', boxShadow: '0 0 8px var(--color-xp-glow)' }}
              >
                {unreadCount}
              </motion.span>
            )}
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl border shadow-2xl flex flex-col max-h-96 overflow-hidden z-50 animate-fade-in"
              style={{
                background: 'var(--color-surface-2)',
                borderColor: 'var(--color-surface-border)',
                boxShadow: isLight ? '0 8px 32px rgba(0,0,0,0.15)' : '0 8px 32px rgba(0,0,0,0.6)',
              }}
            >
              <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 badge badge-amber">{unreadCount} new</span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[10px] font-semibold cursor-pointer" style={{ color: 'var(--color-brand-500)' }}>
                    Mark all read
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--color-surface-border)' }}>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    No notifications yet. Compliance alerts and badges show here.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-3.5 text-xs flex gap-3 transition-colors cursor-pointer"
                      style={{
                        background: notif.read ? undefined : isLight ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.025)',
                        opacity: notif.read ? 0.65 : 1,
                      }}
                    >
                      <div
                        className="mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)' }}
                      >
                        {notifIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {notif.type === 'BadgeUnlocked' ? 'Achievement Unlocked'
                              : notif.type === 'ComplianceIssueRaised' ? 'Compliance Alert'
                              : 'System Update'}
                          </span>
                          <span className="text-[9px] shrink-0 font-mono-data" style={{ color: 'var(--color-text-secondary)' }}>
                            {notif.createdAt.split('T')[0]}
                          </span>
                        </div>
                        <div className="mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{notif.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── User Avatar Chip with Progress Ring ── */}
        <div className="flex items-center gap-3 pl-3" style={{ borderLeft: '1px solid var(--color-surface-border)' }}>
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* XP Circular Progress Ring */}
            <svg className="w-10 h-10 absolute inset-0 -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="17"
                stroke="var(--color-surface-border-strong)"
                strokeWidth="2"
                fill="none"
              />
              <motion.circle
                cx="20"
                cy="20"
                r="17"
                stroke="var(--color-xp-gold)"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="106.8"
                initial={{ strokeDashoffset: 106.8 }}
                animate={{ strokeDashoffset: 106.8 * (1 - 1240 / 1500) }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold z-10"
              style={{
                background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))',
                color: 'white',
                boxShadow: '0 0 8px var(--color-brand-glow)',
              }}
            >
              TS
            </div>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Thiru</div>
            <div className="text-[10px] font-mono font-semibold" style={{ color: 'var(--color-xp-gold)' }}>
              1,240 XP
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
