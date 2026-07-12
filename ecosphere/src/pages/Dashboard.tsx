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
import Card from '../components/ui/Card';
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
          Organization Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--paper-dim)' }}>
          Q3 2026 · aggregated in real time across operational nodes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* left column: concentric gauge + AI widget */}
        <div className="lg:col-span-1 flex flex-col gap-5">
          <Card className="flex items-center justify-center">
            <GrowthRingGauge
              environmental={overallScore.environmental}
              social={overallScore.social}
              governance={overallScore.governance}
              overall={overallScore.total}
            />
          </Card>
          
          {/* AI Executive Summary Widget */}
          <Card title="AI Executive Summary & Projections" eyebrow="Research Archetype 02">
            <div className="flex flex-col gap-3.5 my-1">
              {!aiSummary ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-paper-dim leading-relaxed">
                    Generate a natural-language report summarizing quarterly performance updates and next-period score projections.
                  </p>
                  <button
                    onClick={handleGenerateAiSummary}
                    disabled={aiLoading}
                    className="py-2 px-3 rounded bg-moss hover:bg-white/10 text-paper font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {aiLoading ? 'Analyzing Performance...' : 'Generate AI ESG Executive Report'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="p-3 rounded bg-white/5 border border-moss-line text-xs leading-relaxed text-paper relative">
                    <span className="absolute top-2 right-2 px-1.5 py-0.2 rounded bg-amber text-ink text-[8px] font-extrabold tracking-wider">
                      AI-GENERATED
                    </span>
                    <p className="pr-12">{aiSummary}</p>
                  </div>
                  
                  {/* Projections deltas */}
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider text-paper-dim font-bold mb-2">
                      Projected Next-Quarter score shifts
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono-data">
                      <div className="p-2.5 rounded bg-canopy/10 border border-canopy/20">
                        <span className="text-[9px] uppercase tracking-wider text-canopy font-bold block mb-0.5">Env Shift</span>
                        <span className="text-sm font-bold text-paper">{aiForecast?.environmental.change}</span>
                      </div>
                      <div className="p-2.5 rounded bg-slate/10 border border-slate/20">
                        <span className="text-[9px] uppercase tracking-wider text-slate font-bold block mb-0.5">Soc Shift</span>
                        <span className="text-sm font-bold text-paper">{aiForecast?.social.change}</span>
                      </div>
                      <div className="p-2.5 rounded bg-amber/10 border border-amber/20">
                        <span className="text-[9px] uppercase tracking-wider text-amber font-bold block mb-0.5">Gov Shift</span>
                        <span className="text-sm font-bold text-paper">{aiForecast?.governance.change}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => { setAiSummary(''); setAiForecast(null); }}
                    className="py-1.5 text-center text-[10px] text-paper-dim hover:text-paper font-semibold font-sans cursor-pointer"
                  >
                    Clear Summary Report
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Live Aggregation KPI Tiles */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiTile
            label="Carbon this month"
            value={formattedCarbon}
            accent="var(--canopy)"
            delta="aggregated scope"
          />
          <KpiTile
            label="CSR participation"
            value={`${totalCsrRate}%`}
            accent="var(--slate)"
            delta="volunteering rate"
          />
          <KpiTile
            label="Open compliance"
            value={openComplianceCount.toString()}
            accent={openComplianceCount > 0 ? 'var(--alert)' : 'var(--paper)'}
            delta={overdueCount > 0 ? `${overdueCount} overdue` : '0 overdue'}
            deltaPositive={overdueCount === 0}
          />
          <KpiTile
            label="Active challenges"
            value={activeChallengesCount.toString()}
            accent="var(--amber)"
            delta="employee engagement"
          />
          <KpiTile
            label="Badges unlocked"
            value={totalBadgesUnlocked.toString()}
            accent="var(--amber)"
            delta="achievements unlocked"
          />
          <KpiTile
            label="Policy ack. rate"
            value={`${policyAckRate}%`}
            accent="var(--paper)"
            delta="compliance signoffs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Department Leaderboard Ranking table */}
        <Card className="lg:col-span-2" title="Department ESG Standings" eyebrow="Comparative Audit">
          <div className="overflow-x-auto my-2">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Code</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Department</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim text-center">Env</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim text-center">Soc</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim text-center">Gov</th>
                  <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim">Total ESG</th>
                </tr>
              </thead>
              <tbody>
                {sortedDepartments.map((dept) => (
                  <tr key={dept.id} className="border-b hover:bg-white/5" style={{ borderColor: 'var(--moss-line)' }}>
                    <td className="py-2.5 px-3 text-sm font-mono-data text-paper">{dept.code}</td>
                    <td className="py-2.5 px-3 text-sm text-paper">{dept.name}</td>
                    <td className="py-2.5 px-3 text-sm font-mono-data text-center text-canopy">{dept.env}</td>
                    <td className="py-2.5 px-3 text-sm font-mono-data text-center text-slate">{dept.soc}</td>
                    <td className="py-2.5 px-3 text-sm font-mono-data text-center text-amber">{dept.gov}</td>
                    <td className="py-2.5 px-3 text-sm font-mono-data text-right text-paper font-bold">{dept.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Live Leaderboard Card */}
        <Card className="lg:col-span-1" title="Top Contributors" eyebrow="Leaderboard">
          <div className="flex flex-col gap-3 my-2">
            {topEmployees.map((emp) => (
              <div key={emp.id} className="flex justify-between items-center p-2.5 rounded bg-white/5 border border-moss-line">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono-data text-amber text-xs w-4">#{emp.rank}</span>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-paper">{emp.name}</div>
                    <span className="text-[9px] uppercase tracking-wider text-paper-dim font-mono-data">
                      Dept: {emp.deptCode}
                    </span>
                  </div>
                </div>
                <span className="font-mono-data text-xs text-amber font-semibold">{emp.xp} XP</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
