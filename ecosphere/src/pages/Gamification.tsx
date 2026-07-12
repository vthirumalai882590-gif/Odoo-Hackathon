
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

          {/* Hero Profile header */}
          {activeEmployee && (
            <div className="p-6 rounded-lg border grid grid-cols-1 md:grid-cols-3 gap-6 items-center" style={{ background: 'var(--ink-raised)', borderColor: 'var(--moss-line)' }}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold bg-moss text-amber border border-moss-line">
                  {activeEmployee.name[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold font-sans text-paper">{activeEmployee.name}</h2>
                  <p className="text-xs text-paper-dim uppercase tracking-wider mt-0.5">
                    {departments.find((d) => d.id === activeEmployee.departmentId)?.name || 'EcoSphere Member'}
                  </p>
                </div>
              </div>

              {/* Animated XP Fill Bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-paper-dim font-mono-data">
                  <span>XP Level progress</span>
                  <span className="text-amber font-semibold">{activeEmployee.xp} XP</span>
                </div>
                <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden border border-moss-line">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber to-amber-dim"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((activeEmployee.xp / 1500) * 100, 100)}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </div>
                <div className="text-[10px] text-right text-paper-dim font-mono-data">
                  Next badge threshold: 1,500 XP
                </div>
              </div>

              {/* Point wallet balance */}
              <div className="flex flex-col items-end md:border-l border-moss-line pl-6">
                <span className="text-xs uppercase tracking-wider text-paper-dim">Redeemable Balance</span>
                <span className="text-4xl font-extrabold font-mono-data text-amber mt-1">
                  {activeEmployee.points.toLocaleString()}
                  <span className="text-sm font-semibold text-paper-dim ml-1.5 uppercase font-sans">Points</span>
                </span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b animate-fade-in" style={{ borderColor: 'var(--moss-line)' }}>
            {(
              [
                { id: 'challenges', label: 'Challenges Board' },
                { id: 'approvals', label: 'Approvals Queue' },
                { id: 'rewards', label: 'Rewards Catalog' },
                { id: 'leaderboard', label: 'Organization Leaderboard' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-canopy text-paper font-semibold'
                  : 'border-transparent text-paper-dim hover:text-paper'
                  }`}
              >
                {tab.label}
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
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Kanban Board */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(['Draft', 'Active', 'Under Review', 'Completed'] as Challenge['status'][]).map((status) => {
                  const list = challenges.filter((c) => c.status === status);
                  return (
                    <div key={status} className="p-3 rounded-lg bg-white/5 border border-moss-line flex flex-col gap-3 min-h-[300px]">
                      <div className="flex justify-between items-center border-b border-moss-line pb-2 mb-1">
                        <span className="text-xs uppercase tracking-wider text-paper font-bold">{status}</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono-data text-paper-dim">{list.length}</span>
                      </div>
                      {list.map((c) => (
                        <div key={c.id} className="p-3 rounded bg-ink-raised border border-moss-line flex flex-col gap-2.5 shadow-sm">
                          <div>
                            <h4 className="text-xs font-bold text-paper font-sans">{c.title}</h4>
                            <p className="text-[10px] text-paper-dim line-clamp-2 mt-1 leading-relaxed">{c.description}</p>
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-mono-data pt-1.5 border-t border-moss-line/50">
                            <span className="text-amber font-semibold">+{c.xp} XP</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-paper-dim">{c.difficulty}</span>
                          </div>
                          <button
                            onClick={() => handleAdvanceChallenge(c)}
                            className="w-full py-1 text-[10px] uppercase font-bold text-center rounded bg-moss hover:bg-white/10 text-paper-dim hover:text-paper font-sans cursor-pointer transition-colors"
                          >
                            Advance Status
                          </button>
                        </div>
                      ))}
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
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Rewards Catalog */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {rewards.map((reward) => {
                  const canAfford = activeEmployee ? activeEmployee.points >= reward.pointsRequired : false;
                  const hasStock = reward.stock > 0;
                  const activeRedemption = canAfford && hasStock;
                  return (
                    <div key={reward.id} className="p-4 rounded-lg border bg-white/5 border-moss-line flex flex-col justify-between gap-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-paper-dim">Reward Item</span>
                        <h3 className="text-sm font-bold text-paper font-sans mt-0.5">{reward.name}</h3>
                        <p className="text-[11px] text-paper-dim leading-relaxed mt-1.5">{reward.description}</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs font-mono-data border-t border-moss-line/50 pt-3">
                          <span className="text-amber font-bold">{reward.pointsRequired} pts</span>
                          <span style={{ color: hasStock ? 'var(--paper-dim)' : 'var(--alert)' }}>
                            {hasStock ? `${reward.stock} left` : 'Out of Stock'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleRedeemReward(reward)}
                          disabled={!activeRedemption}
                          title={
                            !hasStock
                              ? "Out of stock - check back later"
                              : !canAfford
                                ? `Insufficient points - you need ${reward.pointsRequired - (activeEmployee?.points || 0)} more points`
                                : undefined
                          }
                          className={`w-full py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer ${activeRedemption
                            ? 'bg-amber hover:bg-amber-dim text-ink font-extrabold'
                            : 'bg-white/5 text-paper-dim cursor-not-allowed border border-moss-line'
                            }`}
                        >
                          Redeem Reward
                        </button>
                        {!activeRedemption && (
                          <span className="text-[10px] text-alert text-center block mt-1">
                            {!hasStock
                              ? 'Item Out of Stock'
                              : `Need ${reward.pointsRequired - (activeEmployee?.points || 0)} more pts`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <Card title="Organization ESG Leaderboard" eyebrow="Cumulative Performance">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xs text-paper-dim uppercase font-semibold">Active Ranking</div>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="px-2 py-1 rounded bg-moss border border-moss-line text-sm text-paper focus:outline-none focus:border-canopy cursor-pointer"
                >
                  <option value="" style={{ background: 'var(--ink-raised)', color: 'var(--paper)' }}>All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id} style={{ background: 'var(--ink-raised)', color: 'var(--paper)' }}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto animate-fade-in">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                      <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim font-sans w-12">Rank</th>
                      <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim font-sans">Employee</th>
                      <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim font-sans">Department</th>
                      <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim font-sans text-right">Performance XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-sm text-paper-dim">
                          No leaderboard entries match filters.
                        </td>
                      </tr>
                    ) : (
                      leaderboardData.map((e) => (
                        <tr
                          key={e.id}
                          className={`border-b hover:bg-white/5 ${e.id === activeEmpId ? 'bg-amber/5 font-semibold border-l-2 border-l-amber' : ''}`}
                          style={{ borderColor: 'var(--moss-line)' }}
                        >
                          <td className="py-2.5 px-3 text-sm font-mono-data text-amber">{e.rank}</td>
                          <td className="py-2.5 px-3 text-sm text-paper">{e.name}</td>
                          <td className="py-2.5 px-3 text-sm text-paper-dim">{e.deptName}</td>
                          <td className="py-2.5 px-3 text-sm font-mono-data text-right text-paper">{e.xp} XP</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
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
