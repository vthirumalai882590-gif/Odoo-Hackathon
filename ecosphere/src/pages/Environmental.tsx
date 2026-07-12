import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  db,
  collection,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  callEsgAI
} from '../lib/firebase';
import type {
  EmissionFactor,
  CarbonTransaction,
  EnvironmentalGoal,
  Department
} from '../types';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import InlineEditCell from '../components/ui/InlineEditCell';
import { useToast } from '../hooks/useToast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function Environmental() {
  const [activeTab, setActiveTab] = useState<'factors' | 'txs' | 'goals' | 'charts'>('factors');

  // DB States
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [transactions, setTransactions] = useState<CarbonTransaction[]>([]);
  const [goals, setGoals] = useState<EnvironmentalGoal[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Messages & Errors
  const [errorMsg, setErrorMsg] = useState('');

  // UX states
  const [loading, setLoading] = useState(true);
  const [factorSearch, setFactorSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const { showToast } = useToast();

  // Form states
  const [factorForm, setFactorForm] = useState({ id: '', activityType: '', scope: 1 as 1|2|3, unit: '', factorValue: 0, effectiveDate: '' });
  const [txForm, setTxForm] = useState({ id: '', departmentId: '', emissionFactorId: '', quantity: 0, date: '' });
  
  // AI Helper States
  const [aiInputText, setAiInputText] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<{ quantity: number; emissionFactorId: string; scope: number; explanation: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiWrangling = async () => {
    if (!aiInputText.trim()) return;
    setAiLoading(true);
    setErrorMsg('');
    try {
      const result = await callEsgAI('categorizeTransaction', { description: aiInputText });
      setAiSuggestion(result);
    } catch (e: any) {
      setErrorMsg('AI Analysis failed: ' + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setTxForm({
      ...txForm,
      quantity: aiSuggestion.quantity,
      emissionFactorId: aiSuggestion.emissionFactorId
    });
    setAiSuggestion(null);
    setAiInputText('');
  };
  const [goalForm, setGoalForm] = useState({ id: '', title: '', departmentId: '', metric: 'Carbon Emissions' as any, targetValue: 0, currentValue: 0, unit: '', deadline: '', status: 'On Track' as any });

  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 4) {
        setLoading(false);
      }
    };

    const unsubFactors = onSnapshot(collection(db, 'emissionFactors'), (snap: any) => {
      const list: EmissionFactor[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setFactors(list);
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

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap: any) => {
      const list: Department[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setDepartments(list);
      checkLoaded();
    });

    return () => {
      unsubFactors();
      unsubTxs();
      unsubGoals();
      unsubDepts();
    };
  }, []);

  // Factors CRUD
  const handleSaveFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!factorForm.activityType.trim() || !factorForm.unit.trim() || !factorForm.effectiveDate) {
      setErrorMsg('All fields are required.');
      return;
    }
    if (factorForm.factorValue <= 0) {
      setErrorMsg('Factor value must be greater than 0.');
      return;
    }

    const factorData: EmissionFactor = {
      id: factorForm.id || `ef-${Math.random().toString(36).substring(2, 9)}`,
      activityType: factorForm.activityType.trim(),
      scope: factorForm.scope,
      unit: factorForm.unit.trim(),
      factorValue: Number(factorForm.factorValue),
      effectiveDate: factorForm.effectiveDate
    };

    try {
      await setDoc(doc(db, 'emissionFactors', factorData.id), factorData);
      setFactorForm({ id: '', activityType: '', scope: 1, unit: '', factorValue: 0, effectiveDate: '' });
      showToast({ message: 'Emission factor saved successfully.', type: 'success' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving emission factor.');
      showToast({ message: 'Error saving emission factor: ' + err.message, type: 'error' });
    }
  };

  const handleEditFactor = (ef: EmissionFactor) => {
    setFactorForm({
      id: ef.id,
      activityType: ef.activityType,
      scope: ef.scope,
      unit: ef.unit,
      factorValue: ef.factorValue,
      effectiveDate: ef.effectiveDate
    });
  };

  const handleDeleteFactor = async (id: string) => {
    const factor = factors.find((f) => f.id === id);
    if (!factor) return;
    try {
      await deleteDoc(doc(db, 'emissionFactors', id));
      showToast({
        message: 'Emission factor deleted successfully.',
        type: 'success',
        undoAction: async () => {
          await setDoc(doc(db, 'emissionFactors', id), factor);
          showToast({ message: 'Restored emission factor.', type: 'success' });
        }
      });
    } catch (err: any) {
      showToast({ message: 'Delete failed: ' + err.message, type: 'error' });
    }
  };

  const handleSaveFactorInline = async (efId: string, newValue: number) => {
    const factor = factors.find((f) => f.id === efId);
    if (!factor) return;
    const updatedFactor = { ...factor, factorValue: newValue };
    try {
      await setDoc(doc(db, 'emissionFactors', efId), updatedFactor);
      showToast({ message: `Factor value updated to ${newValue}`, type: 'success' });
    } catch (err: any) {
      showToast({ message: 'Update failed: ' + err.message, type: 'error' });
    }
  };

  // Live calculation preview for carbon transaction
  const selectedFactor = factors.find((f) => f.id === txForm.emissionFactorId);
  const livePreviewEmissions = selectedFactor ? txForm.quantity * selectedFactor.factorValue : 0;

  // Save Carbon Transaction
  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!txForm.departmentId || !txForm.emissionFactorId || !txForm.date) {
      setErrorMsg('Please select Department, Emission Factor, and Date.');
      return;
    }
    if (txForm.quantity <= 0) {
      setErrorMsg('Quantity must be greater than 0.');
      return;
    }

    const ef = factors.find((f) => f.id === txForm.emissionFactorId);
    if (!ef) return;

    const txData: CarbonTransaction = {
      id: txForm.id || `ct-${Math.random().toString(36).substring(2, 9)}`,
      departmentId: txForm.departmentId,
      emissionFactorId: txForm.emissionFactorId,
      sourceModule: 'Manual',
      quantity: Number(txForm.quantity),
      calculatedEmissions: Number((txForm.quantity * ef.factorValue).toFixed(2)),
      date: txForm.date,
      autoCalculated: false
    };

    try {
      await setDoc(doc(db, 'carbonTransactions', txData.id), txData);
      setTxForm({ id: '', departmentId: '', emissionFactorId: '', quantity: 0, date: '' });
      showToast({ message: 'Carbon transaction logged successfully.', type: 'success' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving carbon transaction.');
      showToast({ message: 'Failed to log transaction: ' + err.message, type: 'error' });
    }
  };

  // Goals Form Submit
  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!goalForm.title.trim() || !goalForm.unit.trim() || !goalForm.deadline) {
      setErrorMsg('Goal Title, Unit, and Deadline are required.');
      return;
    }
    if (goalForm.targetValue <= 0) {
      setErrorMsg('Target value must be greater than 0.');
      return;
    }

    const goalData: EnvironmentalGoal = {
      id: goalForm.id || `goal-${Math.random().toString(36).substring(2, 9)}`,
      title: goalForm.title.trim(),
      departmentId: goalForm.departmentId || null,
      metric: goalForm.metric,
      targetValue: Number(goalForm.targetValue),
      currentValue: Number(goalForm.currentValue),
      unit: goalForm.unit.trim(),
      deadline: goalForm.deadline,
      status: goalForm.status
    };

    try {
      await setDoc(doc(db, 'environmentalGoals', goalData.id), goalData);
      setGoalForm({ id: '', title: '', departmentId: '', metric: 'Carbon Emissions', targetValue: 0, currentValue: 0, unit: '', deadline: '', status: 'On Track' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving environmental goal.');
    }
  };

  // Group emissions per department for Recharts
  const chartData = departments.map((dept) => {
    const deptTxs = transactions.filter((t) => t.departmentId === dept.id);
    const totalEmissions = deptTxs.reduce((sum, t) => sum + t.calculatedEmissions, 0);
    return {
      name: dept.code,
      fullName: dept.name,
      emissions: Number(totalEmissions.toFixed(1))
    };
  }).filter((d) => d.emissions > 0);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-environmental)' }} />
          <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: 'var(--color-environmental)' }}>Environmental</span>
        </div>
        <h1
          className="text-3xl font-bold"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
        >
          Environmental Ledger
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Manage emissions tracking, calculate carbon footprints, and check sustainability goals.
        </p>
      </div>

      {/* Tabs — Framer Motion sliding indicator */}
      <div className="flex border-b relative" style={{ borderColor: 'var(--color-surface-border)' }}>
        {(
          [
            { id: 'factors', label: 'Emission Factors', icon: '🌿' },
            { id: 'txs', label: 'Carbon Ledger', icon: '📊' },
            { id: 'goals', label: 'Sustainability Goals', icon: '🎯' },
            { id: 'charts', label: 'Department Analytics', icon: '📈' }
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setErrorMsg('');
            }}
            className="relative px-4 py-3 text-sm font-medium flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
            style={{ color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
          >
            <span className="text-xs">{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="env-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--color-environmental)' }}
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

      {/* Skeleton Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2">
            <Card title="Loading Emission Factors...">
              <div className="flex flex-col gap-4 py-2">
                <Skeleton width="100%" height="40px" />
                <Skeleton width="100%" height="40px" />
                <Skeleton width="100%" height="40px" />
                <Skeleton width="100%" height="40px" />
              </div>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card title="Details">
              <div className="flex flex-col gap-3">
                <Skeleton width="100%" height="14px" />
                <Skeleton width="100%" height="32px" />
                <Skeleton width="100%" height="14px" />
                <Skeleton width="100%" height="32px" />
                <Skeleton width="100%" height="32px" />
              </div>
            </Card>
          </div>
        </div>
      ) : activeTab === 'factors' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <Card className="lg:col-span-2" title="Active Emission Factors">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search activity types..."
                value={factorSearch}
                onChange={(e) => setFactorSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-40"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Activity Type</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Scope</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Factor Value</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Effective Date</th>
                    <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim font-sans">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredFactors = factors.filter(f => f.activityType.toLowerCase().includes(factorSearch.toLowerCase()));
                    if (factors.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="py-8">
                            <EmptyState
                              title="No emission factors configured yet"
                              description="Audits and emissions tracking rely on active factors."
                              actionLabel="Add Factor"
                              onAction={() => {
                                const input = document.querySelector('input[placeholder="e.g. Grid Electricity"]') as HTMLInputElement;
                                if (input) input.focus();
                              }}
                            />
                          </td>
                        </tr>
                      );
                    }
                    if (filteredFactors.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="py-8">
                            <EmptyState title="No matching factors found" description="Adjust your search keyword." />
                          </td>
                        </tr>
                      );
                    }
                    return filteredFactors.map((ef) => (
                      <tr key={ef.id} className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                        <td className="py-2.5 px-3 text-sm font-medium text-paper">{ef.activityType}</td>
                        <td className="py-2.5 px-3 text-sm whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-canopy/10 text-canopy border border-canopy/20 whitespace-nowrap inline-block">
                            Scope {ef.scope}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-sm font-mono-data text-canopy">
                          <div className="flex items-center gap-1.5">
                            <InlineEditCell
                              value={ef.factorValue}
                              type="number"
                              isMono={true}
                              onSave={(val) => handleSaveFactorInline(ef.id, Number(val))}
                            />
                            <span className="text-[10px] text-paper-dim">CO2e / {ef.unit}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-sm font-mono-data">{ef.effectiveDate}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleEditFactor(ef)}
                            className="text-xs mr-3 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-paper font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFactor(ef.id)}
                            className="text-xs px-2 py-1 rounded bg-alert/15 hover:bg-alert/30 text-alert font-semibold cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={factorForm.id ? 'Edit Factor' : 'Add Emission Factor'}>
            <form onSubmit={handleSaveFactor} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Activity Type
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grid Electricity"
                  value={factorForm.activityType}
                  onChange={(e) => setFactorForm({ ...factorForm, activityType: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Scope
                </label>
                <select
                  value={factorForm.scope}
                  onChange={(e) => setFactorForm({ ...factorForm, scope: parseInt(e.target.value) as 1|2|3 })}
                  className="input-field cursor-pointer"
                >
                  <option value="1" style={{ background: 'var(--ink)' }}>Scope 1 — Direct</option>
                  <option value="2" style={{ background: 'var(--ink)' }}>Scope 2 — Indirect (Purchased Power)</option>
                  <option value="3" style={{ background: 'var(--ink)' }}>Scope 3 — Other Indirect (Travel, Supply Chain)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                    Factor Value
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 0.85"
                    value={factorForm.factorValue || ''}
                    onChange={(e) => setFactorForm({ ...factorForm, factorValue: parseFloat(e.target.value) || 0 })}
                    className="input-field font-mono-data"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. kWh, liter"
                    value={factorForm.unit}
                    onChange={(e) => setFactorForm({ ...factorForm, unit: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={factorForm.effectiveDate}
                  onChange={(e) => setFactorForm({ ...factorForm, effectiveDate: e.target.value })}
                  className="input-field font-mono-data"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 mt-2 rounded bg-canopy hover:bg-canopy-dim text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Save Factor
              </button>
            </form>
          </Card>
        </div>
      )}

      {!loading && activeTab === 'txs' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <Card className="lg:col-span-2" title="Carbon Transactions Ledger">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search ledger by department, factor, source..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-40"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Date</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Department</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Factor / Activity</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Quantity</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Emissions</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Quality</th>
                    <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredTxs = transactions.filter((tx) => {
                      const dept = departments.find((d) => d.id === tx.departmentId);
                      const ef = factors.find((f) => f.id === tx.emissionFactorId);
                      const searchStr = `${dept?.name || ''} ${ef?.activityType || ''} ${tx.sourceModule || ''} ${tx.sourceRecordId || ''}`.toLowerCase();
                      return searchStr.includes(txSearch.toLowerCase());
                    });
                    
                    if (transactions.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-8">
                            <EmptyState
                              title="No carbon transactions logged yet"
                              description="Add carbon transactions manually or via operations."
                              actionLabel="Add Transaction"
                              onAction={() => {
                                const select = document.querySelector('select') as HTMLSelectElement;
                                if (select) select.focus();
                              }}
                            />
                          </td>
                        </tr>
                      );
                    }
                    if (filteredTxs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-8">
                            <EmptyState title="No matching transactions found" description="Adjust your filters or search keywords." />
                          </td>
                        </tr>
                      );
                    }
                    return filteredTxs
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((tx) => {
                        const dept = departments.find((d) => d.id === tx.departmentId);
                        const ef = factors.find((f) => f.id === tx.emissionFactorId);
                        const isQualitySane = tx.quantity > 0 && tx.quantity < 10000 && ef && ef.unit;
                        return (
                          <tr key={tx.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--moss-line)' }}>
                            <td className="py-2.5 px-3 text-sm font-mono-data">{tx.date}</td>
                            <td className="py-2.5 px-3 text-sm text-paper">{dept ? dept.name : 'Unknown'}</td>
                            <td className="py-2.5 px-3 text-sm text-paper-dim">{ef ? ef.activityType : 'Unknown Factor'}</td>
                            <td className="py-2.5 px-3 text-sm font-mono-data text-paper">
                              {tx.quantity} <span className="text-[10px] text-paper-dim">{ef?.unit}</span>
                            </td>
                            <td className="py-2.5 px-3 text-sm font-mono-data text-canopy font-bold">
                              {tx.calculatedEmissions.toFixed(1)} <span className="text-[10px] text-paper-dim">kg CO2e</span>
                            </td>
                            <td className="py-2.5 px-3 text-sm whitespace-nowrap">
                              {isQualitySane ? (
                                <span className="px-1.5 py-0.5 rounded bg-canopy/10 text-canopy border border-canopy/20 text-[9px] font-semibold animate-fade-in whitespace-nowrap inline-block" title="Databricks/Trifacta Grounded Quality: Sane value & valid unit matches">
                                  Complete
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-alert/10 text-alert border border-alert/20 text-[9px] font-semibold animate-fade-in whitespace-nowrap inline-block" title="Databricks/Trifacta Grounded Quality: Out of range or incomplete entries">
                                  Needs Review
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs">
                              {tx.autoCalculated ? (
                                <span className="px-2 py-0.5 rounded bg-canopy/15 text-canopy font-semibold animate-pulse" title={`Linked record: ${tx.sourceRecordId}`}>
                                  Auto ({tx.sourceModule})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-white/5 text-paper-dim">
                                  Manual
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Record Emissions">
            {/* AI helper section */}
            <div className="mb-4 p-3 rounded bg-white/5 border border-moss-line/50 flex flex-col gap-2">
              <label className="block text-[10px] uppercase tracking-wider text-amber font-bold flex items-center justify-between">
                <span>AI Data Wrangler (Databricks + Trifacta Mode)</span>
                <span className="px-1.5 py-0.5 rounded bg-amber/15 text-amber text-[8px] font-semibold font-mono">Archetype 01 — Normalized Schema</span>
              </label>
              <textarea
                placeholder="e.g. Purchased 150 liters of diesel fuel for delivery trucks..."
                rows={2}
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-40"
              />
              <button
                type="button"
                onClick={handleAiWrangling}
                disabled={aiLoading}
                className="py-1 px-3 text-[10px] font-bold text-center rounded bg-moss hover:bg-white/10 text-paper-dim hover:text-paper font-sans cursor-pointer transition-colors"
              >
                {aiLoading ? 'AI Analyzing...' : 'Analyze with AI'}
              </button>

              {aiSuggestion && (
                <div className="mt-2 p-2.5 rounded bg-amber/10 border border-amber/30 text-xs flex flex-col gap-1.5">
                  <div className="font-semibold text-amber flex items-center gap-1.5">
                    <span>✨ AI Suggestion</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber text-ink text-[9px] font-extrabold">AI-SUGGESTED</span>
                  </div>
                  <div className="text-paper-dim leading-relaxed">
                    Matched **{factors.find((f) => f.id === aiSuggestion.emissionFactorId)?.activityType || 'Factor'}** (Scope {aiSuggestion.scope}) with Quantity **{aiSuggestion.quantity}**.
                  </div>
                  <div className="text-[10px] text-paper-dim italic">
                    Reason: "{aiSuggestion.explanation}"
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyAiSuggestion}
                    className="mt-1.5 w-full py-1 text-[10px] font-bold uppercase rounded bg-amber hover:bg-amber-dim text-ink transition-colors cursor-pointer"
                  >
                    Confirm & Apply Suggestions
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveTx} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Department
                </label>
                <select
                  value={txForm.departmentId}
                  onChange={(e) => setTxForm({ ...txForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>-- Select --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id} style={{ background: 'var(--ink)' }}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Emission Factor
                </label>
                <select
                  value={txForm.emissionFactorId}
                  onChange={(e) => setTxForm({ ...txForm, emissionFactorId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>-- Select --</option>
                  {factors.map((f) => (
                    <option key={f.id} value={f.id} style={{ background: 'var(--ink)' }}>
                      {f.activityType} ({f.factorValue} CO2e)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Quantity
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={txForm.quantity || ''}
                  onChange={(e) => setTxForm({ ...txForm, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy font-mono-data"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy font-mono-data"
                />
              </div>

              {selectedFactor && (
                <div className="p-3.5 rounded bg-canopy/10 border border-canopy/20 flex flex-col gap-1">
                  <span className="text-[10px] text-canopy uppercase tracking-wider font-semibold">
                    Calculated Footprint
                  </span>
                  <span className="text-xl font-bold font-mono-data text-paper">
                    {livePreviewEmissions.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-paper-dim">kg CO2e</span>
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 mt-2 rounded bg-canopy hover:bg-canopy-dim text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Log Transaction
              </button>
            </form>
          </Card>
        </div>
      )}

      {!loading && activeTab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <Card className="lg:col-span-2" title="Sustainability Goals Tracking">
            <div className="flex flex-col gap-5 my-2">
              {goals.length === 0 ? (
                <p className="text-sm text-paper-dim py-4 text-center">
                  No active goals set. Create one on the right.
                </p>
              ) : (
                goals.map((goal) => {
                  const pct = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
                  const dept = departments.find((d) => d.id === goal.departmentId);
                  return (
                    <div key={goal.id} className="p-4 rounded border flex flex-col gap-3.5" style={{ background: 'var(--ink-raised)', borderColor: 'var(--moss-line)' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-paper font-sans">{goal.title}</h4>
                          <span className="text-[10px] uppercase tracking-wider text-paper-dim mt-0.5 inline-block">
                            {dept ? `${dept.name} (${dept.code})` : 'Organization-Wide'} · {goal.metric}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            goal.status === 'Achieved'
                              ? 'bg-canopy/15 text-canopy'
                              : goal.status === 'At Risk'
                              ? 'bg-amber/15 text-amber'
                              : 'bg-paper-dim/15 text-paper-dim'
                          }`}
                        >
                          {goal.status}
                        </span>
                      </div>

                      {/* Bar progress */}
                      <div className="flex flex-col gap-1.5">
                        <div className="w-full h-2 rounded bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded bg-canopy transition-all duration-1000 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono-data">
                          <span>
                            Progress: {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
                          </span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-moss-line/50 pt-2 text-[10px] font-mono-data text-paper-dim">
                        <span>Deadline: {goal.deadline}</span>
                        <span>ID: {goal.id}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card title="Set Goal">
            <form onSubmit={handleSaveGoal} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Goal Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Reduce emissions by 15%"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Target Scope (Dept)
                </label>
                <select
                  value={goalForm.departmentId}
                  onChange={(e) => setGoalForm({ ...goalForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>Organization-Wide</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id} style={{ background: 'var(--ink)' }}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  ESG Metric
                </label>
                <select
                  value={goalForm.metric}
                  onChange={(e) => setGoalForm({ ...goalForm, metric: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="Carbon Emissions" style={{ background: 'var(--ink)' }}>Carbon Emissions</option>
                  <option value="Energy Usage" style={{ background: 'var(--ink)' }}>Energy Usage</option>
                  <option value="Water Usage" style={{ background: 'var(--ink)' }}>Water Usage</option>
                  <option value="Waste Reduction" style={{ background: 'var(--ink)' }}>Waste Reduction</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                    Target Value
                  </label>
                  <input
                    type="number"
                    value={goalForm.targetValue || ''}
                    onChange={(e) => setGoalForm({ ...goalForm, targetValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy font-mono-data"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                    Current Value
                  </label>
                  <input
                    type="number"
                    value={goalForm.currentValue || ''}
                    onChange={(e) => setGoalForm({ ...goalForm, currentValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy font-mono-data"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. kg CO2e, kWh"
                    value={goalForm.unit}
                    onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={goalForm.deadline}
                    onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy font-mono-data"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Goal Status
                </label>
                <select
                  value={goalForm.status}
                  onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="On Track" style={{ background: 'var(--ink)' }}>On Track</option>
                  <option value="At Risk" style={{ background: 'var(--ink)' }}>At Risk</option>
                  <option value="Achieved" style={{ background: 'var(--ink)' }}>Achieved</option>
                  <option value="Missed" style={{ background: 'var(--ink)' }}>Missed</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 mt-2 rounded bg-canopy hover:bg-canopy-dim text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Log Goal Target
              </button>
            </form>
          </Card>
        </div>
      )}

      {activeTab === 'charts' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <Card title="Department Carbon Tracking" eyebrow="Aggregated Emissions (kg CO2e)">
            {chartData.length === 0 ? (
              <p className="text-sm text-paper-dim py-12 text-center">
                No carbon emission records logged. Please log manual transactions to review chart analytics.
              </p>
            ) : (
              <div className="w-full h-80 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="name"
                      stroke="var(--paper-dim)"
                      fontFamily="var(--font-mono)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--paper-dim)"
                      fontFamily="var(--font-mono)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--ink-raised)',
                        borderColor: 'var(--moss-line)',
                        color: 'var(--paper)',
                        fontSize: 12,
                        borderRadius: 4
                      }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar
                      dataKey="emissions"
                      fill="var(--canopy)"
                      radius={[4, 4, 0, 0]}
                      name="Emissions (kg CO2e)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
