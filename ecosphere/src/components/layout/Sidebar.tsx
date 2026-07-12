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
import { useTheme } from '../../context/ThemeContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'ESG Pillars',
    items: [
      { to: '/environmental', label: 'Environmental', icon: Leaf },
      { to: '/social',        label: 'Social',        icon: Users },
      { to: '/governance',    label: 'Governance',    icon: ShieldCheck },
    ],
  },
  {
    title: 'Engage',
    items: [{ to: '/gamification', label: 'Gamification', icon: Trophy }],
  },
  {
    title: 'System',
    items: [
      { to: '/reports',  label: 'Reports',  icon: FileBarChart },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const getThemeStyles = (to: string) => {
    if (to === '/') {
      return {
        accent: isLight ? 'var(--paper)' : '#ede8d8',
        glow: isLight ? 'rgba(13,31,21,0.06)' : 'rgba(237,232,216,0.12)',
      };
    }
    if (to === '/environmental') {
      return {
        accent: 'var(--canopy)',
        glow: 'var(--canopy-glow)',
      };
    }
    if (to === '/social') {
      return {
        accent: 'var(--slate)',
        glow: 'var(--slate-glow)',
      };
    }
    if (to === '/governance') {
      return {
        accent: 'var(--amber)',
        glow: 'var(--amber-glow)',
      };
    }
    if (to === '/gamification') {
      return {
        accent: 'var(--purple)',
        glow: 'var(--purple-glow)',
      };
    }
    if (to === '/reports') {
      return {
        accent: 'var(--teal)',
        glow: 'var(--teal-glow)',
      };
    }
    if (to === '/settings') {
      return {
        accent: 'var(--paper-dim)',
        glow: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(138,130,116,0.1)',
      };
    }
    return { accent: 'var(--paper)', glow: 'transparent' };
  };

  return (
    <aside
      className="w-60 shrink-0 h-full flex flex-col border-r transition-all duration-300"
      style={{
        background: isLight
          ? 'var(--ink-raised)'
          : 'linear-gradient(180deg, #0e1812 0%, #090e0c 100%)',
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
              {section.items.map((item) => {
                const { accent, glow } = getThemeStyles(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 py-2 rounded-lg text-sm transition-all duration-150 ${
                        isActive ? 'font-semibold' : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`
                    }
                    style={({ isActive }) => ({
                      paddingLeft: '10px',
                      paddingRight: '10px',
                      background: isActive
                        ? (isLight ? 'var(--moss)' : `linear-gradient(90deg, ${glow}, transparent 80%)`)
                        : 'transparent',
                      color: isActive ? accent : 'var(--paper-dim)',
                      borderLeft: isActive ? `2px solid ${accent}` : '2px solid transparent',
                      boxShadow: (isActive && !isLight) ? `0 0 12px ${glow}` : 'none',
                    })}
                  >
                    <item.icon size={15} style={{ color: 'inherit', opacity: 1 }} strokeWidth={1.8} />
                    <span className="text-[13px]">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="ledger-rule mx-4" />
      <div className="px-4 py-3">
        <div
          className="flex flex-col gap-2 p-3 rounded-xl border"
          style={{
            background: 'var(--color-surface-2)',
            borderColor: 'var(--color-surface-border)',
          }}
        >
          <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-text-secondary">
            <span>ESG Weighting</span>
            <span className="font-mono text-brand-400">100%</span>
          </div>
          
          {/* Segmented bar */}
          <div className="w-full h-2 rounded-full overflow-hidden flex bg-surface-3 border border-surface-border">
            {/* Environmental - 40% */}
            <div
              className="h-full bg-environmental relative group cursor-help"
              style={{ width: '40%' }}
              title="Environmental (40%): Tracks Carbon Scope 1/2/3 and operations targets"
            />
            {/* Social - 30% */}
            <div
              className="h-full bg-social relative group cursor-help border-l border-surface-border"
              style={{ width: '30%' }}
              title="Social (30%): CSR volunteer activities, XP levels, and rewards match rate"
            />
            {/* Governance - 30% */}
            <div
              className="h-full bg-governance relative group cursor-help border-l border-surface-border"
              style={{ width: '30%' }}
              title="Governance (30%): Compliance issue resolution, audits, and policy signs"
            />
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono text-text-tertiary mt-0.5">
            <span className="text-environmental font-semibold">Env 40%</span>
            <span className="text-social font-semibold">Soc 30%</span>
            <span className="text-governance font-semibold">Gov 30%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
