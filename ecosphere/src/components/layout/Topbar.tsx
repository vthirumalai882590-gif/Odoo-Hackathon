import { useState, useEffect, useRef } from 'react';
import { Bell, Search } from 'lucide-react';
import { db, collection, onSnapshot, setDoc, doc } from '../../lib/firebase';
import type { AppNotification } from '../../types';

export default function Topbar() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications for active simulated employee 'emp-thiru'
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'notifications'), (snap: any) => {
      const list: AppNotification[] = [];
      snap.docs.forEach((d: any) => {
        const notif = d.data();
        // For hackathon/demo simplicity, load all notifications or filter for active user 'emp-thiru'
        if (notif.recipientEmployeeId === 'emp-thiru' || notif.recipientEmployeeId === 'emp-head-ops') {
          list.push(notif);
        }
      });
      setNotifications(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => unsub();
  }, []);

  // Handle outside click to close dropdown
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
    try {
      await setDoc(doc(db, 'notifications', id), { read: true }, { merge: true });
    } catch (e) {
      console.error('Failed to update read status:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      for (const n of notifications) {
        if (!n.read) {
          await setDoc(doc(db, 'notifications', n.id), { read: true }, { merge: true });
        }
      }
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  return (
    <header
      className="h-16 shrink-0 flex items-center justify-between px-6 border-b z-20 relative"
      style={{ borderColor: 'var(--moss-line)', background: 'var(--ink)' }}
    >
      <div className="flex items-center gap-2 w-80">
        <Search size={16} style={{ color: 'var(--paper-dim)' }} />
        <input
          placeholder="Search departments, employees, audits…"
          className="bg-transparent outline-none text-sm w-full placeholder:opacity-60"
          style={{ color: 'var(--paper)' }}
        />
      </div>

      <div className="flex items-center gap-5">
        {/* Notifications Area */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell size={18} style={{ color: 'var(--paper-dim)' }} />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse"
                style={{ background: 'var(--alert)' }}
              />
            )}
          </button>

          {/* Floating Dropdown */}
          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-lg border shadow-xl flex flex-col max-h-96 overflow-hidden z-50 animate-fade-in"
              style={{ background: 'var(--ink-raised)', borderColor: 'var(--moss-line)' }}
            >
              <div className="px-4 py-3 flex justify-between items-center border-b border-moss-line">
                <span className="text-xs uppercase tracking-wider text-paper font-bold">
                  Notifications ({unreadCount} new)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-canopy hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-moss-line/50">
                {notifications.length === 0 ? (
                  <div className="p-5 text-center text-xs text-paper-dim">
                    No notifications received. Compliance warnings and achievements show here.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkAsRead(notif.id)}
                      className={`p-3.5 text-xs flex flex-col gap-1 transition-colors cursor-pointer ${
                        notif.read ? 'opacity-65 hover:bg-white/5' : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span
                          className={`font-semibold ${
                            notif.type === 'BadgeUnlocked'
                              ? 'text-amber'
                              : notif.type === 'ComplianceIssueRaised'
                              ? 'text-alert'
                              : 'text-paper'
                          }`}
                        >
                          {notif.type === 'BadgeUnlocked'
                            ? '🏆 Achievement'
                            : notif.type === 'ComplianceIssueRaised'
                            ? '⚠️ Compliance'
                            : '🔔 Update'}
                        </span>
                        <span className="text-[9px] text-paper-dim font-mono-data">
                          {notif.createdAt.split('T')[0]}
                        </span>
                      </div>
                      <div className="text-paper leading-relaxed mt-0.5">{notif.message}</div>
                      {!notif.read && (
                        <span className="text-[9px] text-canopy mt-1 block">Click to mark read</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 pl-4 border-l" style={{ borderColor: 'var(--moss-line)' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ background: 'var(--moss)', color: 'var(--amber)' }}
          >
            TS
          </div>
          <div className="leading-tight">
            <div className="text-sm" style={{ color: 'var(--paper)' }}>Thiru</div>
            <div className="text-[11px] font-mono-data" style={{ color: 'var(--amber)' }}>
              1,240 XP
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
