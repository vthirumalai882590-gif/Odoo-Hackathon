import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Leaf,
  Users,
  ShieldCheck,
  Trophy,
  Settings,
  FileBarChart,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  accent: string;
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, accent: 'var(--paper)' }],
  },
  {
    title: 'ESG Pillars',
    items: [
      { to: '/environmental', label: 'Environmental', icon: Leaf, accent: 'var(--canopy)' },
      { to: '/social', label: 'Social', icon: Users, accent: 'var(--slate)' },
      { to: '/governance', label: 'Governance', icon: ShieldCheck, accent: 'var(--amber)' },
    ],
  },
  {
    title: 'Engage',
    items: [{ to: '/gamification', label: 'Gamification', icon: Trophy, accent: 'var(--amber)' }],
  },
  {
    title: 'System',
    items: [
      { to: '/reports', label: 'Reports', icon: FileBarChart, accent: 'var(--slate)' },
      { to: '/settings', label: 'Settings', icon: Settings, accent: 'var(--paper-dim)' },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside
      className="w-60 shrink-0 h-full flex flex-col border-r"
      style={{
        background: 'linear-gradient(180deg, var(--ink-raised) 0%, var(--ink) 100%)',
        borderColor: 'var(--moss-line)',
      }}
    >
      {/* Logo Area */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--canopy), var(--canopy-dim))',
            boxShadow: '0 0 16px rgba(77,170,117,0.35)',
          }}
        >
          <Leaf size={15} color="white" strokeWidth={2} />
        </div>
        <div>
          <div className="font-display text-[17px] font-semibold" style={{ color: 'var(--paper)', letterSpacing: '-0.02em' }}>
            EcoSphere
          </div>
          <div className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--paper-dim)' }}>
            ESG Platform
          </div>
        </div>
      </div>

      <div className="ledger-rule mx-4" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            <div
              className="px-2 mb-1.5 text-[9px] tracking-[0.18em] uppercase font-bold"
              style={{ color: 'var(--paper-dim)', opacity: 0.6 }}
            >
              {section.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                      isActive ? 'font-medium' : 'font-normal hover:bg-white/5'
                    }`
                  }
                  style={({ isActive }) => ({
                    background: isActive
                      ? 'linear-gradient(90deg, rgba(77,170,117,0.12), rgba(77,170,117,0.04))'
                      : 'transparent',
                    color: isActive ? 'var(--paper)' : 'var(--paper-dim)',
                    borderLeft: isActive ? `2px solid ${item.accent}` : '2px solid transparent',
                    paddingLeft: '10px',
                  })}
                >
                  <item.icon
                    size={15}
                    style={{ color: item.accent, opacity: 1 }}
                    strokeWidth={1.8}
                  />
                  <span className="text-[13px]">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="ledger-rule mx-4" />
      <div className="px-5 py-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(77,170,117,0.06)', border: '1px solid rgba(77,170,117,0.12)' }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--canopy)' }}
          />
          <div className="text-[10px]" style={{ color: 'var(--paper-dim)' }}>
            Env 40 · Soc 30 · Gov 30
          </div>
        </div>
      </div>
    </aside>
  );
}
