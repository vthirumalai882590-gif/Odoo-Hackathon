
import { useState, useEffect } from 'react';
import {
  db,
  collection,
  onSnapshot,
  setDoc,
  doc,
  runTransaction
} from '../lib/firebase';
import { checkAndAwardBadges } from '../lib/badges';
import type {
  Challenge,
  ChallengeParticipation,
  Employee,
  Badge,
  Reward,
  Department,
  AppNotification,
  ESGConfig
} from '../types';
import Card from '../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import {
  Coins,
  Award,
  Trophy,
  Target,
  Flame,
  ShieldAlert,
  Leaf,
  Users,
  CheckCircle2,
  Clock,
  Play,
  FileText,
  ChevronRight,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

// ESG Pillar metadata helper
const getPillarMeta = (categoryId: string = '') => {
  if (categoryId.startsWith('cat-env')) {
    return { label: 'Environmental', color: 'var(--color-environmental)', icon: <Leaf size={12} />, border: 'border-environmental', badgeColor: 'bg-environmental/10 text-environmental border-environmental/20' };
  }
  if (categoryId.startsWith('cat-soc')) {
    return { label: 'Social', color: 'var(--color-social)', icon: <Users size={12} />, border: 'border-social', badgeColor: 'bg-social/10 text-social border-social/20' };
  }
  return { label: 'Governance', color: 'var(--color-governance)', icon: <ShieldAlert size={12} />, border: 'border-governance', badgeColor: 'bg-governance/10 text-governance border-governance/20' };
};

// Custom Status Badge
function StatusBadge({ status }: { status: Challenge['status'] }) {
  let colorClass = '';
  let textClass = '';
  let icon = null;
  
  switch (status) {
    case 'Draft':
      colorClass = 'bg-zinc-500/10 border-zinc-500/25';
      textClass = 'text-zinc-400';
      icon = <FileText size={12} />;
      break;
    case 'Active':
      colorClass = 'bg-blue-500/10 border-blue-500/25';
      textClass = 'text-blue-400';
      icon = <Play size={12} />;
      break;
    case 'Under Review':
      colorClass = 'bg-amber-500/10 border-amber-500/25';
      textClass = 'text-amber-400';
      icon = <Clock size={12} />;
      break;
    case 'Completed':
      colorClass = 'bg-green-500/10 border-green-500/25';
      textClass = 'text-green-400';
      icon = <CheckCircle2 size={12} />;
      break;
    default:
      colorClass = 'bg-zinc-500/10 border-zinc-500/25';
      textClass = 'text-zinc-400';
      icon = <FileText size={12} />;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wider uppercase ${colorClass} ${textClass}`}>
      {icon}
      <span>{status}</span>
    </span>
  );
}

// Custom Difficulty Pill
function DifficultyPill({ level }: { level: Challenge['difficulty'] }) {
  let colorStyle = {};
  let icon = null;
  let bgClass = '';
  
  switch (level) {
    case 'Easy':
      colorStyle = { color: 'var(--color-diff-easy)', borderColor: 'rgba(74, 222, 128, 0.25)' };
      bgClass = 'bg-green-500/10';
      icon = <Leaf size={11} />;
      break;
    case 'Medium':
      colorStyle = { color: 'var(--color-diff-medium)', borderColor: 'rgba(251, 191, 36, 0.25)' };
      bgClass = 'bg-yellow-500/10';
      icon = <Flame size={11} />;
      break;
    case 'Hard':
      colorStyle = { color: 'var(--color-diff-hard)', borderColor: 'rgba(248, 113, 113, 0.25)' };
      bgClass = 'bg-red-500/10';
      icon = <ShieldAlert size={11} />;
      break;
    default:
      colorStyle = { color: 'var(--color-text-secondary)', borderColor: 'rgba(255, 255, 255, 0.1)' };
      bgClass = 'bg-white/5';
      icon = <Target size={11} />;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${bgClass}`}
      style={colorStyle}
    >
      {icon}
      <span>{level}</span>
    </span>
  );
}

