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
  glow: string;
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, accent: '#ede8d8', glow: 'rgba(237,232,216,0.15)' }],
  },
  {
    title: 'ESG Pillars',
    items: [
      { to: '/environmental', label: 'Environmental', icon: Leaf,       accent: '#3ecf7a', glow: 'rgba(62,207,122,0.18)' },
      { to: '/social',        label: 'Social',        icon: Users,      accent: '#5b8dee', glow: 'rgba(91,141,238,0.18)' },
      { to: '/governance',    label: 'Governance',    icon: ShieldCheck, accent: '#f5a623', glow: 'rgba(245,166,35,0.18)'  },
    ],
  },
  {
    title: 'Engage',
    items: [{ to: '/gamification', label: 'Gamification', icon: Trophy, accent: '#a78bfa', glow: 'rgba(167,139,250,0.18)' }],
  },
  {
    title: 'System',
    items: [
      { to: '/reports',  label: 'Reports',  icon: FileBarChart, accent: '#2dd4bf', glow: 'rgba(45,212,191,0.18)' },
      { to: '/settings', label: 'Settings', icon: Settings,     accent: '#8a8274',  glow: 'rgba(138,130,116,0.12)' },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside
      className="w-60 shrink-0 h-full flex flex-col border-r"
      style={{
        background: 'linear-gradient(180deg, #0e1812 0%, #090e0c 100%)',
        borderColor: 'var(--moss-line)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #3ecf7a, #1fa855)',
            boxShadow: '0 0 18px rgba(62,207,122,0.4)',
          }}
        >
          <Leaf size={15} color="white" strokeWidth={2.2} />
        </div>
        <div>
          <div className="font-display text-[17px] font-semibold" style={{ color: 'var(--paper)', letterSpacing: '-0.02em' }}>
            EcoSphere
          </div>
          <div className="text-[9px] tracking-widest uppercase font-semibold" style={{ color: 'var(--canopy)', opacity: 0.8 }}>
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
              className="px-2 mb-2 text-[9px] tracking-[0.2em] uppercase font-bold"
              style={{ color: 'var(--paper-dim)', opacity: 0.5 }}
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
                    `flex items-center gap-2.5 py-2 rounded-lg text-sm transition-all duration-150 ${
                      isActive ? 'font-semibold' : 'hover:bg-white/4'
                    }`
                  }
                  style={({ isActive }) => ({
                    paddingLeft: '10px',
                    paddingRight: '10px',
                    background: isActive
                      ? `linear-gradient(90deg, ${item.glow}, transparent 80%)`
                      : 'transparent',
                    color: isActive ? item.accent : 'var(--paper-dim)',
                    borderLeft: isActive ? `2px solid ${item.accent}` : '2px solid transparent',
                    boxShadow: isActive ? `0 0 12px ${item.glow}` : 'none',
                  })}
                >
                  <item.icon size={15} style={{ color: 'inherit', opacity: 1 }} strokeWidth={1.8} />
                  <span className="text-[13px]">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="ledger-rule mx-4" />
      <div className="px-4 py-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(62,207,122,0.06)', border: '1px solid rgba(62,207,122,0.14)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--canopy)' }} />
          <div className="text-[10px] font-mono-data" style={{ color: 'var(--paper-dim)' }}>
            Env 40 · Soc 30 · Gov 30
          </div>
        </div>
      </div>
    </aside>
  );
}
