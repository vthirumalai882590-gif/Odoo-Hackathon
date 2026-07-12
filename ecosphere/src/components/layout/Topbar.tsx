import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc } from '../../lib/firebase';
import type { AppNotification } from '../../types';

export default function Topbar() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      className="h-14 shrink-0 flex items-center justify-between px-6 border-b z-20 relative"
      style={{
        background: 'linear-gradient(90deg, var(--ink-raised) 0%, rgba(16,26,21,0.95) 100%)',
        borderColor: 'var(--moss-line)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg w-72 transition-all"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--moss-line)' }}
      >
        <Search size={14} style={{ color: 'var(--paper-dim)' }} />
        <input
          placeholder="Search departments, audits, employees…"
          className="bg-transparent outline-none text-xs w-full placeholder:opacity-50"
          style={{ color: 'var(--paper)', fontFamily: 'var(--font-body)' }}
        />
        <kbd
          className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold shrink-0"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--paper-dim)', border: '1px solid var(--moss-line)' }}
        >
          Ctrl K
        </kbd>
      </div>

      <div className="flex items-center gap-4">
        {/* Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={17} style={{ color: unreadCount > 0 ? 'var(--amber)' : 'var(--paper-dim)' }} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-ink"
                style={{ background: 'var(--amber)', boxShadow: '0 0 8px var(--amber-glow)' }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl border shadow-2xl flex flex-col max-h-96 overflow-hidden z-50 animate-fade-in"
              style={{ background: 'var(--ink-raised)', borderColor: 'var(--moss-line)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
            >
              <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid var(--moss-line)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--paper)' }}>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 badge badge-amber">{unreadCount} new</span>
                  )}
                </span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[10px] font-semibold" style={{ color: 'var(--canopy)' }}>
                    Mark all read
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'rgba(42,66,51,0.4)' }}>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs" style={{ color: 'var(--paper-dim)' }}>
                    No notifications yet. Compliance alerts and badges show here.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkAsRead(notif.id)}
                      className={`p-3.5 text-xs flex gap-3 transition-colors cursor-pointer ${
                        notif.read ? 'opacity-60 hover:bg-white/4' : 'hover:bg-white/5'
                      }`}
                      style={{ background: notif.read ? undefined : 'rgba(255,255,255,0.025)' }}
                    >
                      <div className="mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(255,255,255,0.07)' }}>
                        {notifIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold" style={{ color: 'var(--paper)' }}>
                            {notif.type === 'BadgeUnlocked' ? 'Achievement Unlocked'
                              : notif.type === 'ComplianceIssueRaised' ? 'Compliance Alert'
                              : 'System Update'}
                          </span>
                          <span className="text-[9px] shrink-0 font-mono-data" style={{ color: 'var(--paper-dim)' }}>
                            {notif.createdAt.split('T')[0]}
                          </span>
                        </div>
                        <div className="mt-0.5 leading-relaxed" style={{ color: 'var(--paper-dim)' }}>{notif.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 pl-4" style={{ borderLeft: '1px solid var(--moss-line)' }}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--canopy), var(--canopy-dim))',
              color: 'white',
              boxShadow: '0 0 12px var(--canopy-glow)',
            }}
          >
            TS
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold" style={{ color: 'var(--paper)' }}>Thiru</div>
            <div className="text-[10px] font-mono-data font-semibold" style={{ color: 'var(--amber)' }}>
              1,240 XP
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