export default function Gamification() {
  const [activeTab, setActiveTab] = useState<'challenges' | 'approvals' | 'rewards' | 'leaderboard'>('challenges');

  // DB States
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participations, setParticipations] = useState<ChallengeParticipation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [config, setConfig] = useState<ESGConfig | null>(null);

  // Active User Simulation State
  const [activeEmpId, setActiveEmpId] = useState<string>('emp-thiru');

  // Collapsed status for Archived challenges
  const [showArchived, setShowArchived] = useState(false);

  // Celebratory Badge Unlock State
  const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null);

  // Messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // UX states
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Leaderboard Filter
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 7) {
        setLoading(false);
      }
    };

    const unsubChallenges = onSnapshot(collection(db, 'challenges'), (snap: any) => {
      const list: Challenge[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setChallenges(list);
      checkLoaded();
    });

    const unsubParts = onSnapshot(collection(db, 'challengeParticipations'), (snap: any) => {
      const list: ChallengeParticipation[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setParticipations(list);
      checkLoaded();
    });

    const unsubEmps = onSnapshot(collection(db, 'employees'), (snap: any) => {
      const list: Employee[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setEmployees(list);
      checkLoaded();
    });

    const unsubBadges = onSnapshot(collection(db, 'badges'), (snap: any) => {
      const list: Badge[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setBadges(list);
      checkLoaded();
    });

    const unsubRewards = onSnapshot(collection(db, 'rewards'), (snap: any) => {
      const list: Reward[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setRewards(list);
      checkLoaded();
    });

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap: any) => {
      const list: Department[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setDepartments(list);
      checkLoaded();
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'esgConfig'), (snap: any) => {
      if (snap.exists()) {
        setConfig(snap.data());
      }
      checkLoaded();
    });

    return () => {
      unsubChallenges();
      unsubParts();
      unsubEmps();
      unsubBadges();
      unsubRewards();
      unsubDepts();
      unsubConfig();
    };
  }, []);

  const activeEmployee = employees.find((e) => e.id === activeEmpId) || employees[0];

  // Points tween state
  const [displayedPoints, setDisplayedPoints] = useState(0);

  useEffect(() => {
    if (!activeEmployee) return;
    let start = displayedPoints;
    const end = activeEmployee.points;
    if (start === end) return;

    const duration = 800; // 0.8s count-up
    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress * (2 - progress); // ease-out quad
      const currentPoints = Math.round(start + (end - start) * ease);
      setDisplayedPoints(currentPoints);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeEmployee?.points]);

  // Sync displayedPoints when activeEmployee changes to avoid animating from previous employee's score
  useEffect(() => {
    if (activeEmployee) {
      setDisplayedPoints(activeEmployee.points);
    }
  }, [activeEmpId, activeEmployee]);

  // Helper to trigger badge auto-award checks
  const runBadgeChecks = async (employee: Employee) => {
    if (!config?.badgeAutoAward) return;

    // Count stats
    const completedChallengesCount = participations.filter(
      (p) => p.employeeId === employee.id && p.approvalStatus === 'Approved'
    ).length;

    // Fetch CSR count
    const csrCount = 2; // Stub/mock value or fetch from employeeParticipations

    await checkAndAwardBadges(
      employee,
      badges,
      completedChallengesCount,
      csrCount,
      (badge) => {
        setUnlockedBadge(badge);
      }
    );
  };

  // Click-to-advance challenge status
  const handleAdvanceChallenge = async (challenge: Challenge) => {
    const statusOrder: Challenge['status'][] = ['Draft', 'Active', 'Under Review', 'Completed', 'Archived'];
    const currIdx = statusOrder.indexOf(challenge.status);
    if (currIdx === -1 || currIdx === statusOrder.length - 1) return;

    const nextStatus = statusOrder[currIdx + 1];
    try {
      await setDoc(doc(db, 'challenges', challenge.id), { status: nextStatus }, { merge: true });
    } catch (e: any) {
      setErrorMsg('Failed to update challenge status: ' + e.message);
    }
  };

  // Approve challenge participation and award XP
  const handleApproveParticipation = async (part: ChallengeParticipation, challengeXp: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await runTransaction(db, async (transaction) => {
        const empRef = doc(db, 'employees', part.employeeId);
        const partRef = doc(db, 'challengeParticipations', part.id);

        const empSnap = await transaction.get(empRef);
        if (!empSnap.exists()) {
          throw new Error('Employee record not found.');
        }

        const employee = empSnap.data() as Employee;
        const newXp = (employee.xp || 0) + challengeXp;

        transaction.update(empRef, { xp: newXp });
        transaction.update(partRef, { approvalStatus: 'Approved' });
      });

      showToast({ message: `Approved! Credited ${challengeXp} XP to employee profile.`, type: 'success' });

      const updatedEmp = employees.find((e) => e.id === part.employeeId);
      if (updatedEmp) {
        const empCopy = { ...updatedEmp, xp: updatedEmp.xp + challengeXp };
        await runBadgeChecks(empCopy);
      }
    } catch (e: any) {
      setErrorMsg('Approval transaction failed: ' + e.message);
      showToast({ message: 'Approval failed: ' + e.message, type: 'error' });
    }
  };

  // Reward Redemption Transaction
  const handleRedeemReward = async (reward: Reward) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!activeEmployee) {
      setErrorMsg('No active user selected to run redemption.');
      return;
    }

    if (activeEmployee.points < reward.pointsRequired) {
      setErrorMsg('Insufficient points to redeem this item.');
      showToast({ message: 'Insufficient points to redeem this item.', type: 'error' });
      return;
    }

    if (reward.stock <= 0) {
      setErrorMsg('Item is currently out of stock.');
      showToast({ message: 'Item is currently out of stock.', type: 'error' });
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const empRef = doc(db, 'employees', activeEmployee.id);
        const rewRef = doc(db, 'rewards', reward.id);

        const empSnap = await transaction.get(empRef);
        const rewSnap = await transaction.get(rewRef);

        if (!empSnap.exists() || !rewSnap.exists()) {
          throw new Error('Database records missing.');
        }

        const empData = empSnap.data() as Employee;
        const rewData = rewSnap.data() as Reward;

        // Double check limits atomically
        if (empData.points < rewData.pointsRequired) {
          throw new Error('Insufficient points.');
        }
        if (rewData.stock <= 0) {
          throw new Error('Out of stock.');
        }

        const nextPoints = empData.points - rewData.pointsRequired;
        const nextStock = rewData.stock - 1;

        transaction.update(empRef, { points: nextPoints });
        transaction.update(rewRef, { stock: nextStock });

        // Generate notification
        const notifId = `notif-${Math.random().toString(36).substring(2, 9)}`;
        const notif: AppNotification = {
          id: notifId,
          type: 'CSRApprovalDecision', // reuse type for ledger alerts
          recipientEmployeeId: activeEmployee.id,
          message: `Redeemed reward: "${reward.name}" for ${reward.pointsRequired} points. Remaining stock: ${nextStock}`,
          read: false,
          createdAt: new Date().toISOString()
        };
        transaction.set(doc(db, 'notifications', notifId), notif);
      });

      showToast({ message: `Redeemed ${reward.name} successfully!`, type: 'success' });
    } catch (e: any) {
      setErrorMsg('Redemption failed: ' + e.message);
      showToast({ message: 'Redemption failed: ' + e.message, type: 'error' });
    }
  };

  // Leaderboard data calculation
  const leaderboardData = employees
    .map((emp) => {
      const dept = departments.find((d) => d.id === emp.departmentId);
      return {
        id: emp.id,
        name: emp.name,
        deptId: emp.departmentId,
        deptName: dept ? dept.name : 'Unknown',
        xp: emp.xp || 0
      };
    })
    .filter((entry) => !selectedDeptId || entry.deptId === selectedDeptId)
    .sort((a, b) => b.xp - a.xp)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Skeleton Loading State */}
      {loading ? (
        <div className="flex flex-col gap-6 animate-fade-in">
          <Card title="Loading Dashboard...">
            <div className="flex flex-col md:flex-row gap-6">
              <Skeleton width="60px" height="60px" variant="circular" />
              <div className="flex-1 flex flex-col gap-3">
                <Skeleton width="40%" height="16px" />
                <Skeleton width="100%" height="10px" />
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <>
          {/* Simulation selector for Odoo hackathon validation */}
          <Card
            accentColor="var(--amber)"
            className="mb-6"
            noPadding
          >
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-0.5" style={{ color: 'var(--amber)' }}>Hackathon User Simulation</div>
                <div className="text-sm text-paper mt-1">Select an active user to view gamification dashboard and test redemptions:</div>
              </div>
              <select
                value={activeEmpId}
                onChange={(e) => {
                  setActiveEmpId(e.target.value);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="px-3 py-1.5 rounded bg-moss border border-moss-line text-paper font-semibold text-sm cursor-pointer focus:outline-none focus:border-amber"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id} style={{ background: 'var(--ink-raised)', color: 'var(--paper)' }}>
                    {emp.name} ({emp.role} · {emp.xp} XP · {emp.points} pts)
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Hero Profile Card — 3-zone premium design */}
          {activeEmployee && (
            <motion.div
              key={activeEmployee.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-2xl border grid grid-cols-1 md:grid-cols-3 gap-0 elevation-2"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-surface-border)' }}
            >
              {/* Rotating border glow overlay */}
              <div className="rotating-border-glow" />

              {/* Zone A — Identity */}
              <div className="relative z-10 flex items-center gap-4 p-6 border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--color-surface-border)' }}>
                <motion.div
                  whileHover={{ rotateY: 8, rotateX: -4, scale: 1.05 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ perspective: 800 }}
                  className="relative"
                >
                  {/* Tier ring */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-surface-3), var(--color-surface-2))',
                      border: '2px solid var(--color-xp-gold)',
                      boxShadow: '0 0 16px var(--color-xp-glow)',
                      color: 'var(--color-xp-gold)',
                    }}
                  >
                    {activeEmployee.name[0]}
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 bg-brand-500" style={{ borderColor: 'var(--color-surface-2)' }} />
                </motion.div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-0.5" style={{ color: 'var(--color-xp-gold)' }}>
                    {activeEmployee.badgeIds?.length > 1 ? 'Silver Tier' : 'Bronze Tier'}
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{activeEmployee.name}</h2>
                  <p className="text-xs uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {departments.find((d) => d.id === activeEmployee.departmentId)?.name || 'EcoSphere Member'}
                  </p>
                  {/* Earned badges */}
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {activeEmployee.badgeIds?.slice(0, 3).map((bid) => (
                      <span key={bid} className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-xp-gold/10 text-xp-gold border border-xp-gold/20">
                        <Award size={9} className="inline mr-0.5" />
                        {badges.find(b => b.id === bid)?.name || bid}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Zone B — XP Progress */}
              <div className="relative z-10 flex flex-col justify-center gap-3 p-6 border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--color-surface-border)' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} style={{ color: 'var(--color-xp-gold)' }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>XP Progress</span>
                  </div>
                  <span
                    className="text-2xl font-bold font-mono"
                    style={{ color: 'var(--color-xp-gold)', textShadow: '0 0 20px var(--color-xp-glow)' }}
                  >
                    {activeEmployee.xp.toLocaleString()}
                    <span className="text-xs font-semibold ml-1" style={{ color: 'var(--color-text-tertiary)' }}>XP</span>
                  </span>
                </div>

                {/* Thick XP bar with milestone ticks */}
                <div className="relative w-full h-3 rounded-full overflow-visible" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, var(--color-xp-gold), var(--color-brand-400))',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((activeEmployee.xp / 1500) * 100, 100)}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                  {/* Comet glow at leading edge */}
                  <motion.div
                    className="absolute top-0 h-full w-4 rounded-full blur-sm"
                    style={{ background: 'var(--color-xp-gold)', opacity: 0.6 }}
                    initial={{ left: 0 }}
                    animate={{ left: `calc(${Math.min((activeEmployee.xp / 1500) * 100, 100)}% - 16px)` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                  {/* Milestone tick marks at 500, 1000, 1500 */}
                  {[500, 1000].map((milestone) => (
                    <div
                      key={milestone}
                      className="absolute top-[-3px] w-0.5 h-[18px] rounded-full"
                      style={{
                        left: `${(milestone / 1500) * 100}%`,
                        background: activeEmployee.xp >= milestone ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                      }}
                    />
                  ))}
                </div>

                <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
                  <span>0</span>
                  <span style={{ color: activeEmployee.xp >= 500 ? 'var(--color-xp-gold)' : 'var(--color-text-tertiary)' }}>500</span>
                  <span style={{ color: activeEmployee.xp >= 1000 ? 'var(--color-xp-gold)' : 'var(--color-text-tertiary)' }}>1,000</span>
                  <span>1,500</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-brand-400)' }}>
                  <ArrowUpRight size={13} />
                  <span>{Math.max(0, 1500 - activeEmployee.xp)} XP to next tier</span>
                </div>
              </div>

              {/* Zone C — Points Wallet */}
              <div className="relative z-10 flex flex-col justify-center items-center gap-2 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Coins size={16} style={{ color: 'var(--color-xp-gold)' }} />
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Redeemable Balance</span>
                </div>
                <div
                  className="text-5xl font-bold font-mono"
                  style={{
                    color: 'var(--color-xp-gold)',
                    textShadow: '0 0 32px var(--color-xp-glow)',
                  }}
                >
                  {displayedPoints.toLocaleString()}
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Points</span>
                <div className="mt-2 text-[10px] text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                  Earned from challenges &amp; activities
                </div>
              </div>
            </motion.div>
          )}

          {/* Tabs — Framer Motion sliding indicator */}
          <div className="flex border-b relative" style={{ borderColor: 'var(--color-surface-border)' }}>
            {([
              { id: 'challenges', label: 'Challenges Board', icon: <Target size={14} /> },
              { id: 'approvals', label: 'Approvals Queue', icon: <CheckCircle2 size={14} /> },
              { id: 'rewards', label: 'Rewards Catalog', icon: <Trophy size={14} /> },
              { id: 'leaderboard', label: 'Leaderboard', icon: <Award size={14} /> }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="relative px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors duration-150 cursor-pointer"
                style={{ color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'var(--color-brand-500)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded border border-alert bg-alert/10 text-sm text-alert font-medium animate-pulse">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded border border-canopy bg-canopy/10 text-sm text-paper font-medium">
              {successMsg}
            </div>
          )}

          {/* Sub tabs contents */}
          {activeTab === 'challenges' && (
            <div className="flex flex-col gap-6">
              {/* Kanban Board */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {([
                  { status: 'Draft' as Challenge['status'], accentColor: 'var(--color-status-draft)', badgeBg: 'bg-zinc-500/10', badgeText: 'text-zinc-400' },
                  { status: 'Active' as Challenge['status'], accentColor: 'var(--color-status-active)', badgeBg: 'bg-blue-500/10', badgeText: 'text-blue-400' },
                  { status: 'Under Review' as Challenge['status'], accentColor: 'var(--color-status-review)', badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-400' },
                  { status: 'Completed' as Challenge['status'], accentColor: 'var(--color-status-complete)', badgeBg: 'bg-green-500/10', badgeText: 'text-green-400' },
                ]).map(({ status, accentColor, badgeBg, badgeText }) => {
                  const list = challenges.filter((c) => c.status === status);
                  return (
                    <div
                      key={status}
                      className="rounded-2xl border flex flex-col min-h-[300px] elevation-1 overflow-hidden"
                      style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-surface-border)' }}
                    >
                      {/* Column header with status left accent bar */}
                      <div
                        className="flex justify-between items-center px-4 py-3"
                        style={{ borderBottom: `3px solid ${accentColor}`, background: `color-mix(in srgb, ${accentColor} 6%, transparent)` }}
                      >
                        <div className="flex items-center gap-2">
                          <StatusBadge status={status} />
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${badgeBg} ${badgeText}`}>
                          {list.length}
                        </span>
                      </div>

                      {/* Cards */}
                      <motion.div
                        className="flex flex-col gap-3 p-3 flex-1"
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                      >
                        {list.map((c, i) => {
                          const pillar = getPillarMeta(c.categoryId);
                          return (
                            <motion.div
                              key={c.id}
                              custom={i}
                              variants={{
                                hidden: { opacity: 0, y: 12 },
                                visible: (idx: number) => ({
                                  opacity: 1, y: 0,
                                  transition: { delay: idx * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }
                                })
                              }}
                              whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.45)' }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                              className="relative rounded-xl border flex flex-col gap-3 overflow-hidden cursor-default group elevation-1"
                              style={{
                                background: 'var(--color-surface-3)',
                                borderColor: 'var(--color-surface-border-strong)',
                              }}
                            >
                              {/* Pillar top border accent */}
                              <div className="h-0.5 w-full" style={{ background: pillar.color }} />

                              <div className="px-3 pb-0 flex flex-col gap-2">
                                {/* Pillar tag */}
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider self-start ${pillar.badgeColor}`}
                                >
                                  {pillar.icon}
                                  {pillar.label}
                                </span>

                                <h4 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                                  {c.title}
                                </h4>
                                <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                                  {c.description}
                                </p>
                              </div>

                              {/* XP + Difficulty row */}
                              <div className="flex justify-between items-center px-3 pb-1 pt-1 border-t" style={{ borderColor: 'var(--color-surface-border)' }}>
                                <div className="flex items-center gap-1.5">
                                  <Sparkles size={12} style={{ color: 'var(--color-xp-gold)' }} />
                                  <span
                                    className="font-bold font-mono text-sm"
                                    style={{ color: 'var(--color-xp-gold)', textShadow: '0 0 10px var(--color-xp-glow)' }}
                                  >
                                    +{c.xp} XP
                                  </span>
                                </div>
                                <DifficultyPill level={c.difficulty} />
                              </div>

                              {/* Advance Status button */}
                              {status !== 'Completed' && (
                                <button
                                  onClick={() => handleAdvanceChallenge(c)}
                                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-bold tracking-wider transition-all duration-200 cursor-pointer group-hover:opacity-100 opacity-90"
                                  style={{
                                    background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                                    color: accentColor,
                                    borderTop: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
                                  }}
                                  onMouseOver={e => (e.currentTarget.style.background = `color-mix(in srgb, ${accentColor} 22%, transparent)`)}
                                  onMouseOut={e => (e.currentTarget.style.background = `color-mix(in srgb, ${accentColor} 12%, transparent)`)}
                                >
                                  Advance
                                  <motion.span
                                    initial={{ x: 0 }}
                                    whileHover={{ x: 4 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    <ChevronRight size={13} />
                                  </motion.span>
                                </button>
                              )}
                              {status === 'Completed' && (
                                <div
                                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold"
                                  style={{ color: 'var(--color-status-complete)', borderTop: '1px solid rgba(34,197,94,0.15)' }}
                                >
                                  <CheckCircle2 size={12} />
                                  Completed
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                        {list.length === 0 && (
                          <div className="flex-1 flex items-center justify-center text-center py-8">
                            <div>
                              <div className="text-2xl mb-2">📋</div>
                              <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>No {status.toLowerCase()} challenges</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>

              {/* Archived Challenges Collapsible Section */}
              <div className="border border-moss-line rounded-lg">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="w-full flex justify-between items-center px-4 py-3 text-xs uppercase tracking-wider text-paper-dim hover:text-paper font-bold bg-white/5 cursor-pointer"
                >
                  <span>Archived Challenges Archive ({challenges.filter((c) => c.status === 'Archived').length})</span>
                  <span>{showArchived ? '▲ Collapse' : '▼ Expand'}</span>
                </button>
                {showArchived && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-t border-moss-line">
                    {challenges.filter((c) => c.status === 'Archived').map((c) => (
                      <div key={c.id} className="p-3 rounded bg-white/5 border border-moss-line flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-paper">{c.title}</h4>
                        <span className="text-[10px] text-paper-dim line-clamp-2">{c.description}</span>
                        <span className="text-[10px] font-mono-data text-amber font-semibold mt-1">+{c.xp} XP (Archived)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <Card title="Challenge Submissions Review Queue">
              <div className="overflow-x-auto my-2 animate-fade-in">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                      <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Employee</th>
                      <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Challenge</th>
                      <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Evidence proof</th>
                      <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Progress Bar</th>
                      <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Quality</th>
                      <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Status</th>
                      <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim font-sans">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8">
                          <EmptyState
                            title="All caught up"
                            description="No challenge submissions awaiting evaluation."
                          />
                        </td>
                      </tr>
                    ) : (
                      participations.map((part) => {
                        const emp = employees.find((e) => e.id === part.employeeId);
                        const chal = challenges.find((c) => c.id === part.challengeId);
                        if (!chal) return null;
                        const isQualitySane = part.proofUrl && part.proofUrl.startsWith('http') && part.progress === 100;
                        return (
                          <tr key={part.id} className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                            <td className="py-2.5 px-3 text-sm text-paper font-semibold">{emp ? emp.name : 'Unknown'}</td>
                            <td className="py-2.5 px-3 text-sm text-paper-dim">
                              <div>{chal.title}</div>
                              <span className="text-[10px] text-amber font-mono-data">+{chal.xp} XP</span>
                            </td>
                            <td className="py-2.5 px-3 text-sm font-mono-data">
                              {part.proofUrl ? (
                                <a href={part.proofUrl} target="_blank" rel="noreferrer" className="text-canopy underline hover:text-canopy-dim">
                                  View Evidence
                                </a>
                              ) : (
                                <span className="text-paper-dim">Self-Declared (No evidence link)</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-sm font-mono-data">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 rounded bg-white/5 overflow-hidden">
                                  <div className="h-full bg-canopy" style={{ width: `${part.progress}%` }} />
                                </div>
                                <span>{part.progress}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-sm">
                              {isQualitySane ? (
                                <span className="px-1.5 py-0.5 rounded bg-canopy/10 text-canopy border border-canopy/20 text-[9px] font-semibold animate-fade-in" title="Databricks/Trifacta Grounded Quality: Evidence proof is complete & progress is 100%">
                                  Complete
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-alert/10 text-alert border border-alert/20 text-[9px] font-semibold animate-fade-in" title="Databricks/Trifacta Grounded Quality: Incomplete progress or missing evidence URL link">
                                  Needs Review
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-sm font-semibold">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${part.approvalStatus === 'Approved' ? 'bg-canopy/15 text-canopy' : part.approvalStatus === 'Rejected' ? 'bg-alert/15 text-alert' : 'bg-amber/15 text-amber'}`}>
                                {part.approvalStatus}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {part.approvalStatus === 'Pending' && (
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => handleApproveParticipation(part, chal.xp)}
                                    className="text-xs px-2.5 py-1 rounded bg-canopy hover:bg-canopy-dim text-white font-semibold font-sans cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'rewards' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                {rewards.map((reward, i) => {
                  const canAfford = activeEmployee ? activeEmployee.points >= reward.pointsRequired : false;
                  const hasStock = reward.stock > 0;
                  const activeRedemption = canAfford && hasStock;
                  const shortfall = reward.pointsRequired - (activeEmployee?.points || 0);
                  return (
                    <motion.div
                      key={reward.id}
                      custom={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -3 }}
                      className="relative rounded-2xl border flex flex-col justify-between overflow-hidden elevation-1"
                      style={{
                        background: 'var(--color-surface-2)',
                        borderColor: activeRedemption ? 'rgba(251,191,36,0.3)' : 'var(--color-surface-border)',
                        boxShadow: activeRedemption ? '0 0 20px rgba(251,191,36,0.08)' : undefined,
                      }}
                    >
                      {/* Gold shimmer top strip for affordable items */}
                      {activeRedemption && (
                        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, var(--color-xp-gold), var(--color-brand-400))' }} />
                      )}

                      <div className="p-5 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-surface-border-strong)' }}>
                            🌿
                          </div>
                          {!hasStock && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ color: 'var(--color-diff-hard)', borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
                              Out of Stock
                            </span>
                          )}
                          {hasStock && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-surface-3)' }}>
                              {reward.stock} left
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-sm font-bold mt-1" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{reward.name}</h3>
                          <p className="text-[11px] leading-relaxed mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>{reward.description}</p>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                          <Coins size={14} style={{ color: 'var(--color-xp-gold)' }} />
                          <span className="text-lg font-bold font-mono" style={{ color: 'var(--color-xp-gold)' }}>
                            {reward.pointsRequired}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>pts</span>
                        </div>
                      </div>

                      <div className="px-5 pb-5 flex flex-col gap-2">
                        <button
                          onClick={() => handleRedeemReward(reward)}
                          disabled={!activeRedemption}
                          title={!hasStock ? 'Out of stock' : !canAfford ? `Need ${shortfall} more pts` : undefined}
                          className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                          style={{
                            background: activeRedemption
                              ? 'linear-gradient(135deg, var(--color-xp-gold), #d97706)'
                              : 'var(--color-surface-3)',
                            color: activeRedemption ? '#000' : 'var(--color-text-tertiary)',
                            border: activeRedemption ? 'none' : '1px solid var(--color-surface-border)',
                            cursor: activeRedemption ? 'pointer' : 'not-allowed',
                            boxShadow: activeRedemption ? '0 4px 12px rgba(251,191,36,0.3)' : 'none',
                          }}
                        >
                          {activeRedemption ? '✦ Redeem Now' : !hasStock ? 'Out of Stock' : `Need ${shortfall} more pts`}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div
              className="rounded-2xl border overflow-hidden elevation-2"
              style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-surface-border)' }}
            >
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b" style={{ borderColor: 'var(--color-surface-border)' }}>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>Cumulative Performance</div>
                  <h3 className="text-lg font-bold mt-0.5" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Organization ESG Leaderboard</h3>
                </div>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm cursor-pointer focus:outline-none"
                  style={{
                    background: 'var(--color-surface-3)',
                    border: '1px solid var(--color-surface-border-strong)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <option value="" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}>All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id} style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Leaderboard rows */}
              <div className="divide-y" style={{ borderColor: 'var(--color-surface-border)' }}>
                {leaderboardData.length === 0 ? (
                  <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>No leaderboard entries match filters.</div>
                ) : (
                  leaderboardData.map((e, idx) => {
                    const isMe = e.id === activeEmpId;
                    const medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : null;
                    const maxXp = leaderboardData[0]?.xp || 1;
                    return (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center gap-4 px-6 py-3 transition-colors"
                        style={{
                          background: isMe ? 'color-mix(in srgb, var(--color-xp-gold) 5%, transparent)' : undefined,
                          borderLeft: isMe ? '3px solid var(--color-xp-gold)' : '3px solid transparent',
                        }}
                      >
                        {/* Rank */}
                        <div className="w-10 flex-shrink-0 flex items-center justify-center">
                          {medal ? (
                            <span className="text-xl">{medal}</span>
                          ) : (
                            <span className="text-sm font-bold font-mono" style={{ color: 'var(--color-text-tertiary)' }}>#{e.rank}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{
                            background: isMe ? 'linear-gradient(135deg, var(--color-xp-gold), #d97706)' : 'var(--color-surface-3)',
                            color: isMe ? '#000' : 'var(--color-text-secondary)',
                            border: isMe ? 'none' : '1px solid var(--color-surface-border-strong)',
                          }}
                        >
                          {e.name[0]}
                        </div>

                        {/* Name + dept */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: isMe ? 'var(--color-xp-gold)' : 'var(--color-text-primary)' }}>
                              {e.name}
                            </span>
                            {isMe && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--color-xp-gold)' }}>YOU</span>}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{e.deptName}</div>
                          {/* XP bar */}
                          <div className="mt-1.5 w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-border)' }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: isMe ? 'var(--color-xp-gold)' : 'var(--color-brand-500)' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(e.xp / maxXp) * 100}%` }}
                              transition={{ delay: idx * 0.04 + 0.2, duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                        </div>

                        {/* XP score */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold font-mono" style={{ color: isMe ? 'var(--color-xp-gold)' : 'var(--color-text-primary)' }}>
                            {e.xp.toLocaleString()}
                          </div>
                          <div className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>XP</div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Celebratory Badge Unlock Framer Motion Overlay */}
      <AnimatePresence>
        {unlockedBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className="p-8 rounded-lg border max-w-sm w-full flex flex-col items-center gap-6 shadow-2xl relative"
              style={{ background: 'var(--ink-raised)', borderColor: 'var(--amber)' }}
            >
              {/* Glowing ring background */}
              <div className="absolute w-24 h-24 rounded-full bg-amber/10 blur-xl animate-pulse" />

              <div className="w-20 h-20 rounded-full bg-moss border-2 border-amber flex items-center justify-center text-amber text-4xl shadow-lg relative z-10 animate-bounce">
                🏆
              </div>

              <div className="text-center relative z-10">
                <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-amber">
                  Badge Unlocked!
                </span>
                <h3 className="text-lg font-bold text-paper font-sans mt-1.5">{unlockedBadge.name}</h3>
                <p className="text-xs text-paper-dim mt-2 leading-relaxed max-w-[280px]">
                  {unlockedBadge.description}
                </p>
              </div>

              <button
                onClick={() => setUnlockedBadge(null)}
                className="px-6 py-2.5 rounded bg-amber hover:bg-amber-dim text-ink font-bold text-sm z-10 cursor-pointer shadow-md transition-colors"
              >
                Awesome!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
