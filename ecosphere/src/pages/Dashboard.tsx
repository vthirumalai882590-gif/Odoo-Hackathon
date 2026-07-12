import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, doc, callEsgAI } from '../lib/firebase';
import { calculateESGScores } from '../lib/scoring';
import type {
  Department,
  Employee,
  CarbonTransaction,
  EnvironmentalGoal,
  EmployeeParticipation,
  ChallengeParticipation,
  PolicyAcknowledgement,
  ComplianceIssue,
  Challenge,
  ESGConfig
} from '../types';
import GrowthRingGauge from '../components/ui/GrowthRingGauge';
import KpiTile from '../components/ui/KpiTile';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  // DB States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [carbonTransactions, setCarbonTransactions] = useState<CarbonTransaction[]>([]);
  const [goals, setGoals] = useState<EnvironmentalGoal[]>([]);
  const [csrParticipations, setCsrParticipations] = useState<EmployeeParticipation[]>([]);
  const [challengeParticipations, setChallengeParticipations] = useState<ChallengeParticipation[]>([]);
  const [policyAcks, setPolicyAcks] = useState<PolicyAcknowledgement[]>([]);
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [config, setConfig] = useState<ESGConfig>({
    weighting: { environmental: 40, social: 30, governance: 30 },
    autoEmissionCalculation: true,
    evidenceRequiredForCSR: true,
    badgeAutoAward: true,
    notificationsEnabled: { inApp: true, email: false }
  });

  const [loading, setLoading] = useState(true);

  // AI Helper States
  const [aiSummary, setAiSummary] = useState('');
  const [aiForecast, setAiForecast] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleGenerateAiSummary = async () => {
    setAiLoading(true);
    try {
      const result = await callEsgAI('generateSummaryAndForecast', { overall: overallScore });
      setAiSummary(result.summary);
      setAiForecast(result.forecast);
    } catch (e) {
      console.error('AI summary failed:', e);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap: any) => {
      const list: Department[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setDepartments(list);
    });

    const unsubEmps = onSnapshot(collection(db, 'employees'), (snap: any) => {
      const list: Employee[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setEmployees(list);
    });

    const unsubTxs = onSnapshot(collection(db, 'carbonTransactions'), (snap: any) => {
      const list: CarbonTransaction[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setCarbonTransactions(list);
    });

    const unsubGoals = onSnapshot(collection(db, 'environmentalGoals'), (snap: any) => {
      const list: EnvironmentalGoal[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setGoals(list);
    });

    const unsubCsr = onSnapshot(collection(db, 'employeeParticipations'), (snap: any) => {
      const list: EmployeeParticipation[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setCsrParticipations(list);
    });

    const unsubChalParts = onSnapshot(collection(db, 'challengeParticipations'), (snap: any) => {
      const list: ChallengeParticipation[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setChallengeParticipations(list);
    });

    const unsubAcks = onSnapshot(collection(db, 'policyAcknowledgements'), (snap: any) => {
      const list: PolicyAcknowledgement[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setPolicyAcks(list);
    });

    const unsubIssues = onSnapshot(collection(db, 'complianceIssues'), (snap: any) => {
      const list: ComplianceIssue[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setComplianceIssues(list);
    });



    const unsubChallenges = onSnapshot(collection(db, 'challenges'), (snap: any) => {
      const list: Challenge[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setChallenges(list);
      setLoading(false);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'esgConfig'), (snap: any) => {
      if (snap.exists()) {
        setConfig(snap.data());
      }
    });

    return () => {
      unsubDepts();
      unsubEmps();
      unsubTxs();
      unsubGoals();
      unsubCsr();
      unsubChalParts();
      unsubAcks();
      unsubIssues();

      unsubChallenges();
      unsubConfig();
    };
  }, []);

  // Compute live scores
  const scores = calculateESGScores({
    departments,
    employees,
    carbonTransactions,
    environmentalGoals: goals,
    employeeParticipations: csrParticipations,
    challengeParticipations,
    policyAcknowledgements: policyAcks,
    complianceIssues,
    config
  });

  const { overallScore, departmentScores } = scores;

  // Calculate KPI values
  // 1. Carbon this month
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const thisMonthTxs = carbonTransactions.filter((tx) => tx.date.startsWith(currentMonthStr));
  const carbonThisMonth = thisMonthTxs.reduce((sum, t) => sum + t.calculatedEmissions, 0);
  const formattedCarbon = (carbonThisMonth / 1000).toFixed(1) + 't'; // format in tonnes

  // 2. CSR participation rate
  const approvedCsrCount = csrParticipations.filter((p) => p.approvalStatus === 'Approved').length;
  const totalCsrRate = employees.length > 0 ? Math.round((approvedCsrCount / employees.length) * 100) : 0;

  // 3. Open compliance issues
  const openIssues = complianceIssues.filter((ci) => ci.status !== 'Resolved');
  const openComplianceCount = openIssues.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = openIssues.filter((ci) => ci.dueDate < todayStr).length;

  // 4. Active challenges count
  const activeChallengesCount = challenges.filter((c) => c.status === 'Active').length;

  // 5. Total Badges unlocked
  const totalBadgesUnlocked = employees.reduce((sum, emp) => sum + (emp.badgeIds || []).length, 0);

  // 6. Policy Acknowledgement rate
  const acknowledgedAcksCount = policyAcks.filter((ack) => ack.acknowledgedAt !== null).length;
  const policyAckRate = policyAcks.length > 0 ? Math.round((acknowledgedAcksCount / policyAcks.length) * 100) : 0;

  // Top 5 employees leaderboard
  const topEmployees = [...employees]
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
    .slice(0, 5)
    .map((emp, index) => {
      const dept = departments.find((d) => d.id === emp.departmentId);
      return {
        id: emp.id,
        name: emp.name,
        deptCode: dept ? dept.code : 'EXE',
        xp: emp.xp,
        rank: index + 1
      };
    });

  // Department Table list
  const sortedDepartments = departments.map((dept) => {
    const deptScore = departmentScores[dept.id] || {
      environmentalScore: 100,
      socialScore: 100,
      governanceScore: 100,
      totalScore: 100
    };
    return {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      env: deptScore.environmentalScore,
      soc: deptScore.socialScore,
      gov: deptScore.governanceScore,
      total: deptScore.totalScore
    };
  }).sort((a, b) => b.total - a.total);

  const avgTotalScore = sortedDepartments.length > 0
    ? sortedDepartments.reduce((sum, d) => sum + d.total, 0) / sortedDepartments.length
    : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-paper-dim">
        Loading ESG Ledger Dashboard...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {departments.length === 0 && (
        <div className="p-5 rounded-lg border border-amber/30 bg-amber/5 text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse">
          <div>
            <div className="font-bold text-amber font-sans">Platform Seed Required</div>
            <div className="text-paper-dim mt-1">To populate the platform with demonstration audit and carbon records, please seed the database.</div>
          </div>
          <Link
            to="/settings"
            className="px-4 py-2 rounded bg-amber hover:bg-amber-dim text-ink font-bold text-xs uppercase transition-colors shrink-0"
          >
            Go to Settings
          </Link>
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--paper)' }}>
          <span className="text-grad-canopy">Eco</span>Sphere
          <span className="text-base ml-2 font-body font-normal" style={{ color: 'var(--paper-dim)' }}>— Organization Dashboard</span>
        </h1>
        <p className="text-xs mt-1 flex items-center gap-2" style={{ color: 'var(--paper-dim)' }}>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full badge badge-green">● Live</span>
          Q3 2026 · aggregated in real time across all operational nodes
        </p>
      </div>

      {/* TOP ROW: ESG Gauge (compact) + 6 KPI Tiles aligned in same row */}
      <div className="grid grid-cols-12 gap-4 items-stretch">

        {/* ESG Ring Gauge — compact 3-col */}
        <div
          className="col-span-12 md:col-span-3 rounded-xl border p-4 flex flex-col items-center justify-center"
          style={{
            background: 'var(--ink-raised)',
            borderColor: 'var(--moss-line)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
            minHeight: '200px',
          }}
        >
          <GrowthRingGauge
            environmental={overallScore.environmental}
            social={overallScore.social}
            governance={overallScore.governance}
            overall={overallScore.total}
            size={160}
          />
        </div>

        {/* 6 KPI Tiles — 9-col, 3×2 grid */}
        <div className="col-span-12 md:col-span-9 grid grid-cols-3 gap-3">
          <KpiTile label="Carbon this month" value={formattedCarbon} accent="var(--canopy)" delta="aggregated scope" icon={<span style={{ fontSize: '14px' }}>🌿</span>} />
          <KpiTile label="CSR participation" value={`${totalCsrRate}%`} accent="var(--slate)" delta="volunteering rate" icon={<span style={{ fontSize: '14px' }}>🤝</span>} />
          <KpiTile
            label="Open compliance"
            value={openComplianceCount.toString()}
            accent={openComplianceCount > 0 ? 'var(--alert)' : 'var(--canopy)'}
            delta={overdueCount > 0 ? `${overdueCount} Proactive Risk Alerts` : '0 Risk Alerts'}
            deltaPositive={overdueCount === 0}
            icon={<span style={{ fontSize: '14px' }}>⚖️</span>}
          />
          <KpiTile label="Active challenges" value={activeChallengesCount.toString()} accent="var(--amber)" delta="employee engagement" icon={<span style={{ fontSize: '14px' }}>🏆</span>} />
          <KpiTile label="Badges unlocked" value={totalBadgesUnlocked.toString()} accent="var(--purple)" delta="achievements earned" icon={<span style={{ fontSize: '14px' }}>🎖️</span>} />
          <KpiTile label="Policy ack. rate" value={`${policyAckRate}%`} accent="var(--teal)" delta="compliance signoffs" icon={<span style={{ fontSize: '14px' }}>📋</span>} />
        </div>
      </div>

      {/* BOTTOM ROW: AI Summary | Department Table | Leaderboard */}
      <div className="grid grid-cols-12 gap-4">

        {/* AI Executive Summary */}
        <div
          className="col-span-12 md:col-span-4 rounded-xl border p-5 flex flex-col gap-3"
          style={{ background: 'var(--ink-raised)', borderColor: 'var(--moss-line)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-0.5" style={{ color: 'var(--purple)' }}>AI Analyst (FactSet + Preqin Mode)</div>
            <h3 className="font-display text-sm font-semibold" style={{ color: 'var(--paper)' }}>Executive Summary & Projections</h3>
          </div>
          {!aiSummary ? (
            <div className="flex flex-col gap-3 flex-1 justify-between">
              <p className="text-xs leading-relaxed" style={{ color: 'var(--paper-dim)' }}>
                Generate a natural-language report summarizing quarterly ESG performance and next-period score projections.
              </p>
              <button
                onClick={handleGenerateAiSummary}
                disabled={aiLoading}
                className="btn-primary text-xs justify-center"
                style={{ fontSize: '12px', padding: '8px 14px' }}
              >
                {aiLoading ? '⏳ Analyzing...' : '✨ Generate AI ESG Report'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div
                className="p-3 rounded-lg text-xs leading-relaxed relative"
                style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', color: 'var(--paper)' }}
              >
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-extrabold" style={{ background: 'var(--purple)', color: 'white' }}>AI</span>
                <p className="pr-8">{aiSummary}</p>
              </div>
              {aiForecast && (
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-mono-data">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(62,207,122,0.1)', border: '1px solid rgba(62,207,122,0.2)' }}>
                    <span className="text-[9px] uppercase block mb-0.5" style={{ color: 'var(--canopy)' }}>Env</span>
                    <span className="font-bold" style={{ color: 'var(--paper)' }}>{aiForecast?.environmental?.change}</span>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(91,141,238,0.1)', border: '1px solid rgba(91,141,238,0.2)' }}>
                    <span className="text-[9px] uppercase block mb-0.5" style={{ color: 'var(--slate)' }}>Soc</span>
                    <span className="font-bold" style={{ color: 'var(--paper)' }}>{aiForecast?.social?.change}</span>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)' }}>
                    <span className="text-[9px] uppercase block mb-0.5" style={{ color: 'var(--amber)' }}>Gov</span>
                    <span className="font-bold" style={{ color: 'var(--paper)' }}>{aiForecast?.governance?.change}</span>
                  </div>
                </div>
              )}
              <button onClick={() => { setAiSummary(''); setAiForecast(null); }} className="text-xs cursor-pointer" style={{ color: 'var(--paper-dim)' }}>
                Clear report
              </button>
            </div>
          )}
        </div>

        {/* Department ESG Standings */}
        <div
          className="col-span-12 md:col-span-5 rounded-xl border overflow-hidden"
          style={{ background: 'var(--ink-raised)', borderColor: 'var(--moss-line)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--moss-line)' }}>
            <div className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-0.5" style={{ color: 'var(--paper-dim)' }}>Comparative Audit</div>
            <h3 className="font-display text-sm font-semibold" style={{ color: 'var(--paper)' }}>Department ESG Standings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--moss-line)' }}>
                  <th className="py-2.5 px-4 text-[10px] uppercase tracking-wider" style={{ color: 'var(--paper-dim)' }}>Dept</th>
                  <th className="py-2.5 px-4 text-[10px] uppercase tracking-wider" style={{ color: 'var(--paper-dim)' }}>Name</th>
                  <th className="py-2.5 px-4 text-[10px] uppercase tracking-wider text-center" style={{ color: 'var(--canopy)' }}>Env</th>
                  <th className="py-2.5 px-4 text-[10px] uppercase tracking-wider text-center" style={{ color: 'var(--slate)' }}>Soc</th>
                  <th className="py-2.5 px-4 text-[10px] uppercase tracking-wider text-center" style={{ color: 'var(--amber)' }}>Gov</th>
                  <th className="py-2.5 px-4 text-[10px] uppercase tracking-wider text-right" style={{ color: 'var(--paper-dim)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedDepartments.map((dept) => {
                  const scoreDiff = dept.total - avgTotalScore;
                  const scoreDiffPercent = avgTotalScore > 0 ? (scoreDiff / avgTotalScore) * 100 : 0;
                  const formattedDiff = scoreDiffPercent >= 0 ? `+${scoreDiffPercent.toFixed(0)}%` : `${scoreDiffPercent.toFixed(0)}%`;
                  return (
                    <tr key={dept.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="py-2.5 px-4 text-xs font-mono-data font-semibold" style={{ color: 'var(--paper-dim)' }}>{dept.code}</td>
                      <td className="py-2.5 px-4 text-xs" style={{ color: 'var(--paper)' }}>{dept.name}</td>
                      <td className="py-2.5 px-4 text-xs font-mono-data text-center font-semibold" style={{ color: 'var(--canopy)' }}>{dept.env}</td>
                      <td className="py-2.5 px-4 text-xs font-mono-data text-center font-semibold" style={{ color: 'var(--slate)' }}>{dept.soc}</td>
                      <td className="py-2.5 px-4 text-xs font-mono-data text-center font-semibold" style={{ color: 'var(--amber)' }}>{dept.gov}</td>
                      <td className="py-2.5 px-4 text-xs font-mono-data text-right font-bold" style={{ color: 'var(--paper)' }}>
                        <div>{dept.total}</div>
                        <div
                          className={`text-[9px] font-sans font-normal mt-0.5 ${
                            scoreDiff >= 0 ? 'text-canopy' : 'text-alert'
                          }`}
                          title="Preqin/FactSet Comparative Benchmark vs. Org Average"
                        >
                          {formattedDiff} vs avg
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Contributors Leaderboard */}
        <div
          className="col-span-12 md:col-span-3 rounded-xl border p-5 flex flex-col gap-3"
          style={{ background: 'var(--ink-raised)', borderColor: 'var(--moss-line)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-0.5" style={{ color: 'var(--paper-dim)' }}>🏅 Leaderboard</div>
            <h3 className="font-display text-sm font-semibold" style={{ color: 'var(--paper)' }}>Top Contributors</h3>
          </div>
          <div className="flex flex-col gap-2">
            {topEmployees.map((emp) => {
              const medal = emp.rank === 1 ? '🥇' : emp.rank === 2 ? '🥈' : emp.rank === 3 ? '🥉' : null;
              const rankColor = emp.rank === 1 ? 'var(--amber)' : emp.rank === 2 ? 'var(--paper-mid)' : emp.rank === 3 ? '#cd7f32' : 'var(--paper-dim)';
              return (
                <div key={emp.id} className="flex justify-between items-center p-2.5 rounded-lg"
                  style={{ background: emp.rank <= 3 ? `${rankColor}10` : 'rgba(255,255,255,0.03)', border: `1px solid ${emp.rank <= 3 ? rankColor + '25' : 'rgba(255,255,255,0.06)'}` }}
                >
                  <div className="flex items-center gap-2">
                    {medal ? <span className="text-sm">{medal}</span> : <span className="font-mono-data text-[10px] w-4 text-center" style={{ color: 'var(--paper-dim)' }}>#{emp.rank}</span>}
                    <div>
                      <div className="text-xs font-semibold" style={{ color: 'var(--paper)' }}>{emp.name}</div>
                      <div className="text-[9px] uppercase font-mono-data" style={{ color: 'var(--paper-dim)' }}>{emp.deptCode}</div>
                    </div>
                  </div>
                  <span className="font-mono-data text-xs font-bold" style={{ color: rankColor }}>{emp.xp} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
