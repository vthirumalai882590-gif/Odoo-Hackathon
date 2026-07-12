import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  db,
  collection,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  runTransaction
} from '../lib/firebase';
import type {
  CSRActivity,
  EmployeeParticipation,
  Employee,
  Department,
  Category,
  ESGConfig
} from '../types';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';

export default function Social() {
  const [activeTab, setActiveTab] = useState<'activities' | 'participations' | 'diversity' | 'training'>('activities');

  // DB States
  const [activities, setActivities] = useState<CSRActivity[]>([]);
  const [participations, setParticipations] = useState<EmployeeParticipation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [config, setConfig] = useState<ESGConfig | null>(null);

  // Messages & Errors
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // UX & Selection states
  const [loading, setLoading] = useState(true);
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  const [activitySearch, setActivitySearch] = useState('');
  const { showToast } = useToast();

  // Form states
  const [activityForm, setActivityForm] = useState({ id: '', title: '', categoryId: '', description: '', departmentId: '', date: '', status: 'Planned' as any });

  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 6) {
        setLoading(false);
      }
    };

    const unsubActivities = onSnapshot(collection(db, 'csrActivities'), (snap: any) => {
      const list: CSRActivity[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setActivities(list);
      checkLoaded();
    });

    const unsubParts = onSnapshot(collection(db, 'employeeParticipations'), (snap: any) => {
      const list: EmployeeParticipation[] = [];
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

    const unsubCats = onSnapshot(collection(db, 'categories'), (snap: any) => {
      const list: Category[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setCategories(list.filter((c) => c.type === 'CSR Activity' || c.name.includes('Training')));
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
      unsubActivities();
      unsubParts();
      unsubEmps();
      unsubCats();
      unsubDepts();
      unsubConfig();
    };
  }, []);

  // Save CSR Activity
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!activityForm.title.trim() || !activityForm.categoryId || !activityForm.date) {
      setErrorMsg('Title, Category, and Date are required.');
      return;
    }

    const activityData: CSRActivity = {
      id: activityForm.id || `csr-${Math.random().toString(36).substring(2, 9)}`,
      title: activityForm.title.trim(),
      categoryId: activityForm.categoryId,
      description: activityForm.description.trim(),
      departmentId: activityForm.departmentId || null,
      date: activityForm.date,
      status: activityForm.status
    };

    try {
      await setDoc(doc(db, 'csrActivities', activityData.id), activityData);
      setActivityForm({ id: '', title: '', categoryId: '', description: '', departmentId: '', date: '', status: 'Planned' });
      showToast({ message: 'CSR Activity logged successfully.', type: 'success' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving CSR Activity.');
      showToast({ message: 'Error saving activity: ' + err.message, type: 'error' });
    }
  };

  const handleEditActivity = (act: CSRActivity) => {
    setActivityForm({
      id: act.id,
      title: act.title,
      categoryId: act.categoryId,
      description: act.description,
      departmentId: act.departmentId || '',
      date: act.date,
      status: act.status
    });
  };

  const handleDeleteActivity = async (id: string) => {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;
    try {
      await deleteDoc(doc(db, 'csrActivities', id));
      showToast({
        message: 'CSR Activity deleted successfully.',
        type: 'success',
        undoAction: async () => {
          await setDoc(doc(db, 'csrActivities', id), activity);
          showToast({ message: 'Restored CSR Activity.', type: 'success' });
        }
      });
    } catch (err: any) {
      showToast({ message: 'Delete failed: ' + err.message, type: 'error' });
    }
  };

  // Enforce approval rules & award points
  const handleApproveParticipation = async (part: EmployeeParticipation) => {
    try {
      await runTransaction(db, async (transaction) => {
        const empRef = doc(db, 'employees', part.employeeId);
        const partRef = doc(db, 'employeeParticipations', part.id);

        const empSnap = await transaction.get(empRef);
        if (!empSnap.exists()) {
          throw new Error('Employee record does not exist.');
        }

        const employee = empSnap.data() as Employee;
        const currentPoints = employee.points || 0;
        const currentXp = employee.xp || 0;
        
        const nextPoints = currentPoints + part.pointsEarned;
        const nextXp = currentXp + 50;

        transaction.update(empRef, { points: nextPoints, xp: nextXp });
        transaction.update(partRef, {
          approvalStatus: 'Approved',
          completionDate: new Date().toISOString()
        });
      });
      showToast({ message: 'Participation approved and employee reward points credited!', type: 'success' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating approval status.');
      showToast({ message: 'Failed to approve: ' + err.message, type: 'error' });
    }
  };

  const handleRejectParticipation = async (partId: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await setDoc(doc(db, 'employeeParticipations', partId), { approvalStatus: 'Rejected' }, { merge: true });
      showToast({ message: 'Participation rejected successfully.', type: 'warning' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error rejecting participation.');
      showToast({ message: 'Failed to reject: ' + err.message, type: 'error' });
    }
  };

  const handleBulkApprove = async () => {
    setErrorMsg('');
    const pendingParts = participations.filter(p => selectedPartIds.includes(p.id) && p.approvalStatus === 'Pending');
    if (pendingParts.length === 0) return;

    if (config?.evidenceRequiredForCSR) {
      const missingEvidence = pendingParts.some(p => !p.proofUrl);
      if (missingEvidence) {
        setErrorMsg('Bulk Approval blocked: One or more selected participations lack a proof document URL.');
        showToast({ message: 'Bulk approval blocked: Proof evidence required.', type: 'error' });
        return;
      }
    }

    let approvedCount = 0;
    try {
      for (const part of pendingParts) {
        await runTransaction(db, async (transaction) => {
          const empRef = doc(db, 'employees', part.employeeId);
          const partRef = doc(db, 'employeeParticipations', part.id);
          const empSnap = await transaction.get(empRef);
          if (empSnap.exists()) {
            const empData = empSnap.data() as Employee;
            transaction.update(empRef, {
              points: (empData.points || 0) + part.pointsEarned,
              xp: (empData.xp || 0) + 50
            });
            transaction.update(partRef, {
              approvalStatus: 'Approved',
              completionDate: new Date().toISOString()
            });
            approvedCount++;
          }
        });
      }
      showToast({ message: `Successfully approved ${approvedCount} participation requests.`, type: 'success' });
      setSelectedPartIds([]);
    } catch (e: any) {
      setErrorMsg('Bulk approval failed: ' + e.message);
    }
  };

  const handleBulkReject = async () => {
    setErrorMsg('');
    const pendingParts = participations.filter(p => selectedPartIds.includes(p.id) && p.approvalStatus === 'Pending');
    if (pendingParts.length === 0) return;

    try {
      for (const part of pendingParts) {
        await setDoc(doc(db, 'employeeParticipations', part.id), { approvalStatus: 'Rejected' }, { merge: true });
      }
      showToast({ message: `Successfully rejected ${pendingParts.length} participation requests.`, type: 'warning' });
      setSelectedPartIds([]);
    } catch (e: any) {
      setErrorMsg('Bulk reject failed: ' + e.message);
    }
  };

  // Diversity calculations
  const totalEmployeesCount = employees.length;
  const deptDistribution = departments.map((d) => {
    const count = employees.filter((e) => e.departmentId === d.id).length;
    const pct = totalEmployeesCount > 0 ? (count / totalEmployeesCount) * 100 : 0;
    return { name: d.name, code: d.code, count, pct };
  });

  const rolesList = ['Admin', 'ESG Manager', 'Department Head', 'Employee'];
  const roleDistribution = rolesList.map((role) => {
    const count = employees.filter((e) => e.role === role).length;
    const pct = totalEmployeesCount > 0 ? (count / totalEmployeesCount) * 100 : 0;
    return { name: role, count, pct };
  });

  // Training Checklist calculations:
  // We reuse employeeParticipations that are linked to training category (cat-gov-eth, cat-soc-well, etc.)
  const trainingActivities = activities.filter((act) => {
    const cat = categories.find((c) => c.id === act.categoryId);
    return cat?.name.toLowerCase().includes('training') || cat?.name.toLowerCase().includes('ethics');
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-social)' }} />
          <span className="text-[11px] uppercase tracking-[0.15em] font-semibold" style={{ color: 'var(--color-social)' }}>Social</span>
        </div>
        <h1
          className="text-3xl font-bold"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
        >
          Social Ledger
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          Review employee engagement, CSR activities, diversity aggregates, and training completions.
        </p>
      </div>

      {/* Tabs — Framer Motion sliding indicator */}
      <div className="flex border-b relative" style={{ borderColor: 'var(--color-surface-border)' }}>
        {(
          [
            { id: 'activities', label: 'CSR Activities', icon: '🤝' },
            { id: 'participations', label: 'Review Queue', icon: '📝' },
            { id: 'diversity', label: 'Workforce Diversity', icon: '📊' },
            { id: 'training', label: 'Training Matrix', icon: '🎓' }
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="relative px-4 py-3 text-sm font-medium flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
            style={{ color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
          >
            <span className="text-xs">{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="social-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--color-social)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded border border-alert bg-alert/10 text-sm text-alert font-medium">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded border border-canopy bg-canopy/10 text-sm text-paper font-medium">
          {successMsg}
        </div>
      )}

      {/* Tab Contents */}
      {/* Skeleton Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2">
            <Card title="Loading CSR Initiatives...">
              <div className="flex flex-col gap-4 py-2">
                <Skeleton width="100%" height="40px" />
                <Skeleton width="100%" height="40px" />
                <Skeleton width="100%" height="40px" />
              </div>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card title="Options">
              <div className="flex flex-col gap-3">
                <Skeleton width="100%" height="32px" />
                <Skeleton width="100%" height="32px" />
              </div>
            </Card>
          </div>
        </div>
      ) : activeTab === 'activities' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <Card className="lg:col-span-2" title="CSR Initiatives">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search activities..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-40"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Date</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Activity</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Category</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Department</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Status</th>
                    <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim font-sans">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredActivities = activities.filter(a => a.title.toLowerCase().includes(activitySearch.toLowerCase()));
                    if (activities.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-8">
                            <EmptyState
                              title="No CSR Activities planned"
                              description="Plan volunteer activities to boost social metrics."
                              actionLabel="Add Activity"
                              onAction={() => {
                                const input = document.querySelector('input[placeholder="e.g. Tree Planting Drive"]') as HTMLInputElement;
                                if (input) input.focus();
                              }}
                            />
                          </td>
                        </tr>
                      );
                    }
                    if (filteredActivities.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-8">
                            <EmptyState title="No matching activities" description="Adjust your search query." />
                          </td>
                        </tr>
                      );
                    }
                    return filteredActivities.map((act) => {
                      const cat = categories.find((c) => c.id === act.categoryId);
                      const dept = departments.find((d) => d.id === act.departmentId);
                      return (
                        <tr key={act.id} className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                          <td className="py-2.5 px-3 text-sm font-mono-data">{act.date}</td>
                          <td className="py-2.5 px-3 text-sm font-medium text-paper">
                            <div>{act.title}</div>
                            {act.description && (
                              <div className="text-xs text-paper-dim mt-0.5 max-w-[200px] truncate">
                                {act.description}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-sm text-paper-dim">{cat ? cat.name : 'Unknown'}</td>
                          <td className="py-2.5 px-3 text-sm text-paper-dim">{dept ? dept.code : 'Org-Wide'}</td>
                          <td className="py-2.5 px-3 text-sm">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                act.status === 'Completed'
                                  ? 'bg-canopy/15 text-canopy'
                                  : act.status === 'Ongoing'
                                  ? 'bg-amber/15 text-amber'
                                  : act.status === 'Cancelled'
                                  ? 'bg-alert/15 text-alert'
                                  : 'bg-white/5 text-paper-dim'
                              }`}
                            >
                              {act.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleEditActivity(act)}
                              className="text-xs mr-3 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-paper font-semibold font-sans cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(act.id)}
                              className="text-xs px-2 py-1 rounded bg-alert/15 hover:bg-alert/30 text-alert font-semibold font-sans cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title={activityForm.id ? 'Edit CSR Activity' : 'Plan CSR Activity'}>
            <form onSubmit={handleSaveActivity} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Activity Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tree Planting Drive"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Category
                </label>
                <select
                  value={activityForm.categoryId}
                  onChange={(e) => setActivityForm({ ...activityForm, categoryId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>-- Select --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: 'var(--ink)' }}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Scope Department
                </label>
                <select
                  value={activityForm.departmentId}
                  onChange={(e) => setActivityForm({ ...activityForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>Org-Wide (All Employees)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id} style={{ background: 'var(--ink)' }}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Planned Date
                </label>
                <input
                  type="date"
                  value={activityForm.date}
                  onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy font-mono-data"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Status
                </label>
                <select
                  value={activityForm.status}
                  onChange={(e) => setActivityForm({ ...activityForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="Planned" style={{ background: 'var(--ink)' }}>Planned</option>
                  <option value="Ongoing" style={{ background: 'var(--ink)' }}>Ongoing</option>
                  <option value="Completed" style={{ background: 'var(--ink)' }}>Completed</option>
                  <option value="Cancelled" style={{ background: 'var(--ink)' }}>Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Brief Description
                </label>
                <textarea
                  placeholder="Describe details or goals..."
                  rows={3}
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 mt-2 rounded bg-canopy hover:bg-canopy-dim text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Log CSR Activity
              </button>
            </form>
          </Card>
        </div>
      )}

      {!loading && activeTab === 'participations' && (
        <Card title="Employee CSR Approvals Queue">
          {selectedPartIds.length > 0 && (
            <div className="mb-4 p-3 rounded bg-moss/20 border border-canopy/30 flex items-center justify-between animate-fade-in">
              <span className="text-xs text-paper-dim">
                Selected <strong className="text-paper">{selectedPartIds.length}</strong> pending requests
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkApprove}
                  className="px-3.5 py-1.5 rounded bg-canopy hover:bg-canopy-dim text-white text-xs font-semibold cursor-pointer"
                >
                  Approve Selected
                </button>
                <button
                  onClick={handleBulkReject}
                  className="px-3.5 py-1.5 rounded bg-alert/20 border border-alert/30 text-alert hover:bg-alert/30 text-xs font-semibold cursor-pointer"
                >
                  Reject Selected
                </button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto my-2 animate-fade-in">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">
                    <input
                      type="checkbox"
                      checked={selectedPartIds.length > 0 && selectedPartIds.length === participations.filter(p => p.approvalStatus === 'Pending').length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPartIds(participations.filter(p => p.approvalStatus === 'Pending').map(p => p.id));
                        } else {
                          setSelectedPartIds([]);
                        }
                      }}
                      className="rounded border-moss-line text-canopy focus:ring-canopy cursor-pointer"
                    />
                  </th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Employee</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Activity Name</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Rewards Credit</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Evidence proof</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Quality</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Status</th>
                  <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim font-sans">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const pendingCount = participations.filter(p => p.approvalStatus === 'Pending').length;
                  if (participations.length === 0 || pendingCount === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="py-8">
                          <EmptyState
                            title="All caught up"
                            description="No participation requested awaiting approval."
                          />
                        </td>
                      </tr>
                    );
                  }
                  
                  return participations.map((part) => {
                    const emp = employees.find((e) => e.id === part.employeeId);
                    const act = activities.find((a) => a.id === part.activityId);
                    const isQualitySane = part.proofUrl && part.proofUrl.startsWith('http');
                    return (
                      <tr key={part.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--moss-line)' }}>
                        <td className="py-2.5 px-3 text-sm">
                          {part.approvalStatus === 'Pending' ? (
                            <input
                              type="checkbox"
                              checked={selectedPartIds.includes(part.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPartIds(prev => [...prev, part.id]);
                                } else {
                                  setSelectedPartIds(prev => prev.filter(id => id !== part.id));
                                }
                              }}
                              className="rounded border-moss-line text-canopy focus:ring-canopy cursor-pointer"
                            />
                          ) : (
                            <span className="opacity-20">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-sm text-paper font-semibold">{emp ? emp.name : 'Unknown'}</td>
                        <td className="py-2.5 px-3 text-sm text-paper-dim">{act ? act.title : 'Unknown'}</td>
                        <td className="py-2.5 px-3 text-sm font-mono-data text-amber font-bold">
                          {part.pointsEarned} <span className="text-[10px] text-paper-dim">Points</span>
                        </td>
                        <td className="py-2.5 px-3 text-sm font-mono-data">
                          {part.proofUrl ? (
                            <a
                              href={part.proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-canopy underline hover:text-canopy-dim"
                            >
                              View File
                            </a>
                          ) : (
                            <span className="text-alert font-medium">No File Uploaded</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-sm">
                          {isQualitySane ? (
                            <span className="px-1.5 py-0.5 rounded bg-canopy/10 text-canopy border border-canopy/20 text-[9px] font-semibold animate-fade-in" title="Databricks/Trifacta Grounded Quality: Evidence url exists and is valid link">
                              Complete
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-alert/10 text-alert border border-alert/20 text-[9px] font-semibold animate-fade-in" title="Databricks/Trifacta Grounded Quality: Missing proof file link attachment">
                              Needs Review
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-sm font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              part.approvalStatus === 'Approved'
                                ? 'bg-canopy/15 text-canopy'
                                : part.approvalStatus === 'Rejected'
                                ? 'bg-alert/15 text-alert'
                                : 'bg-amber/15 text-amber'
                            }`}
                          >
                            {part.approvalStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {part.approvalStatus === 'Pending' && (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleApproveParticipation(part)}
                                className="text-xs px-2.5 py-1 rounded bg-canopy hover:bg-canopy-dim text-white font-semibold font-sans cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectParticipation(part.id)}
                                className="text-xs px-2.5 py-1 rounded bg-alert/15 hover:bg-alert/30 text-alert font-semibold font-sans cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
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
      )}

      {activeTab === 'diversity' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {/* Department distribution */}
          <Card title="Employees by Department" eyebrow="Diversity spread">
            <div className="flex flex-col gap-4 my-2">
              {deptDistribution.map((d) => (
                <div key={d.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-paper">{d.name} ({d.code})</span>
                    <span className="font-mono-data text-paper-dim">{d.count} ({d.pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded bg-white/5 overflow-hidden">
                    <div className="h-full rounded bg-slate transition-all duration-1000" style={{ width: `${d.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Role distribution */}
          <Card title="Workplace Roles Division" eyebrow="Organizational split">
            <div className="flex flex-col gap-4 my-2">
              {roleDistribution.map((r) => (
                <div key={r.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-paper">{r.name}</span>
                    <span className="font-mono-data text-paper-dim">{r.count} ({r.pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded bg-white/5 overflow-hidden">
                    <div className="h-full rounded bg-amber transition-all duration-1000" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'training' && (
        <Card title="Compliance and ESG Training Status Tracker">
          <div className="overflow-x-auto my-2 animate-fade-in">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Employee</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Department</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Required Courses</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Completed Actions</th>
                  <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim">Ratio Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const dept = departments.find((d) => d.id === emp.departmentId);
                  
                  // Query how many of the seeded/running trainings this employee has completed
                  const completedTrainingsCount = participations.filter(
                    (p) => p.employeeId === emp.id && p.approvalStatus === 'Approved' &&
                           trainingActivities.some((act) => act.id === p.activityId)
                  ).length;
                  
                  const targetTrainingsCount = trainingActivities.length;
                  const ratio = targetTrainingsCount > 0 ? (completedTrainingsCount / targetTrainingsCount) * 100 : 100;

                  return (
                    <tr key={emp.id} className="border-b hover:bg-white/5" style={{ borderColor: 'var(--moss-line)' }}>
                      <td className="py-2.5 px-3 text-sm text-paper font-semibold">{emp.name}</td>
                      <td className="py-2.5 px-3 text-sm text-paper-dim">{dept ? dept.name : 'Unknown'}</td>
                      <td className="py-2.5 px-3 text-sm font-mono-data text-paper-dim">{targetTrainingsCount}</td>
                      <td className="py-2.5 px-3 text-sm font-mono-data text-canopy font-semibold">{completedTrainingsCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono-data">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ratio === 100
                              ? 'bg-canopy/15 text-canopy'
                              : ratio >= 50
                              ? 'bg-amber/15 text-amber'
                              : 'bg-alert/15 text-alert'
                          }`}
                        >
                          {ratio.toFixed(0)}% Done
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
