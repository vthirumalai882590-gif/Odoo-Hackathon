import { useState, useEffect } from 'react';
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
  ESGPolicy,
  PolicyAcknowledgement,
  Audit,
  ComplianceIssue,
  Employee,
  Department,
  AppNotification
} from '../types';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';

export default function Governance() {
  const [activeTab, setActiveTab] = useState<'policies' | 'acks' | 'audits' | 'issues'>('policies');

  // DB States
  const [policies, setPolicies] = useState<ESGPolicy[]>([]);
  const [acks, setAcks] = useState<PolicyAcknowledgement[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Messages & Errors
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // UX & Selection states
  const [loading, setLoading] = useState(true);
  const [selectedAckIds, setSelectedAckIds] = useState<string[]>([]);
  const [govSearch, setGovSearch] = useState('');
  const { showToast } = useToast();

  // Form states
  const [policyForm, setPolicyForm] = useState({ id: '', title: '', category: 'Environmental' as any, version: '', documentUrl: '', effectiveDate: '', status: 'Active' as any });
  const [auditForm, setAuditForm] = useState({ id: '', title: '', departmentId: '', auditorEmployeeId: '', scheduledDate: '', status: 'Scheduled' as any, findingsSummary: '' });
  const [issueForm, setIssueForm] = useState({ id: '', auditId: '', severity: 'Medium' as any, description: '', ownerEmployeeId: '', dueDate: '', status: 'Open' as any });

  // AI Helper States
  const [aiSeverityLoading, setAiSeverityLoading] = useState(false);
  const [aiSeverityExplanation, setAiSeverityExplanation] = useState('');

  const handleSuggestSeverity = async () => {
    if (!issueForm.description.trim()) return;
    setAiSeverityLoading(true);
    setErrorMsg('');
    setAiSeverityExplanation('');
    try {
      const result = await callEsgAI('suggestSeverity', { description: issueForm.description });
      setIssueForm({ ...issueForm, severity: result.severity });
      setAiSeverityExplanation(result.explanation);
    } catch (e: any) {
      setErrorMsg('AI Severity suggestion failed: ' + e.message);
    } finally {
      setAiSeverityLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 6) {
        setLoading(false);
      }
    };

    const unsubPolicies = onSnapshot(collection(db, 'esgPolicies'), (snap: any) => {
      const list: ESGPolicy[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setPolicies(list);
      checkLoaded();
    });

    const unsubAcks = onSnapshot(collection(db, 'policyAcknowledgements'), (snap: any) => {
      const list: PolicyAcknowledgement[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setAcks(list);
      checkLoaded();
    });

    const unsubAudits = onSnapshot(collection(db, 'audits'), (snap: any) => {
      const list: Audit[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setAudits(list);
      checkLoaded();
    });

    const unsubIssues = onSnapshot(collection(db, 'complianceIssues'), (snap: any) => {
      const list: ComplianceIssue[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setIssues(list);
      checkLoaded();
    });

    const unsubEmps = onSnapshot(collection(db, 'employees'), (snap: any) => {
      const list: Employee[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setEmployees(list);
      checkLoaded();
    });

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap: any) => {
      const list: Department[] = [];
      snap.docs.forEach((d: any) => list.push(d.data()));
      setDepartments(list);
      checkLoaded();
    });

    return () => {
      unsubPolicies();
      unsubAcks();
      unsubAudits();
      unsubIssues();
      unsubEmps();
      unsubDepts();
    };
  }, []);

  // Save Policy
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!policyForm.title.trim() || !policyForm.version.trim() || !policyForm.effectiveDate) {
      setErrorMsg('Policy Title, Version, and Effective Date are required.');
      return;
    }

    const policyData: ESGPolicy = {
      id: policyForm.id || `pol-${Math.random().toString(36).substring(2, 9)}`,
      title: policyForm.title.trim(),
      category: policyForm.category,
      version: policyForm.version.trim(),
      documentUrl: policyForm.documentUrl.trim() || undefined,
      effectiveDate: policyForm.effectiveDate,
      status: policyForm.status
    };

    try {
      await setDoc(doc(db, 'esgPolicies', policyData.id), policyData);
      
      // Auto-create pending policy acknowledgements for all active employees if it is a new active policy
      if (!policyForm.id && policyData.status === 'Active') {
        for (const emp of employees) {
          const ackId = `ack-${policyData.id}-${emp.id}`;
          const ackRecord: PolicyAcknowledgement = {
            id: ackId,
            policyId: policyData.id,
            employeeId: emp.id,
            acknowledgedAt: null,
            reminderSentAt: null
          };
          await setDoc(doc(db, 'policyAcknowledgements', ackId), ackRecord);
        }
      }

      setPolicyForm({ id: '', title: '', category: 'Environmental', version: '', documentUrl: '', effectiveDate: '', status: 'Active' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving policy.');
    }
  };

  const handleEditPolicy = (p: ESGPolicy) => {
    setPolicyForm({
      id: p.id,
      title: p.title,
      category: p.category,
      version: p.version,
      documentUrl: p.documentUrl || '',
      effectiveDate: p.effectiveDate,
      status: p.status
    });
  };

  const handleDeletePolicy = async (id: string) => {
    if (confirm('Are you sure you want to delete this policy?')) {
      await deleteDoc(doc(db, 'esgPolicies', id));
    }
  };

  // Send Policy Reminder Notification
  const handleSendReminder = async (ackRecord: PolicyAcknowledgement, policyTitle: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Write In-App Notification
      const notifId = `notif-${Math.random().toString(36).substring(2, 9)}`;
      const notif: AppNotification = {
        id: notifId,
        type: 'PolicyReminder',
        recipientEmployeeId: ackRecord.employeeId,
        message: `Reminder: Please read and acknowledge the policy: "${policyTitle}" as soon as possible.`,
        read: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', notifId), notif);

      // 2. Update Acknowledgement with reminder timestamp
      await setDoc(
        doc(db, 'policyAcknowledgements', ackRecord.id),
        { reminderSentAt: new Date().toISOString() },
        { merge: true }
      );

      showToast({ message: 'Policy reminder notification pushed successfully!', type: 'success' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending reminder.');
      showToast({ message: 'Failed to send reminder: ' + err.message, type: 'error' });
    }
  };

  const handleBulkReminders = async () => {
    setErrorMsg('');
    const pendingAcks = acks.filter(a => selectedAckIds.includes(a.id) && !a.acknowledgedAt);
    if (pendingAcks.length === 0) return;

    let sentCount = 0;
    try {
      for (const ack of pendingAcks) {
        const pol = policies.find(p => p.id === ack.policyId);
        const policyTitle = pol ? pol.title : 'Policy';
        
        const notifId = `notif-${Math.random().toString(36).substring(2, 9)}`;
        const notif: AppNotification = {
          id: notifId,
          type: 'PolicyReminder',
          recipientEmployeeId: ack.employeeId,
          message: `Reminder: Please read and acknowledge the policy: "${policyTitle}" as soon as possible.`,
          read: false,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'notifications', notifId), notif);

        await setDoc(
          doc(db, 'policyAcknowledgements', ack.id),
          { reminderSentAt: new Date().toISOString() },
          { merge: true }
        );
        sentCount++;
      }
      showToast({ message: `Successfully pushed ${sentCount} reminders.`, type: 'success' });
      setSelectedAckIds([]);
    } catch (e: any) {
      setErrorMsg('Failed to send bulk reminders: ' + e.message);
    }
  };

  // Save Audit Cycle
  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!auditForm.title.trim() || !auditForm.departmentId || !auditForm.auditorEmployeeId || !auditForm.scheduledDate) {
      setErrorMsg('Audit Title, Department, Auditor, and Date are required.');
      return;
    }

    const auditData: Audit = {
      id: auditForm.id || `aud-${Math.random().toString(36).substring(2, 9)}`,
      title: auditForm.title.trim(),
      departmentId: auditForm.departmentId,
      auditorEmployeeId: auditForm.auditorEmployeeId,
      scheduledDate: auditForm.scheduledDate,
      status: auditForm.status,
      findingsSummary: auditForm.findingsSummary.trim() || undefined
    };

    try {
      await setDoc(doc(db, 'audits', auditData.id), auditData);
      setAuditForm({ id: '', title: '', departmentId: '', auditorEmployeeId: '', scheduledDate: '', status: 'Scheduled', findingsSummary: '' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving audit.');
    }
  };

  const handleEditAudit = (aud: Audit) => {
    setAuditForm({
      id: aud.id,
      title: aud.title,
      departmentId: aud.departmentId,
      auditorEmployeeId: aud.auditorEmployeeId,
      scheduledDate: aud.scheduledDate,
      status: aud.status,
      findingsSummary: aud.findingsSummary || ''
    });
  };

  // Save Compliance Issue
  const handleSaveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Strict validation: Owner + Due Date are non-negotiable
    if (!issueForm.ownerEmployeeId || !issueForm.dueDate) {
      setErrorMsg('Owner Assignment and Due Date are mandatory to flag a compliance issue.');
      return;
    }
    if (!issueForm.auditId || !issueForm.description.trim()) {
      setErrorMsg('Linked Audit and description are required.');
      return;
    }

    const issueData: ComplianceIssue = {
      id: issueForm.id || `comp-${Math.random().toString(36).substring(2, 9)}`,
      auditId: issueForm.auditId,
      severity: issueForm.severity,
      description: issueForm.description.trim(),
      ownerEmployeeId: issueForm.ownerEmployeeId,
      dueDate: issueForm.dueDate,
      status: issueForm.status
    };

    try {
      await setDoc(doc(db, 'complianceIssues', issueData.id), issueData);

      // Trigger compliance raised notification
      const notifId = `notif-${Math.random().toString(36).substring(2, 9)}`;
      const notif: AppNotification = {
        id: notifId,
        type: 'ComplianceIssueRaised',
        recipientEmployeeId: issueData.ownerEmployeeId,
        message: `New compliance issue assigned: "${issueData.description}" (Due: ${issueData.dueDate})`,
        read: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', notifId), notif);

      setIssueForm({ id: '', auditId: '', severity: 'Medium', description: '', ownerEmployeeId: '', dueDate: '', status: 'Open' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error raising compliance issue.');
    }
  };

  const handleResolveIssue = async (issueId: string) => {
    try {
      await setDoc(doc(db, 'complianceIssues', issueId), { status: 'Resolved' }, { merge: true });
    } catch (err: any) {
      setErrorMsg('Failed to resolve issue: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-2xl" style={{ color: 'var(--paper)' }}>
          Governance & Compliance Ledger
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--paper-dim)' }}>
          Register corporate policies, check employee acknowledgements, track audits, and resolve safety/compliance issues.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b animate-fade-in" style={{ borderColor: 'var(--moss-line)' }}>
        {(
          [
            { id: 'policies', label: 'ESG Policies' },
            { id: 'acks', label: 'Policy Acknowledgements' },
            { id: 'audits', label: 'Audits Lifecycle' },
            { id: 'issues', label: 'Compliance Issues' }
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
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

      {/* Tab contents */}
      {/* Skeleton Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2">
            <Card title="Loading Policies...">
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
      ) : activeTab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <Card className="lg:col-span-2" title="Corporate Policy Registry">
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search policies..."
                value={govSearch}
                onChange={(e) => setGovSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-40"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Policy Title</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Category</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Version</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Effective Date</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Status</th>
                    <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim font-sans">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredPolicies = policies.filter(p => p.title.toLowerCase().includes(govSearch.toLowerCase()));
                    if (policies.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-8">
                            <EmptyState
                              title="No corporate policies registered"
                              description="Compliance audits require active policy declarations."
                              actionLabel="Add Policy"
                              onAction={() => {
                                const input = document.querySelector('input[placeholder="e.g. Workplace Code of Ethics"]') as HTMLInputElement;
                                if (input) input.focus();
                              }}
                            />
                          </td>
                        </tr>
                      );
                    }
                    if (filteredPolicies.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-8">
                            <EmptyState title="No matching policies" description="Adjust search term." />
                          </td>
                        </tr>
                      );
                    }
                    return filteredPolicies.map((p) => (
                      <tr key={p.id} className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                        <td className="py-2.5 px-3 text-sm font-semibold text-paper">
                          {p.documentUrl ? (
                            <a href={p.documentUrl} target="_blank" rel="noreferrer" className="text-canopy underline hover:text-canopy-dim">
                              {p.title}
                            </a>
                          ) : (
                            p.title
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-sm text-paper-dim">{p.category}</td>
                        <td className="py-2.5 px-3 text-sm font-mono-data text-amber font-semibold">{p.version}</td>
                        <td className="py-2.5 px-3 text-sm font-mono-data">{p.effectiveDate}</td>
                        <td className="py-2.5 px-3 text-sm">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${p.status === 'Active' ? 'bg-canopy' : 'bg-paper-dim'}`} />
                          {p.status}
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <button
                            onClick={() => handleEditPolicy(p)}
                            className="text-xs mr-3 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-paper font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(p.id)}
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

          <Card title={policyForm.id ? 'Edit Policy' : 'Create ESG Policy'}>
            <form onSubmit={handleSavePolicy} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Policy Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Workplace Code of Ethics"
                  value={policyForm.title}
                  onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  ESG Category
                </label>
                <select
                  value={policyForm.category}
                  onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="Environmental" style={{ background: 'var(--ink)' }}>Environmental</option>
                  <option value="Social" style={{ background: 'var(--ink)' }}>Social</option>
                  <option value="Governance" style={{ background: 'var(--ink)' }}>Governance</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                    Version Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. v1.2"
                    value={policyForm.version}
                    onChange={(e) => setPolicyForm({ ...policyForm, version: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy font-mono-data placeholder:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={policyForm.effectiveDate}
                    onChange={(e) => setPolicyForm({ ...policyForm, effectiveDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy font-mono-data"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Document Reference Link
                </label>
                <input
                  type="text"
                  placeholder="https://ecosphere.com/policies/..."
                  value={policyForm.documentUrl}
                  onChange={(e) => setPolicyForm({ ...policyForm, documentUrl: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Status
                </label>
                <select
                  value={policyForm.status}
                  onChange={(e) => setPolicyForm({ ...policyForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="Active" style={{ background: 'var(--ink)' }}>Active</option>
                  <option value="Inactive" style={{ background: 'var(--ink)' }}>Inactive</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 mt-2 rounded bg-canopy hover:bg-canopy-dim text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Register Policy
              </button>
            </form>
          </Card>
        </div>
      )}

      {!loading && activeTab === 'acks' && (
        <Card title="Acknowledge Matrix">
          {selectedAckIds.length > 0 && (
            <div className="mb-4 p-3 rounded bg-moss/20 border border-canopy/30 flex items-center justify-between animate-fade-in">
              <span className="text-xs text-paper-dim">
                Selected <strong className="text-paper">{selectedAckIds.length}</strong> pending signoffs
              </span>
              <button
                onClick={handleBulkReminders}
                className="px-3.5 py-1.5 rounded bg-canopy hover:bg-canopy-dim text-white text-xs font-semibold cursor-pointer"
              >
                Send Reminders to Selected
              </button>
            </div>
          )}
          <div className="overflow-x-auto my-2 animate-fade-in">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">
                    <input
                      type="checkbox"
                      checked={selectedAckIds.length > 0 && selectedAckIds.length === acks.filter(a => !a.acknowledgedAt).length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAckIds(acks.filter(a => !a.acknowledgedAt).map(a => a.id));
                        } else {
                          setSelectedAckIds([]);
                        }
                      }}
                      className="rounded border-moss-line text-canopy focus:ring-canopy cursor-pointer"
                    />
                  </th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Employee</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Policy Title</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Status</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Signed Date</th>
                  <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Last Reminder</th>
                  <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim font-sans">Actions</th>
                </tr>
              </thead>
              <tbody>
                {acks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-sm text-paper-dim">
                      No acknowledgements tracking records found. Active policies automatically assign signoffs.
                    </td>
                  </tr>
                ) : (
                  acks.map((ack) => {
                    const emp = employees.find((e) => e.id === ack.employeeId);
                    const pol = policies.find((p) => p.id === ack.policyId);
                    if (!emp || !pol) return null;
                    return (
                      <tr key={ack.id} className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                        <td className="py-2.5 px-3 text-sm">
                          {!ack.acknowledgedAt ? (
                            <input
                              type="checkbox"
                              checked={selectedAckIds.includes(ack.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAckIds(prev => [...prev, ack.id]);
                                } else {
                                  setSelectedAckIds(prev => prev.filter(id => id !== ack.id));
                                }
                              }}
                              className="rounded border-moss-line text-canopy focus:ring-canopy cursor-pointer"
                            />
                          ) : (
                            <span className="opacity-20">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-sm text-paper font-semibold">{emp.name}</td>
                        <td className="py-2.5 px-3 text-sm text-paper-dim">{pol.title}</td>
                        <td className="py-2.5 px-3 text-sm font-semibold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${ack.acknowledgedAt ? 'bg-canopy/15 text-canopy' : 'bg-amber/15 text-amber'}`}>
                            {ack.acknowledgedAt ? 'Acknowledged' : 'Pending Signoff'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-sm font-mono-data text-paper-dim">
                          {ack.acknowledgedAt ? ack.acknowledgedAt.split('T')[0] : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-sm font-mono-data text-paper-dim">
                          {ack.reminderSentAt ? ack.reminderSentAt.split('T')[0] : 'Never'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {!ack.acknowledgedAt && (
                            <button
                              onClick={() => handleSendReminder(ack, pol.title)}
                              className="text-xs px-2.5 py-1 rounded bg-amber/10 hover:bg-amber/20 text-amber font-semibold font-sans cursor-pointer"
                            >
                              Send Reminder
                            </button>
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

      {!loading && activeTab === 'audits' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <Card className="lg:col-span-2" title="Audit Cycles Schedule">
            <div className="flex flex-col gap-4 my-2">
              {audits.length === 0 ? (
                <p className="text-sm text-paper-dim py-4 text-center">
                  No audits scheduled. Plan one on the right.
                </p>
              ) : (
                audits.map((aud) => {
                  const dept = departments.find((d) => d.id === aud.departmentId);
                  const auditor = employees.find((e) => e.id === aud.auditorEmployeeId);
                  return (
                    <div key={aud.id} className="p-4 rounded border flex flex-col gap-3" style={{ background: 'var(--ink-raised)', borderColor: 'var(--moss-line)' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-paper">{aud.title}</h4>
                          <span className="text-[10px] uppercase tracking-wider text-paper-dim mt-0.5 inline-block">
                            Department: {dept ? dept.name : 'Unknown'} · Auditor: {auditor ? auditor.name : 'Unassigned'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${aud.status === 'Completed' ? 'bg-canopy/15 text-canopy' : aud.status === 'In Progress' ? 'bg-amber/15 text-amber' : 'bg-white/5 text-paper-dim'}`}>
                          {aud.status}
                        </span>
                      </div>

                      {aud.findingsSummary && (
                        <div className="p-2.5 rounded bg-white/5 text-xs text-paper-dim border-l border-canopy italic font-sans leading-relaxed">
                          "{aud.findingsSummary}"
                        </div>
                      )}

                      <div className="flex justify-between items-center text-[10px] font-mono-data text-paper-dim border-t border-moss-line/50 pt-2">
                        <span>Target Date: {aud.scheduledDate}</span>
                        <button
                          onClick={() => handleEditAudit(aud)}
                          className="text-xs text-canopy font-semibold font-sans hover:underline"
                        >
                          Modify / Close Audit
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card title="Plan Audit Cycle">
            <form onSubmit={handleSaveAudit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Audit Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Physical Compliance"
                  value={auditForm.title}
                  onChange={(e) => setAuditForm({ ...auditForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Target Department
                </label>
                <select
                  value={auditForm.departmentId}
                  onChange={(e) => setAuditForm({ ...auditForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>-- Select --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id} style={{ background: 'var(--ink)' }}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Assigned Auditor
                </label>
                <select
                  value={auditForm.auditorEmployeeId}
                  onChange={(e) => setAuditForm({ ...auditForm, auditorEmployeeId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>-- Select --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id} style={{ background: 'var(--ink)' }}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={auditForm.scheduledDate}
                  onChange={(e) => setAuditForm({ ...auditForm, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy font-mono-data"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Status
                </label>
                <select
                  value={auditForm.status}
                  onChange={(e) => setAuditForm({ ...auditForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="Scheduled" style={{ background: 'var(--ink)' }}>Scheduled</option>
                  <option value="In Progress" style={{ background: 'var(--ink)' }}>In Progress</option>
                  <option value="Completed" style={{ background: 'var(--ink)' }}>Completed</option>
                </select>
              </div>

              {auditForm.status === 'Completed' && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                    Audit Findings Summary
                  </label>
                  <textarea
                    placeholder="Document audit summary and suggest compliance corrections..."
                    rows={3}
                    value={auditForm.findingsSummary}
                    onChange={(e) => setAuditForm({ ...auditForm, findingsSummary: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-50"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 mt-2 rounded bg-canopy hover:bg-canopy-dim text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Log Audit Record
              </button>
            </form>
          </Card>
        </div>
      )}

      {!loading && activeTab === 'issues' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <Card className="lg:col-span-2" title="Compliance Issues Log">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--moss-line)' }}>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Linked Audit</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim">Description</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim font-sans">Owner</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim font-sans">Due Date</th>
                    <th className="py-2 px-3 text-[11px] uppercase tracking-wider text-paper-dim font-sans">Severity</th>
                    <th className="py-2 px-3 text-right text-[11px] uppercase tracking-wider text-paper-dim font-sans">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-sm text-paper-dim">
                        No active compliance issues logged. audits populate this dashboard.
                      </td>
                    </tr>
                  ) : (
                    issues.map((iss) => {
                      const aud = audits.find((a) => a.id === iss.auditId);
                      const owner = employees.find((e) => e.id === iss.ownerEmployeeId);
                      
                      // Evaluate overdue rule
                      const isOverdue = iss.status !== 'Resolved' && iss.dueDate < todayStr;
                      
                      return (
                        <tr
                          key={iss.id}
                          className={`border-b transition-colors ${
                            isOverdue
                              ? 'bg-alert/5 border-l-2 border-l-alert'
                              : 'hover:bg-white/5'
                          }`}
                          style={{ borderColor: 'var(--moss-line)' }}
                        >
                          <td className="py-2.5 px-3 text-sm text-paper font-semibold">{aud ? aud.title : 'External'}</td>
                          <td className="py-2.5 px-3 text-sm text-paper-dim">{iss.description}</td>
                          <td className="py-2.5 px-3 text-sm text-paper">{owner ? owner.name : 'Unassigned'}</td>
                          <td className="py-2.5 px-3 text-sm font-mono-data">{iss.dueDate}</td>
                          <td className="py-2.5 px-3 text-sm">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                iss.severity === 'Critical'
                                  ? 'bg-alert text-white'
                                  : iss.severity === 'High'
                                  ? 'bg-alert/15 text-alert'
                                  : iss.severity === 'Medium'
                                  ? 'bg-amber/15 text-amber'
                                  : 'bg-white/5 text-paper-dim'
                              }`}
                            >
                              {iss.severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {iss.status !== 'Resolved' ? (
                              <div className="flex gap-2 justify-end">
                                {isOverdue && (
                                  <span className="px-2 py-0.5 rounded bg-alert text-white text-[9px] font-bold tracking-wider uppercase animate-pulse self-center">
                                    Overdue
                                  </span>
                                )}
                                <button
                                  onClick={() => handleResolveIssue(iss.id)}
                                  className="text-xs px-2 py-1 rounded bg-canopy hover:bg-canopy-dim text-white font-semibold font-sans cursor-pointer"
                                >
                                  Resolve
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-canopy font-semibold font-mono-data">RESOLVED</span>
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

          <Card title="Flag Compliance Issue">
            <form onSubmit={handleSaveIssue} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Linked Audit
                </label>
                <select
                  value={issueForm.auditId}
                  onChange={(e) => setIssueForm({ ...issueForm, auditId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>-- Select Audit --</option>
                  {audits.map((a) => (
                    <option key={a.id} value={a.id} style={{ background: 'var(--ink)' }}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Severity
                </label>
                <select
                  value={issueForm.severity}
                  onChange={(e) => setIssueForm({ ...issueForm, severity: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="Low" style={{ background: 'var(--ink)' }}>Low</option>
                  <option value="Medium" style={{ background: 'var(--ink)' }}>Medium</option>
                  <option value="High" style={{ background: 'var(--ink)' }}>High</option>
                  <option value="Critical" style={{ background: 'var(--ink)' }}>Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Assigned Owner (Employee)
                </label>
                <select
                  value={issueForm.ownerEmployeeId}
                  onChange={(e) => setIssueForm({ ...issueForm, ownerEmployeeId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy"
                >
                  <option value="" style={{ background: 'var(--ink)' }}>-- Select Owner --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id} style={{ background: 'var(--ink)' }}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Due Date
                </label>
                <input
                  type="date"
                  value={issueForm.dueDate}
                  onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy font-mono-data"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-paper-dim mb-1 font-medium">
                  Issue Description
                </label>
                <textarea
                  placeholder="Detail the failure and resolution requirements..."
                  rows={3}
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-moss-line text-paper focus:outline-none focus:border-canopy placeholder:opacity-50"
                />
                
                {/* AI Severity recommender */}
                <div className="mt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleSuggestSeverity}
                    disabled={aiSeverityLoading || !issueForm.description.trim()}
                    className="py-1 px-3 text-[10px] font-bold uppercase rounded bg-moss hover:bg-white/10 text-paper-dim hover:text-paper cursor-pointer transition-colors"
                  >
                    {aiSeverityLoading ? 'Recommending...' : 'AI Recommend Severity'}
                  </button>
                  {aiSeverityExplanation && (
                    <span className="px-1.5 py-0.5 rounded bg-amber/15 text-amber text-[9px] font-mono-data font-semibold">
                      AI-SUGGESTED
                    </span>
                  )}
                </div>
                {aiSeverityExplanation && (
                  <div className="mt-2 p-2 rounded bg-amber/10 border border-amber/30 text-[11px] text-paper-dim italic">
                    Reasoning: "{aiSeverityExplanation}"
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2 mt-2 rounded bg-canopy hover:bg-canopy-dim text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Raise Issue
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
