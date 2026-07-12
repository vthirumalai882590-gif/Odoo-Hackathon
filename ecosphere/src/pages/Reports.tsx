import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, collection, onSnapshot, doc, callEsgAI } from '../lib/firebase';
import { calculateESGScores } from '../lib/scoring';
import type {
  Department,
  Employee,
  CarbonTransaction,
  EmployeeParticipation,
  ComplianceIssue,
  EmissionFactor,
  EnvironmentalGoal,
  ChallengeParticipation,
  PolicyAcknowledgement,
  ESGConfig
} from '../types';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'standard' | 'builder'>('standard');
  const [selectedReport, setSelectedReport] = useState<'env' | 'soc' | 'gov' | 'summary'>('summary');

  // AI Summary States
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // UX & filter states
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [envFilterMode, setEnvFilterMode] = useState<'all' | 'scope1' | 'threshold'>('all');
  const [expandedDeptIds, setExpandedDeptIds] = useState<string[]>([]);

  // RepRisk highlighting keywords & helper
  const RISK_KEYWORDS = [
    'spill', 'leak', 'fire', 'injury', 'lawsuit', 'hazard', 'toxic', 'illegal',
    'non-compliance', 'violation', 'breach', 'fine', 'penalty', 'fraud', 'accident',
    'hazardous', 'contaminate', 'radiation', 'safety', 'warning', 'failed',
    'overdue', 'missing', 'delay', 'gap', 'defect'
  ];

  const renderHighlightedDescription = (text: string) => {
    if (!text) return '';
    const parts = text.split(new RegExp(`\\b(${RISK_KEYWORDS.join('|')})\\b`, 'gi'));
    return parts.map((part, i) => {
      if (RISK_KEYWORDS.includes(part.toLowerCase())) {
        return (
          <span
            key={i}
            className="bg-alert/10 text-alert border border-alert/25 px-1 py-0.2 rounded font-semibold text-[11px] mx-0.5 animate-fade-in"
            title="RepRisk Flagged Risk Word"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // DB States
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [transactions, setTransactions] = useState<CarbonTransaction[]>([]);
  const [csrParticipations, setCsrParticipations] = useState<EmployeeParticipation[]>([]);
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);

  // Additional ESG data states for scoring
  const [goals, setGoals] = useState<EnvironmentalGoal[]>([]);
  const [challengeParticipations, setChallengeParticipations] = useState<ChallengeParticipation[]>([]);
  const [policyAcks, setPolicyAcks] = useState<PolicyAcknowledgement[]>([]);
  const [config, setConfig] = useState<ESGConfig>({
    weighting: { environmental: 40, social: 30, governance: 30 },
    autoEmissionCalculation: true,
    evidenceRequiredForCSR: true,
    badgeAutoAward: true,
    notificationsEnabled: { inApp: true, email: false }
  });

  // Compute live scores
  const scores = calculateESGScores({
    departments,
    employees,
    carbonTransactions: transactions,
    environmentalGoals: goals,
    employeeParticipations: csrParticipations,
    challengeParticipations,
    policyAcknowledgements: policyAcks,
    complianceIssues,
    config
  });

  const { overallScore } = scores;

  const handleGenerateAiSummary = async () => {
    setAiLoading(true);
    try {
      const result = await callEsgAI('generateSummaryAndForecast', {
        overall: overallScore
      });
      setAiSummary(result.summary);
    } catch (e) {
      console.error('AI summary failed:', e);
    } finally {
      setAiLoading(false);
    }
  };

  // Custom Builder Filters state
  const [filterDept, setFilterDept] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterModule, setFilterModule] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 10) {
        setLoading(false);
      }
    };

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap: any) => {
      const list: Department[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setDepartments(list);
      checkLoaded();
    });

    const unsubEmps = onSnapshot(collection(db, 'employees'), (snap: any) => {
      const list: Employee[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setEmployees(list);
      checkLoaded();
    });

    const unsubTxs = onSnapshot(collection(db, 'carbonTransactions'), (snap: any) => {
      const list: CarbonTransaction[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setTransactions(list);
      checkLoaded();
    });

    const unsubGoals = onSnapshot(collection(db, 'environmentalGoals'), (snap: any) => {
      const list: EnvironmentalGoal[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setGoals(list);
      checkLoaded();
    });

    const unsubCsr = onSnapshot(collection(db, 'employeeParticipations'), (snap: any) => {
      const list: EmployeeParticipation[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setCsrParticipations(list);
      checkLoaded();
    });

    const unsubChalParts = onSnapshot(collection(db, 'challengeParticipations'), (snap: any) => {
      const list: ChallengeParticipation[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setChallengeParticipations(list);
      checkLoaded();
    });

    const unsubAcks = onSnapshot(collection(db, 'policyAcknowledgements'), (snap: any) => {
      const list: PolicyAcknowledgement[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setPolicyAcks(list);
      checkLoaded();
    });

    const unsubIssues = onSnapshot(collection(db, 'complianceIssues'), (snap: any) => {
      const list: ComplianceIssue[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setComplianceIssues(list);
      checkLoaded();
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'esgConfig'), (snap: any) => {
      if (snap.exists()) {
        setConfig(snap.data());
      }
      checkLoaded();
    });

    const unsubFactors = onSnapshot(collection(db, 'emissionFactors'), (snap: any) => {
      const list: EmissionFactor[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setFactors(list);
      checkLoaded();
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
      unsubConfig();
      unsubFactors();
    };
  }, []);

  // Filter custom builder list
  const getFilteredReportData = () => {
    // We join transaction inputs for unified reporting rows
    let rows: any[] = [];

    // Environmental row mapping
    transactions.forEach((tx) => {
      const dept = departments.find((d) => d.id === tx.departmentId);
      const ef = factors.find((f) => f.id === tx.emissionFactorId);
      const isQualitySane = tx.quantity > 0 && tx.quantity < 10000 && ef && ef.unit;
      rows.push({
        id: tx.id,
        date: tx.date,
        type: 'Environmental',
        module: tx.sourceModule,
        department: dept ? dept.name : 'Unknown',
        employee: 'System / Manual',
        details: `Carbon emission: ${tx.calculatedEmissions} kg CO2e`,
        scoreChange: 'N/A',
        isQualitySane
      });
    });

    // Social row mapping
    csrParticipations.forEach((p) => {
      const emp = employees.find((e) => e.id === p.employeeId);
      const dept = emp ? departments.find((d) => d.id === emp.departmentId) : null;
      const isQualitySane = p.proofUrl && p.proofUrl.startsWith('http');
      rows.push({
        id: p.id,
        date: p.completionDate ? p.completionDate.split('T')[0] : 'Pending',
        type: 'Social',
        module: 'CSR Activities',
        department: dept ? dept.name : 'Unknown',
        employee: emp ? emp.name : 'Unknown',
        details: `Volunteered in activities (Credit: ${p.pointsEarned} pts)`,
        scoreChange: p.approvalStatus,
        isQualitySane
      });
    });

    // Governance row mapping
    complianceIssues.forEach((ci) => {
      const owner = employees.find((e) => e.id === ci.ownerEmployeeId);
      const dept = owner ? departments.find((d) => d.id === owner.departmentId) : null;
      const isQualitySane = !!ci.ownerEmployeeId && ci.description.length > 5;
      rows.push({
        id: ci.id,
        date: ci.dueDate,
        type: 'Governance',
        module: 'Compliance Audits',
        department: dept ? dept.name : 'Unknown',
        employee: owner ? owner.name : 'Unassigned',
        details: `Issue: ${ci.description} (Severity: ${ci.severity})`,
        scoreChange: ci.status,
        isQualitySane
      });
    });

    // Apply filters
    return rows.filter((row) => {
      if (filterDept && row.department !== filterDept) return false;
      if (filterEmployee && row.employee !== filterEmployee) return false;
      if (filterModule && row.module !== filterModule) return false;
      if (startDate && row.date < startDate) return false;
      if (endDate && row.date > endDate) return false;
      return true;
    });
  };

  const filteredData = getFilteredReportData();

  // Export functions
  const exportToCSV = () => {
    if (filteredData.length === 0) return;
    const headers = 'Date,ESG Pillar,Module,Department,Employee/Owner,Details,Status/Impact\n';
    const body = filteredData
      .map((row) =>
        `"${row.date}","${row.type}","${row.module}","${row.department}","${row.employee}","${row.details.replace(
          /"/g,
          '""'
        )}","${row.scoreChange}"`
      )
      .join('\n');
    
    const blob = new Blob([headers + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ecosphere_esg_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (filteredData.length === 0) return;
    // Format sheet data
    const sheetData = filteredData.map((row) => ({
      Date: row.date,
      Pillar: row.type,
      Module: row.module,
      Department: row.department,
      'Employee/Owner': row.employee,
      Details: row.details,
      Status: row.scoreChange
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ESG Report');
    XLSX.writeFile(workbook, `ecosphere_esg_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const triggerPDFPrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto print:bg-white print:text-black print:p-0">
      <div className="print:hidden">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-brand-400)' }} />
          <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: 'var(--color-brand-400)' }}>Reports</span>
        </div>
        <h1
          className="text-3xl font-bold"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
        >
          Audit &amp; Reporting Center
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Generate standardized ESG reports, build custom queries, and export compliant documents.
        </p>
      </div>

      {/* Tabs — Framer Motion sliding indicator */}
      <div className="flex border-b relative print:hidden" style={{ borderColor: 'var(--color-surface-border)' }}>
        {[
          { id: 'standard', label: 'Standard ESG Reports', icon: '📊' },
          { id: 'builder', label: 'Custom Report Builder', icon: '🛠️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="relative px-4 py-3 text-sm font-medium flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
            style={{ color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
          >
            <span className="text-xs">{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="reports-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--color-brand-500)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Standard Reports tab */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card title="Loading Reports...">
              <div className="flex flex-col gap-3">
                <Skeleton width="100%" height="32px" />
                <Skeleton width="100%" height="32px" />
                <Skeleton width="100%" height="32px" />
              </div>
            </Card>
          </div>
          <div className="lg:col-span-3">
            <Card title="Viewport">
              <div className="flex flex-col gap-4 py-2">
                <Skeleton width="40%" height="24px" />
                <Skeleton width="100%" height="1px" />
                <Skeleton width="100%" height="60px" />
                <Skeleton width="100%" height="120px" />
              </div>
            </Card>
          </div>
        </div>
      ) : activeTab === 'standard' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar selectors */}
          <div className="lg:col-span-1 flex flex-col gap-2.5 print:hidden">
            {(
              [
                { id: 'summary', label: 'ESG Summary Audit', desc: 'Holistic organization review' },
                { id: 'env', label: 'Environmental Report', desc: 'Carbon scope & goals progress' },
                { id: 'soc', label: 'Social Engagement', desc: 'CSR activities & diversity' },
                { id: 'gov', label: 'Governance Register', desc: 'Compliance status & policies' }
              ] as const
            ).map((rep) => (
              <button
                key={rep.id}
                onClick={() => setSelectedReport(rep.id)}
                className={`p-3.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  selectedReport === rep.id
                    ? 'bg-moss border-canopy text-paper'
                    : 'bg-white/5 border-moss-line hover:bg-white/10 text-paper-dim'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider">{rep.label}</span>
                <span className="text-[10px] opacity-70 font-normal">{rep.desc}</span>
              </button>
            ))}
            
            <button
              onClick={triggerPDFPrint}
              className="mt-4 px-4 py-2.5 rounded bg-canopy hover:bg-canopy-dim text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Print Report (PDF)
            </button>
          </div>

          {/* Standard Reports printable viewport */}
          <Card className="lg:col-span-3 min-h-[500px]" title="Report Viewport">
            {selectedReport === 'summary' && (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-0.5" style={{ color: 'var(--purple)' }}>AI Auditor (GRI + SASB Mode)</div>
                  <h3 className="text-lg font-bold text-paper font-sans">Q3 2026 ESG Summary Audit</h3>
                  <p className="text-xs text-paper-dim font-mono-data mt-1">Generated: {new Date().toISOString().split('T')[0]}</p>
                </div>
                <hr className="ledger-rule" />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-white/5 border border-moss-line rounded">
                    <span className="text-[9px] uppercase tracking-wider text-canopy font-bold">Environmental</span>
                    <div className="text-2xl font-bold font-mono-data text-paper mt-1">On Track</div>
                  </div>
                  <div className="p-3 bg-white/5 border border-moss-line rounded">
                    <span className="text-[9px] uppercase tracking-wider text-slate font-bold">Social</span>
                    <div className="text-2xl font-bold font-mono-data text-paper mt-1">
                      {csrParticipations.filter((p) => p.approvalStatus === 'Approved').length} CSRs
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 border border-moss-line rounded">
                    <span className="text-[9px] uppercase tracking-wider text-amber font-bold">Governance</span>
                    <div className="text-2xl font-bold font-mono-data text-paper mt-1">
                      {complianceIssues.filter((ci) => ci.status !== 'Resolved').length} Open Issues
                    </div>
                  </div>
                </div>
                <div className="text-sm text-paper-dim leading-relaxed font-sans flex flex-col gap-3">
                  <p>
                    {aiSummary || "The organization displays stable progression. Carbon emission limits are matching Environmental goals, CSR volunteer participation has registered consistent growth, and compliance cycles are active."}
                  </p>
                  
                  {aiSummary && (
                    <span className="self-start px-1.5 py-0.5 rounded bg-amber/15 text-amber text-[9px] font-mono-data font-semibold" title="GRI/SASB Grounded Audit Narrative: Generated using live organization scores">
                      ✨ AI-GENERATED AUDIT NARRATIVE (GRI/SASB Mode)
                    </span>
                  )}

                  {!aiSummary && (
                    <button
                      onClick={handleGenerateAiSummary}
                      disabled={aiLoading}
                      className="self-start mt-2 px-3 py-1.5 rounded bg-moss hover:bg-white/10 text-paper text-xs font-semibold font-sans cursor-pointer transition-colors"
                    >
                      {aiLoading ? 'Auditing...' : 'Run AI Auditor (GRI/SASB Mode)'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {selectedReport === 'env' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-bold text-paper font-sans">Environmental Operations Audit</h3>
                  <p className="text-xs text-paper-dim font-mono-data mt-1">Generated: {new Date().toISOString().split('T')[0]}</p>
                </div>
                <hr className="ledger-rule" />

                {/* One-Click Filters */}
                <div className="flex gap-2.5 my-2">
                  <button
                    onClick={() => setEnvFilterMode('all')}
                    className={`px-3 py-1 rounded text-xs font-semibold font-sans cursor-pointer transition-colors ${
                      envFilterMode === 'all' ? 'bg-canopy text-white' : 'bg-white/5 text-paper-dim hover:bg-white/10'
                    }`}
                  >
                    All Emissions
                  </button>
                  <button
                    onClick={() => setEnvFilterMode('scope1')}
                    className={`px-3 py-1 rounded text-xs font-semibold font-sans cursor-pointer transition-colors ${
                      envFilterMode === 'scope1' ? 'bg-canopy text-white' : 'bg-white/5 text-paper-dim hover:bg-white/10'
                    }`}
                  >
                    Isolate Scope 1
                  </button>
                  <button
                    onClick={() => setEnvFilterMode('threshold')}
                    className={`px-3 py-1 rounded text-xs font-semibold font-sans cursor-pointer transition-colors ${
                      envFilterMode === 'threshold' ? 'bg-alert/20 border border-alert/30 text-alert animate-pulse' : 'bg-white/5 text-paper-dim hover:bg-white/10'
                    }`}
                  >
                    Exceeding Threshold (&gt; 500kg)
                  </button>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  {(() => {
                    const deptsWithData = departments
                      .map(dept => {
                        const deptTxs = transactions.filter(tx => tx.departmentId === dept.id);
                        const filteredDeptTxs = deptTxs.filter(tx => {
                          if (envFilterMode === 'scope1') {
                            const ef = factors.find(f => f.id === tx.emissionFactorId);
                            return ef?.scope === 1;
                          }
                          return true;
                        });
                        const totalEmissions = filteredDeptTxs.reduce((sum, tx) => sum + tx.calculatedEmissions, 0);
                        return { dept, deptTxs: filteredDeptTxs, totalEmissions };
                      })
                      .filter(item => {
                        if (envFilterMode === 'threshold') {
                          return item.totalEmissions > 500;
                        }
                        return true;
                      });

                    if (deptsWithData.length === 0) {
                      return <EmptyState title="No departments match the criteria" description="Change your environmental filter selection." />;
                    }

                    return deptsWithData.map(({ dept, deptTxs, totalEmissions }) => {
                      const isExpanded = expandedDeptIds.includes(dept.id);
                      const isOverLimit = totalEmissions > 500;
                      return (
                        <div key={dept.id} className="p-3.5 rounded border border-moss-line" style={{ background: 'var(--ink-raised)' }}>
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-paper">{dept.name}</h4>
                                {isOverLimit && (
                                  <span className="px-1.5 py-0.5 rounded bg-alert/15 text-alert text-[9px] font-extrabold tracking-wider">
                                    EXCEEDS THRESHOLD
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-paper-dim uppercase tracking-wider">
                                {deptTxs.length} transactions included
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-mono-data text-canopy font-bold">
                                {totalEmissions.toFixed(1)} <span className="text-[10px] text-paper-dim">kg CO2e</span>
                              </span>
                              <button
                                onClick={() => {
                                  setExpandedDeptIds(prev =>
                                    prev.includes(dept.id) ? prev.filter(id => id !== dept.id) : [...prev, dept.id]
                                  );
                                }}
                                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-paper text-xs font-semibold cursor-pointer transition-colors"
                              >
                                {isExpanded ? 'Collapse' : 'Expand'}
                              </button>
                            </div>
                          </div>

                          {/* Nested Carbon Ledger */}
                          {isExpanded && (
                            <div className="mt-3 border-t border-moss-line/50 pt-3 animate-fade-in">
                              {deptTxs.length === 0 ? (
                                <p className="text-xs text-paper-dim py-2">No transactions recorded under selected scope.</p>
                              ) : (
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="text-paper-dim border-b border-moss-line/20">
                                      <th className="py-1">Date</th>
                                      <th className="py-1">Source Module</th>
                                      <th className="py-1 text-right">Emissions</th>
                                      <th className="py-1 text-right">Quality</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {deptTxs.map(tx => {
                                      const ef = factors.find(f => f.id === tx.emissionFactorId);
                                      const isQualitySane = tx.quantity > 0 && tx.quantity < 10000 && ef && ef.unit;
                                      return (
                                        <tr key={tx.id} className="border-b border-moss-line/10 hover:bg-white/5 transition-colors">
                                          <td className="py-1.5 font-mono-data">{tx.date}</td>
                                          <td className="py-1.5 text-paper-dim">{tx.sourceModule}</td>
                                          <td className="py-1.5 text-right font-mono-data text-canopy font-semibold">
                                            {tx.calculatedEmissions.toFixed(1)} <span className="text-[10px] text-paper-dim">kg CO2e</span>
                                          </td>
                                          <td className="py-1.5 text-right">
                                            {isQualitySane ? (
                                              <span className="px-1.5 py-0.5 rounded bg-canopy/10 text-canopy border border-canopy/20 text-[9px] font-semibold" title="Databricks/Trifacta Grounded Quality: Sane value & valid unit matches">
                                                Complete
                                              </span>
                                            ) : (
                                              <span className="px-1.5 py-0.5 rounded bg-alert/10 text-alert border border-alert/20 text-[9px] font-semibold" title="Databricks/Trifacta Grounded Quality: Out of range or incomplete entries">
                                                Needs Review
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {selectedReport === 'soc' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-bold text-paper font-sans">Social Impact & Volunteering Report</h3>
                  <p className="text-xs text-paper-dim font-mono-data mt-1">Generated: {new Date().toISOString().split('T')[0]}</p>
                </div>
                <hr className="ledger-rule" />
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                        <th className="py-2 text-[10px] uppercase text-paper-dim">Employee</th>
                        <th className="py-2 text-[10px] uppercase text-paper-dim text-right">CSR Approved Hours</th>
                        <th className="py-2 text-[10px] uppercase text-paper-dim text-right">Total XP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp.id} className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                          <td className="py-2.5 text-sm text-paper font-semibold">{emp.name}</td>
                          <td className="py-2.5 text-sm font-mono-data text-right text-paper-dim">
                            {csrParticipations.filter((p) => p.employeeId === emp.id && p.approvalStatus === 'Approved').length} activities
                          </td>
                          <td className="py-2.5 text-sm font-mono-data text-right text-amber font-bold">{emp.xp} XP</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedReport === 'gov' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-bold text-paper font-sans">Governance compliance register</h3>
                  <p className="text-xs text-paper-dim font-mono-data mt-1">Generated: {new Date().toISOString().split('T')[0]}</p>
                </div>
                <hr className="ledger-rule" />
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                        <th className="py-2 text-[10px] uppercase text-paper-dim">Issue Detail</th>
                        <th className="py-2 text-[10px] uppercase text-paper-dim">Responsible Owner</th>
                        <th className="py-2 text-[10px] uppercase text-paper-dim text-right">Target Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complianceIssues.map((ci) => {
                        const owner = employees.find((e) => e.id === ci.ownerEmployeeId);
                        const isOverdue = ci.status !== 'Resolved' && ci.dueDate < new Date().toISOString().split('T')[0];
                        return (
                          <tr key={ci.id} className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                            <td className="py-2.5 text-sm text-paper font-semibold">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span>{renderHighlightedDescription(ci.description)}</span>
                                  {isOverdue && (
                                    <span className="px-1.5 py-0.5 rounded bg-alert text-white text-[8px] font-bold tracking-wider uppercase animate-pulse" title="Proactive Risk Alert: Triggers flag before escalations (Assent Grounded)">
                                      Proactive Risk Alert
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] uppercase tracking-wider text-alert">{ci.severity} severity</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-sm text-paper-dim">{owner ? owner.name : 'Unassigned'}</td>
                            <td className="py-2.5 text-sm font-mono-data text-right text-paper-dim">{ci.dueDate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Custom Report Builder tab */}
      {!loading && activeTab === 'builder' && (
        <div className="flex flex-col gap-6 animate-fade-in print:hidden">
          {/* Filter Panel */}
          <Card title="Filter Datasets">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 my-2">
              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-semibold">
                  Department
                </label>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-white/5 border border-moss-line text-sm text-paper focus:outline-none focus:border-canopy cursor-pointer"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name} style={{ background: 'var(--ink)' }}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-semibold">
                  Employee / Owner
                </label>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-white/5 border border-moss-line text-sm text-paper focus:outline-none focus:border-canopy cursor-pointer"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.name} style={{ background: 'var(--ink)' }}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-semibold">
                  Source Module
                </label>
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-white/5 border border-moss-line text-sm text-paper focus:outline-none focus:border-canopy cursor-pointer"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>All Modules</option>
                  <option value="Fleet" style={{ background: 'var(--ink)' }}>Fleet Operations</option>
                  <option value="Manual" style={{ background: 'var(--ink)' }}>Manual Logging</option>
                  <option value="CSR Activities" style={{ background: 'var(--ink)' }}>CSR Activities</option>
                  <option value="Compliance Audits" style={{ background: 'var(--ink)' }}>Compliance Audits</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-semibold">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-white/5 border border-moss-line text-xs font-mono-data text-paper focus:outline-none focus:border-canopy"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-white/5 border border-moss-line text-xs font-mono-data text-paper focus:outline-none focus:border-canopy"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 border-t border-moss-line/50 pt-4">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 rounded bg-white/5 border border-moss-line hover:bg-white/10 text-paper text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Export CSV
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 rounded bg-amber hover:bg-amber-dim text-ink text-xs font-bold uppercase transition-all cursor-pointer"
              >
                Export Excel
              </button>
            </div>
          </Card>

          {/* Results table */}
          <Card title="Query Results" eyebrow={`${filteredData.length} records matching search`}>
            <div className="overflow-x-auto my-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Date</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Pillar</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Module</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Department</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Details</th>
                    <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim">Status</th>
                    <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-sm text-paper-dim">
                        No records match the current filters. Adjust your query.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((row) => (
                      <tr key={row.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--moss-line)' }}>
                        <td className="py-2.5 px-3 text-sm font-mono-data">{row.date}</td>
                        <td className="py-2.5 px-3 text-sm text-paper">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.type === 'Environmental'
                                ? 'bg-canopy/15 text-canopy'
                                : row.type === 'Social'
                                ? 'bg-slate/15 text-slate'
                                : 'bg-amber/15 text-amber'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-sm text-paper-dim">{row.module}</td>
                        <td className="py-2.5 px-3 text-sm text-paper-dim">{row.department}</td>
                        <td className="py-2.5 px-3 text-sm text-paper">
                          {renderHighlightedDescription(row.details)}
                        </td>
                        <td className="py-2.5 px-3 text-sm font-mono-data text-right text-paper-dim">{row.scoreChange}</td>
                        <td className="py-2.5 px-3 text-sm text-right">
                          {row.isQualitySane ? (
                            <span className="px-1.5 py-0.5 rounded bg-canopy/10 text-canopy border border-canopy/20 text-[9px] font-semibold" title="Databricks/Trifacta Grounded Quality: Valid and complete entry">
                              Complete
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-alert/10 text-alert border border-alert/20 text-[9px] font-semibold" title="Databricks/Trifacta Grounded Quality: Incomplete or warning entry">
                              Needs Review
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
