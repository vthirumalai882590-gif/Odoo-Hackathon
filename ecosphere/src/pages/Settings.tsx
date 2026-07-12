import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  db,
  collection,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc
} from '../lib/firebase';
import { seedDatabase } from '../lib/seed';
import type { Department, Category, Employee, ESGConfig } from '../types';
import Card from '../components/ui/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../hooks/useToast';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'depts' | 'cats' | 'config' | 'seed'>('depts');

  // DB collections
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [config, setConfig] = useState<ESGConfig>({
    weighting: { environmental: 40, social: 30, governance: 30 },
    autoEmissionCalculation: true,
    evidenceRequiredForCSR: true,
    badgeAutoAward: true,
    notificationsEnabled: { inApp: true, email: false }
  });

  // Loading / Messages
  const [seedMessage, setSeedMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Forms states
  const [deptForm, setDeptForm] = useState({ id: '', name: '', code: '', headEmployeeId: '', parentDepartmentId: '' });
  const [catForm, setCatForm] = useState<{ id: string; name: string; type: Category['type']; status: Category['status'] }>({ id: '', name: '', type: 'CSR Activity', status: 'Active' });

  // Delete Confirm Dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'dept' | 'cat'; id: string } | null>(null);
  const { showToast } = useToast();

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'dept') {
        const hasEmployees = employees.some(e => e.departmentId === deleteTarget.id);
        if (hasEmployees) {
          showToast({
            message: 'Cannot delete Department: Active employees are currently assigned to it.',
            type: 'error'
          });
          setDeleteTarget(null);
          return;
        }

        await deleteDoc(doc(db, 'departments', deleteTarget.id));
        showToast({ message: 'Department successfully deleted', type: 'success' });
      } else {
        await deleteDoc(doc(db, 'categories', deleteTarget.id));
        showToast({ message: 'Category successfully deleted', type: 'success' });
      }
    } catch (err: any) {
      showToast({ message: 'Failed to delete: ' + err.message, type: 'error' });
    }
    setDeleteTarget(null);
  };

  // Weights sum helper
  const weightsSum = config.weighting.environmental + config.weighting.social + config.weighting.governance;

  useEffect(() => {
    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap: any) => {
      const list: Department[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setDepartments(list);
    });

    const unsubCats = onSnapshot(collection(db, 'categories'), (snap: any) => {
      const list: Category[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setCategories(list);
    });

    const unsubEmps = onSnapshot(collection(db, 'employees'), (snap: any) => {
      const list: Employee[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setEmployees(list);
    });

    const unsubConfig = onSnapshot(doc(db, 'config', 'esgConfig'), (snap: any) => {
      if (snap.exists()) {
        setConfig(snap.data());
      }
    });

    return () => {
      unsubDepts();
      unsubCats();
      unsubEmps();
      unsubConfig();
    };
  }, []);

  // Department CRUD helpers
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!deptForm.name.trim() || !deptForm.code.trim()) {
      setErrorMsg('Department Name and Code are required.');
      return;
    }
    const codeUpper = deptForm.code.toUpperCase();
    const duplicate = departments.find(
      (d) => d.code === codeUpper && d.id !== deptForm.id
    );
    if (duplicate) {
      setErrorMsg(`Code "${codeUpper}" is already in use by another department.`);
      return;
    }

    const deptData: Department = {
      id: deptForm.id || `dept-${Math.random().toString(36).substring(2, 9)}`,
      name: deptForm.name.trim(),
      code: codeUpper,
      headEmployeeId: deptForm.headEmployeeId || null,
      parentDepartmentId: deptForm.parentDepartmentId || null,
      employeeCount: departments.find((d) => d.id === deptForm.id)?.employeeCount || 0,
      status: 'Active' as const
    };

    try {
      await setDoc(doc(db, 'departments', deptData.id), deptData);
      setDeptForm({ id: '', name: '', code: '', headEmployeeId: '', parentDepartmentId: '' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving department.');
    }
  };

  const handleEditDept = (dept: Department) => {
    setDeptForm({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      headEmployeeId: dept.headEmployeeId || '',
      parentDepartmentId: dept.parentDepartmentId || ''
    });
  };

  const handleDeleteDept = async (id: string) => {
    setDeleteTarget({ type: 'dept', id });
  };

  // Categories CRUD helpers
  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!catForm.name.trim()) {
      setErrorMsg('Category Name is required.');
      return;
    }

    const catData: Category = {
      id: catForm.id || `cat-${Math.random().toString(36).substring(2, 9)}`,
      name: catForm.name.trim(),
      type: catForm.type,
      status: catForm.status
    };

    try {
      await setDoc(doc(db, 'categories', catData.id), catData);
      setCatForm({ id: '', name: '', type: 'CSR Activity', status: 'Active' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving category.');
    }
  };

  const handleEditCat = (cat: Category) => {
    setCatForm({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      status: cat.status
    });
  };

  const handleDeleteCat = async (id: string) => {
    setDeleteTarget({ type: 'cat', id });
  };

  // Config Sliders / Toggles update
  const updateWeight = async (pillar: 'environmental' | 'social' | 'governance', value: number) => {
    const nextWeights = { ...config.weighting, [pillar]: value };
    const nextConfig = { ...config, weighting: nextWeights };
    await setDoc(doc(db, 'config', 'esgConfig'), nextConfig);
  };

  const updateToggle = async (key: keyof Omit<ESGConfig, 'weighting' | 'notificationsEnabled'>) => {
    const nextConfig = { ...config, [key]: !config[key] };
    await setDoc(doc(db, 'config', 'esgConfig'), nextConfig);
  };

  const updateNotificationToggle = async (type: 'inApp' | 'email') => {
    const nextConfig = {
      ...config,
      notificationsEnabled: {
        ...config.notificationsEnabled,
        [type]: !config.notificationsEnabled[type]
      }
    };
    await setDoc(doc(db, 'config', 'esgConfig'), nextConfig);
  };

  // Seeding trigger
  const handleSeed = async () => {
    setSeedMessage('Seeding database...');
    try {
      await seedDatabase();
      setSeedMessage('EcoSphere ESG Platform successfully seeded with test records!');
      setTimeout(() => setSeedMessage(''), 4000);
    } catch (err: any) {
      setSeedMessage(`Error: ${err.message}`);
    }
  };

  // Render tree structure helper
  const renderDepartmentTree = (parentId: string | null, depth = 0) => {
    const subdepts = departments.filter((d) => d.parentDepartmentId === parentId);
    return subdepts.map((dept) => {
      const head = employees.find((e) => e.id === dept.headEmployeeId);
      return (
        <tr key={dept.id} className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
          <td className="py-2.5 px-3 text-sm font-mono-data">
            <span style={{ paddingLeft: `${depth * 20}px` }}>
              {depth > 0 ? '↳ ' : ''}
              {dept.code}
            </span>
          </td>
          <td className="py-2.5 px-3 text-sm" style={{ color: 'var(--paper)' }}>{dept.name}</td>
          <td className="py-2.5 px-3 text-sm" style={{ color: 'var(--paper-dim)' }}>
            {head ? head.name : 'Unassigned'}
          </td>
          <td className="py-2.5 px-3 text-right">
            <button
              onClick={() => handleEditDept(dept)}
              className="text-xs mr-3 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-paper font-semibold"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteDept(dept.id)}
              className="text-xs px-2 py-1 rounded bg-alert/15 hover:bg-alert/30 text-alert font-semibold"
            >
              Delete
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-text-secondary)' }} />
          <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Settings</span>
        </div>
        <h1
          className="text-3xl font-bold"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
        >
          Settings &amp; Configuration
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Manage departments, categories, global weights, and test environments.
        </p>
      </div>

      {/* Tabs — Framer Motion sliding indicator */}
      <div className="flex border-b relative" style={{ borderColor: 'var(--color-surface-border)' }}>
        {(
          [
            { id: 'depts', label: 'Departments', icon: '🏢' },
            { id: 'cats', label: 'Categories', icon: '🏷️' },
            { id: 'config', label: 'ESG Config', icon: '⚙️' },
            { id: 'seed', label: 'Data Management', icon: '🗄️' }
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
                layoutId="settings-tab-indicator"
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

      {/* Tab Contents */}
      {activeTab === 'depts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List/Tree */}
          <Card className="lg:col-span-2" title="Department Structure">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Code</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Name</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Department Head</th>
                    <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-sm text-paper-dim">
                        No departments found. Seed data or create one below.
                      </td>
                    </tr>
                  ) : (
                    renderDepartmentTree(null)
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Form */}
          <Card title={deptForm.id ? 'Edit Department' : 'Create Department'}>
            <form onSubmit={handleSaveDept} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Department Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. OPS"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy font-mono-data placeholder:opacity-50"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Department Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operations & Logistics"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Parent Department
                </label>
                <select
                  value={deptForm.parentDepartmentId}
                  onChange={(e) => setDeptForm({ ...deptForm, parentDepartmentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>-- None --</option>
                  {departments
                    .filter((d) => d.id !== deptForm.id)
                    .map((d) => (
                      <option key={d.id} value={d.id} style={{ background: 'var(--ink)' }}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Department Head
                </label>
                <select
                  value={deptForm.headEmployeeId}
                  onChange={(e) => setDeptForm({ ...deptForm, headEmployeeId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>-- Unassigned --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id} style={{ background: 'var(--ink)' }}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded bg-canopy hover:bg-canopy-dim text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Save
                </button>
                {deptForm.id && (
                  <button
                    type="button"
                    onClick={() => setDeptForm({ id: '', name: '', code: '', headEmployeeId: '', parentDepartmentId: '' })}
                    className="px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-paper text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </Card>
        </div>
      )}

      {activeTab === 'cats' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <Card className="lg:col-span-2" title="Activity & Challenge Categories">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Name</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Type</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Status</th>
                    <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-sm text-paper-dim">
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.id} className="border-b animate-fade-in" style={{ borderColor: 'var(--moss-line)' }}>
                        <td className="py-2.5 px-3 text-sm font-medium text-paper">{cat.name}</td>
                        <td className="py-2.5 px-3 text-sm">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              cat.type === 'CSR Activity'
                                ? 'bg-slate/15 text-slate'
                                : 'bg-amber/15 text-amber'
                            }`}
                          >
                            {cat.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-sm">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                              cat.status === 'Active' ? 'bg-canopy' : 'bg-paper-dim'
                            }`}
                          />
                          {cat.status}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleEditCat(cat)}
                            className="text-xs mr-3 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-paper font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCat(cat.id)}
                            className="text-xs px-2 py-1 rounded bg-alert/15 hover:bg-alert/30 text-alert font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Form */}
          <Card title={catForm.id ? 'Edit Category' : 'Create Category'}>
            <form onSubmit={handleSaveCat} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Volunteer Hours"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Category Type
                </label>
                <select
                  value={catForm.type}
                  onChange={(e) =>
                    setCatForm({ ...catForm, type: e.target.value as 'CSR Activity' | 'Challenge' })
                  }
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="CSR Activity" style={{ background: 'var(--ink)' }}>CSR Activity</option>
                  <option value="Challenge" style={{ background: 'var(--ink)' }}>Challenge</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Status
                </label>
                <select
                  value={catForm.status}
                  onChange={(e) => setCatForm({ ...catForm, status: e.target.value as 'Active' | 'Inactive' })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="Active" style={{ background: 'var(--ink)' }}>Active</option>
                  <option value="Inactive" style={{ background: 'var(--ink)' }}>Inactive</option>
                </select>
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded bg-canopy hover:bg-canopy-dim text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Save
                </button>
                {catForm.id && (
                  <button
                    type="button"
                    onClick={() => setCatForm({ id: '', name: '', type: 'CSR Activity', status: 'Active' })}
                    className="px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-paper text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </Card>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Pillar Weightings */}
          <Card title="Pillar Weightings" eyebrow="Calculation weights">
            <div className="flex flex-col gap-6 my-2">
              <div>
                <div className="flex justify-between text-sm mb-1.5 font-medium">
                  <span style={{ color: 'var(--canopy)' }}>Environmental Weight</span>
                  <span className="font-mono-data text-paper">{config.weighting.environmental}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.weighting.environmental}
                  onChange={(e) => updateWeight('environmental', parseInt(e.target.value))}
                  className="w-full accent-canopy cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1.5 font-medium">
                  <span style={{ color: 'var(--slate)' }}>Social Weight</span>
                  <span className="font-mono-data text-paper">{config.weighting.social}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.weighting.social}
                  onChange={(e) => updateWeight('social', parseInt(e.target.value))}
                  className="w-full accent-slate cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1.5 font-medium">
                  <span style={{ color: 'var(--amber)' }}>Governance Weight</span>
                  <span className="font-mono-data text-paper">{config.weighting.governance}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.weighting.governance}
                  onChange={(e) => updateWeight('governance', parseInt(e.target.value))}
                  className="w-full accent-amber cursor-pointer"
                />
              </div>

              <div className="ledger-rule pt-4 flex justify-between items-center text-sm font-semibold">
                <span>Total Sum Weight:</span>
                <span
                  className="font-mono-data text-lg"
                  style={{ color: weightsSum === 100 ? 'var(--canopy)' : 'var(--alert)' }}
                >
                  {weightsSum}%
                </span>
              </div>
              {weightsSum !== 100 && (
                <div className="text-xs text-alert font-medium p-2.5 rounded border border-alert/20 bg-alert/5">
                  ⚠️ Validation Error: ESG pillar weightings must sum to exactly 100% to run standard score aggregations correctly.
                </div>
              )}
            </div>
          </Card>

          {/* Engine Parameters */}
          <Card title="Business Parameters" eyebrow="Automations & Guardrails">
            <div className="flex flex-col gap-5.5 my-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-paper">Auto Emission Calculation</div>
                  <div className="text-[11px] text-paper-dim">Derive emissions automatically from Operations logs.</div>
                </div>
                <button
                  onClick={() => updateToggle('autoEmissionCalculation')}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    config.autoEmissionCalculation ? 'bg-canopy' : 'bg-white/10 border border-moss-line'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-paper transition-transform ${
                      config.autoEmissionCalculation ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-paper">Evidence Requirement for CSR</div>
                  <div className="text-[11px] text-paper-dim">Proof URL document is mandatory to approve participation.</div>
                </div>
                <button
                  onClick={() => updateToggle('evidenceRequiredForCSR')}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    config.evidenceRequiredForCSR ? 'bg-canopy' : 'bg-white/10 border border-moss-line'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-paper transition-transform ${
                      config.evidenceRequiredForCSR ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-paper">Badge Auto-Award</div>
                  <div className="text-[11px] text-paper-dim">Grant badges instantly when rule criteria are met.</div>
                </div>
                <button
                  onClick={() => updateToggle('badgeAutoAward')}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    config.badgeAutoAward ? 'bg-canopy' : 'bg-white/10 border border-moss-line'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-paper transition-transform ${
                      config.badgeAutoAward ? 'translate-x-5.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="ledger-rule pt-4">
                <div className="text-xs uppercase tracking-wider text-paper-dim mb-3 font-semibold">
                  Notification Channels
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-paper cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.notificationsEnabled.inApp}
                      onChange={() => updateNotificationToggle('inApp')}
                      className="rounded accent-canopy cursor-pointer"
                    />
                    In-App Messages
                  </label>
                  <label className="flex items-center gap-2 text-sm text-paper cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.notificationsEnabled.email}
                      onChange={() => updateNotificationToggle('email')}
                      className="rounded accent-canopy cursor-pointer"
                    />
                    Email Broadcasts
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'seed' && (
        <Card title="Database & Environments" eyebrow="Admin Utilities">
          <div className="flex flex-col gap-4 my-2">
            <p className="text-sm text-paper-dim leading-relaxed">
              Populate the platform with realistic mock datasets including departments, employees, historical carbon audits, active CSR activities, completed badges, and compliance trackers to run demonstration trials.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <button
                onClick={handleSeed}
                className="px-5 py-2.5 rounded bg-canopy hover:bg-canopy-dim text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Reset & Seed Database
              </button>
            </div>

            {seedMessage && (
              <div
                className={`mt-4 p-4 rounded text-sm font-medium border ${
                  seedMessage.includes('Error')
                    ? 'border-alert bg-alert/15 text-alert'
                    : 'border-canopy bg-canopy/15 text-paper'
                }`}
              >
                {seedMessage}
              </div>
            )}
          </div>
        </Card>
      )}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={deleteTarget !== null}
          title={deleteTarget.type === 'dept' ? 'Delete Department' : 'Delete Category'}
          message={
            deleteTarget.type === 'dept'
              ? 'Are you sure you want to permanently delete this department? This action is destructive and cannot be undone.'
              : 'Are you sure you want to permanently delete this category?'
          }
          isDestructive={true}
          confirmLabel="Delete"
          onConfirm={executeDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
