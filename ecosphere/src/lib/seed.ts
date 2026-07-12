import { db, setDoc, doc } from './firebase';
import type {
  Department,
  Employee,
  Category,
  EmissionFactor,
  EnvironmentalGoal,
  ESGPolicy,
  Badge,
  Reward,
  Challenge,
  Audit,
  ComplianceIssue,
  CarbonTransaction,
  CSRActivity,
  ESGConfig,
  EmployeeParticipation,
  ChallengeParticipation,
  PolicyAcknowledgement
} from '../types';

export async function seedDatabase() {
  // Clear localStorage if in mock mode
  if (typeof (db as any).clearAll === 'function') {
    (db as any).clearAll();
  }

  // 1. Seed Singleton Config
  const config: ESGConfig = {
    weighting: { environmental: 40, social: 30, governance: 30 },
    autoEmissionCalculation: true,
    evidenceRequiredForCSR: true,
    badgeAutoAward: true,
    notificationsEnabled: { inApp: true, email: false }
  };
  await setDoc(doc(db, 'config', 'esgConfig'), config);

  // 2. Seed Departments
  const departments: Department[] = [
    { id: 'dept-ops', name: 'Operations & Logistics', code: 'OPS', headEmployeeId: 'emp-head-ops', parentDepartmentId: null, employeeCount: 5, status: 'Active' },
    { id: 'dept-canopy', name: 'Environmental & Sustainability (Canopy)', code: 'ENV', headEmployeeId: 'emp-thiru', parentDepartmentId: null, employeeCount: 5, status: 'Active' },
    { id: 'dept-social', name: 'Social Relations & CSR', code: 'SOC', headEmployeeId: 'emp-head-soc', parentDepartmentId: null, employeeCount: 4, status: 'Active' },
    { id: 'dept-gov', name: 'Corporate Governance & Legal', code: 'GOV', headEmployeeId: 'emp-head-gov', parentDepartmentId: null, employeeCount: 4, status: 'Active' },
    { id: 'dept-exec', name: 'Executive Suite', code: 'EXE', headEmployeeId: 'emp-ceo', parentDepartmentId: null, employeeCount: 2, status: 'Active' }
  ];

  for (const dept of departments) {
    await setDoc(doc(db, 'departments', dept.id), dept);
  }

  // 3. Seed Employees
  const employees: Employee[] = [
    {
      id: 'emp-thiru',
      name: 'Thiru',
      email: 'thiru@ecosphere.com',
      departmentId: 'dept-canopy',
      role: 'Admin',
      status: 'Active',
      xp: 1240,
      points: 1240,
      badgeIds: ['badge-pioneer', 'badge-carbon'],
      joinedAt: '2026-01-10T08:00:00Z'
    },
    {
      id: 'emp-ceo',
      name: 'Elena Rostova',
      email: 'elena@ecosphere.com',
      departmentId: 'dept-exec',
      role: 'Admin',
      status: 'Active',
      xp: 450,
      points: 450,
      badgeIds: ['badge-pioneer'],
      joinedAt: '2026-01-01T08:00:00Z'
    },
    {
      id: 'emp-head-ops',
      name: 'Marcus Vance',
      email: 'marcus@ecosphere.com',
      departmentId: 'dept-ops',
      role: 'Department Head',
      status: 'Active',
      xp: 850,
      points: 550,
      badgeIds: ['badge-pioneer', 'badge-csr'],
      joinedAt: '2026-01-15T09:00:00Z'
    },
    {
      id: 'emp-head-soc',
      name: 'Aisha Kante',
      email: 'aisha@ecosphere.com',
      departmentId: 'dept-social',
      role: 'Department Head',
      status: 'Active',
      xp: 720,
      points: 420,
      badgeIds: ['badge-pioneer', 'badge-csr'],
      joinedAt: '2026-02-01T09:00:00Z'
    },
    {
      id: 'emp-head-gov',
      name: 'Sarah Jenkins',
      email: 'sarah@ecosphere.com',
      departmentId: 'dept-gov',
      role: 'Department Head',
      status: 'Active',
      xp: 680,
      points: 380,
      badgeIds: ['badge-pioneer'],
      joinedAt: '2026-02-10T10:00:00Z'
    },
    {
      id: 'emp-6',
      name: 'John Doe',
      email: 'john@ecosphere.com',
      departmentId: 'dept-ops',
      role: 'Employee',
      status: 'Active',
      xp: 150,
      points: 150,
      badgeIds: [],
      joinedAt: '2026-03-01T11:00:00Z'
    },
    {
      id: 'emp-7',
      name: 'Jane Smith',
      email: 'jane@ecosphere.com',
      departmentId: 'dept-canopy',
      role: 'Employee',
      status: 'Active',
      xp: 320,
      points: 220,
      badgeIds: ['badge-pioneer'],
      joinedAt: '2026-03-05T11:00:00Z'
    },
    {
      id: 'emp-8',
      name: 'David Lee',
      email: 'david@ecosphere.com',
      departmentId: 'dept-social',
      role: 'Employee',
      status: 'Active',
      xp: 90,
      points: 90,
      badgeIds: [],
      joinedAt: '2026-03-12T11:00:00Z'
    },
    {
      id: 'emp-9',
      name: 'Emma Watson',
      email: 'emma@ecosphere.com',
      departmentId: 'dept-gov',
      role: 'Employee',
      status: 'Active',
      xp: 180,
      points: 180,
      badgeIds: [],
      joinedAt: '2026-03-15T11:00:00Z'
    },
    {
      id: 'emp-10',
      name: 'Robert Chen',
      email: 'robert@ecosphere.com',
      departmentId: 'dept-ops',
      role: 'Employee',
      status: 'Active',
      xp: 210,
      points: 110,
      badgeIds: [],
      joinedAt: '2026-04-01T09:00:00Z'
    }
  ];

  for (const emp of employees) {
    await setDoc(doc(db, 'employees', emp.id), emp);
  }

  // 4. Seed Categories
  const categories: Category[] = [
    { id: 'cat-env-carbon', name: 'Carbon Reduction', type: 'Challenge', status: 'Active' },
    { id: 'cat-env-waste', name: 'Zero Waste', type: 'Challenge', status: 'Active' },
    { id: 'cat-soc-comm', name: 'Community Volunteering', type: 'CSR Activity', status: 'Active' },
    { id: 'cat-soc-well', name: 'Employee Health & Safety', type: 'CSR Activity', status: 'Active' },
    { id: 'cat-gov-eth', name: 'Ethics & Compliance Training', type: 'CSR Activity', status: 'Active' }
  ];

  for (const cat of categories) {
    await setDoc(doc(db, 'categories', cat.id), cat);
  }

  // 5. Seed Emission Factors
  const emissionFactors: EmissionFactor[] = [
    { id: 'ef-electricity', activityType: 'Grid Electricity', scope: 2, unit: 'kWh', factorValue: 0.85, effectiveDate: '2026-01-01' },
    { id: 'ef-diesel', activityType: 'Diesel Fuel', scope: 1, unit: 'liters', factorValue: 2.68, effectiveDate: '2026-01-01' },
    { id: 'ef-air', activityType: 'Air Travel', scope: 3, unit: 'km', factorValue: 0.12, effectiveDate: '2026-01-01' },
    { id: 'ef-gas', activityType: 'Natural Gas', scope: 1, unit: 'm3', factorValue: 1.89, effectiveDate: '2026-01-01' }
  ];

  for (const ef of emissionFactors) {
    await setDoc(doc(db, 'emissionFactors', ef.id), ef);
  }

  // 6. Seed Environmental Goals
  const goals: EnvironmentalGoal[] = [
    { id: 'goal-ops-carbon', title: 'Q3 Operations Carbon Limit', departmentId: 'dept-ops', metric: 'Carbon Emissions', targetValue: 3000, currentValue: 1840, unit: 'kg CO2e', deadline: '2026-09-30', status: 'On Track' },
    { id: 'goal-canopy-electricity', title: 'Reduce Canopy Lab Power', departmentId: 'dept-canopy', metric: 'Energy Usage', targetValue: 1000, currentValue: 1200, unit: 'kWh', deadline: '2026-09-30', status: 'At Risk' },
    { id: 'goal-org-wide-water', title: 'Org-wide Water Saving', departmentId: null, metric: 'Water Usage', targetValue: 5000, currentValue: 4800, unit: 'Liters', deadline: '2026-12-31', status: 'On Track' }
  ];

  for (const goal of goals) {
    await setDoc(doc(db, 'environmentalGoals', goal.id), goal);
  }

  // 7. Seed ESG Policies
  const policies: ESGPolicy[] = [
    { id: 'pol-conduct', title: 'Corporate Code of Conduct', category: 'Governance', version: 'v2.0', documentUrl: 'https://ecosphere.com/policies/code-of-conduct.pdf', effectiveDate: '2026-01-01', status: 'Active' },
    { id: 'pol-travel', title: 'Eco-Travel & Air Mileage Policy', category: 'Environmental', version: 'v1.1', documentUrl: 'https://ecosphere.com/policies/eco-travel.pdf', effectiveDate: '2026-02-15', status: 'Active' },
    { id: 'pol-safety', title: 'Workplace Health & Ergonomics Guidelines', category: 'Social', version: 'v1.4', documentUrl: 'https://ecosphere.com/policies/health-safety.pdf', effectiveDate: '2026-03-01', status: 'Active' }
  ];

  for (const pol of policies) {
    await setDoc(doc(db, 'esgPolicies', pol.id), pol);
  }

  // 8. Seed Badges
  const badges: Badge[] = [
    { id: 'badge-pioneer', name: 'Platform Pioneer', description: 'Joined the platform and gained initial XP', unlockRule: { metric: 'XP', threshold: 100 }, icon: 'Trophy' },
    { id: 'badge-carbon', name: 'Carbon Officer', description: 'Reached 500+ XP in environmental initiatives', unlockRule: { metric: 'XP', threshold: 500 }, icon: 'Leaf' },
    { id: 'badge-csr', name: 'CSR Champion', description: 'Participated in 5 or more CSR Activities', unlockRule: { metric: 'CSRParticipations', threshold: 5 }, icon: 'Users' },
    { id: 'badge-warrior', name: 'Green Warrior', description: 'Completed 3 sustainability challenges', unlockRule: { metric: 'CompletedChallenges', threshold: 3 }, icon: 'ShieldCheck' }
  ];

  for (const b of badges) {
    await setDoc(doc(db, 'badges', b.id), b);
  }

  // 9. Seed Rewards
  const rewards: Reward[] = [
    { id: 'rew-mug', name: 'Eco Bamboo Coffee Mug', description: 'Vacuum-insulated reusable bamboo mug with metal lining.', pointsRequired: 150, stock: 12, status: 'Active' },
    { id: 'rew-tree', name: '1 Tree Planted in Your Name', description: 'Partnership with OneTreePlanted to restore regional canopy.', pointsRequired: 100, stock: 500, status: 'Active' },
    { id: 'rew-donation', name: 'Corporate Sponsor Charity Matching ($50)', description: 'Receive corporate backup matching donation for a green charity of choice.', pointsRequired: 500, stock: 5, status: 'Active' },
    { id: 'rew-sleeve', name: 'Eco Laptop Sleeve', description: 'Constructed completely from recycled ocean plastic water bottles.', pointsRequired: 300, stock: 0, status: 'Active' } // Out of stock to test disabled state
  ];

  for (const r of rewards) {
    await setDoc(doc(db, 'rewards', r.id), r);
  }

  // 10. Seed Challenges
  const challenges: Challenge[] = [
    { id: 'chal-plastic', title: 'Plastic-Free Fortnight', categoryId: 'cat-env-waste', description: 'Commit to zero single-use plastic cups, cutlery, or bags for two full weeks.', xp: 150, difficulty: 'Easy', evidenceRequired: true, deadline: '2026-08-15', status: 'Active' },
    { id: 'chal-transit', title: 'Low-Carbon Commuter', categoryId: 'cat-env-carbon', description: 'Walk, cycle, or take public transit to work at least 5 times this month.', xp: 200, difficulty: 'Medium', evidenceRequired: true, deadline: '2026-08-30', status: 'Active' },
    { id: 'chal-governance', title: 'Compliance Masterclass', categoryId: 'cat-gov-eth', description: 'Complete all mandatory corporate code of conduct walkthroughs and sign off.', xp: 100, difficulty: 'Easy', evidenceRequired: false, deadline: '2026-07-31', status: 'Active' },
    { id: 'chal-audit', title: 'Office Audit Assistance', categoryId: 'cat-gov-eth', description: 'Assist the department auditor with desk audits for recycling compliance.', xp: 250, difficulty: 'Medium', evidenceRequired: true, deadline: '2026-09-10', status: 'Draft' },
    { id: 'chal-cleanup', title: 'Organize Park Cleanup', categoryId: 'cat-soc-comm', description: 'Lead a local community garbage collection sweep at a nearby park.', xp: 400, difficulty: 'Hard', evidenceRequired: true, deadline: '2026-06-30', status: 'Completed' }
  ];

  for (const chal of challenges) {
    await setDoc(doc(db, 'challenges', chal.id), chal);
  }

  // 11. Seed Carbon Transactions
  const carbonTransactions: CarbonTransaction[] = [
    { id: 'ct-1', departmentId: 'dept-ops', emissionFactorId: 'ef-diesel', sourceModule: 'Fleet', sourceRecordId: 'fleet-ops-q3-1', quantity: 500, calculatedEmissions: 1340, date: '2026-07-01', autoCalculated: true },
    { id: 'ct-2', departmentId: 'dept-ops', emissionFactorId: 'ef-electricity', sourceModule: 'Manual', quantity: 588, calculatedEmissions: 500, date: '2026-07-05', autoCalculated: false },
    { id: 'ct-3', departmentId: 'dept-canopy', emissionFactorId: 'ef-electricity', sourceModule: 'Manual', quantity: 1412, calculatedEmissions: 1200, date: '2026-07-08', autoCalculated: false },
    { id: 'ct-4', departmentId: 'dept-social', emissionFactorId: 'ef-air', sourceModule: 'Expense', sourceRecordId: 'exp-travel-1', quantity: 2500, calculatedEmissions: 300, date: '2026-07-02', autoCalculated: true },
    { id: 'ct-5', departmentId: 'dept-gov', emissionFactorId: 'ef-electricity', sourceModule: 'Manual', quantity: 470, calculatedEmissions: 400, date: '2026-07-03', autoCalculated: false }
  ];

  for (const ct of carbonTransactions) {
    await setDoc(doc(db, 'carbonTransactions', ct.id), ct);
  }

  // 12. Seed CSR Activities
  const csrActivities: CSRActivity[] = [
    { id: 'csr-cleanup', title: 'Q2 Beach Cleanup Initiative', categoryId: 'cat-soc-comm', description: 'Pick up plastic debris along the local coastal beach area.', departmentId: null, date: '2026-05-15', status: 'Completed' },
    { id: 'csr-garden', title: 'Operations Office Rooftop Garden', categoryId: 'cat-soc-comm', description: 'Plant vegetables and flower bedding on the warehouse rooftop.', departmentId: 'dept-ops', date: '2026-07-10', status: 'Ongoing' },
    { id: 'csr-training', title: 'Mandatory Ethics Briefing', categoryId: 'cat-gov-eth', description: 'Lunch and learn workshop outlining modern legal compliance.', departmentId: null, date: '2026-08-20', status: 'Planned' }
  ];

  for (const csr of csrActivities) {
    await setDoc(doc(db, 'csrActivities', csr.id), csr);
  }

  // 13. Seed Audits & Compliance
  const audits: Audit[] = [
    { id: 'aud-env-q2', title: 'Q2 Environmental Audit', departmentId: 'dept-canopy', auditorEmployeeId: 'emp-head-ops', scheduledDate: '2026-06-15', status: 'Completed', findingsSummary: 'Everything within parameters. Some minor suggestions for waste bins.' },
    { id: 'aud-ops-q3', title: 'Q3 Operations Compliance Audit', departmentId: 'dept-ops', auditorEmployeeId: 'emp-thiru', scheduledDate: '2026-07-10', status: 'In Progress' }
  ];

  for (const aud of audits) {
    await setDoc(doc(db, 'audits', aud.id), aud);
  }

  const complianceIssues: ComplianceIssue[] = [
    { id: 'comp-recycle', auditId: 'aud-env-q2', severity: 'Medium', description: 'Improper separation of toxic chemical waste in Operations workshop.', ownerEmployeeId: 'emp-head-ops', dueDate: '2026-07-01', status: 'Open' }, // Overdue issue
    { id: 'comp-conduct', auditId: 'aud-ops-q3', severity: 'Low', description: 'Missing sign-off sheet for emergency drill compliance.', ownerEmployeeId: 'emp-6', dueDate: '2026-07-20', status: 'In Progress' }
  ];

  for (const ci of complianceIssues) {
    await setDoc(doc(db, 'complianceIssues', ci.id), ci);
  }

  // 14. Seed Policy Acknowledgements
  const acknowledgements: PolicyAcknowledgement[] = [
    { id: 'ack-1', policyId: 'pol-conduct', employeeId: 'emp-thiru', acknowledgedAt: '2026-01-11T12:00:00Z', reminderSentAt: null },
    { id: 'ack-2', policyId: 'pol-conduct', employeeId: 'emp-ceo', acknowledgedAt: '2026-01-02T10:00:00Z', reminderSentAt: null },
    { id: 'ack-3', policyId: 'pol-conduct', employeeId: 'emp-head-ops', acknowledgedAt: '2026-01-16T14:00:00Z', reminderSentAt: null },
    { id: 'ack-4', policyId: 'pol-travel', employeeId: 'emp-thiru', acknowledgedAt: '2026-02-16T09:00:00Z', reminderSentAt: null },
    { id: 'ack-5', policyId: 'pol-travel', employeeId: 'emp-head-ops', acknowledgedAt: null, reminderSentAt: null }, // Pending
    { id: 'ack-6', policyId: 'pol-safety', employeeId: 'emp-thiru', acknowledgedAt: '2026-03-02T10:00:00Z', reminderSentAt: null },
    { id: 'ack-7', policyId: 'pol-safety', employeeId: 'emp-head-ops', acknowledgedAt: null, reminderSentAt: '2026-07-10T08:00:00Z' } // Pending (reminder sent)
  ];

  for (const ack of acknowledgements) {
    await setDoc(doc(db, 'policyAcknowledgements', ack.id), ack);
  }

  // 15. Seed Employee Participation (CSR)
  const participations: EmployeeParticipation[] = [
    { id: 'pt-1', employeeId: 'emp-head-ops', activityId: 'csr-cleanup', proofUrl: 'https://ecosphere.com/proofs/beach-ops.jpg', approvalStatus: 'Approved', pointsEarned: 100, completionDate: '2026-05-15T15:00:00Z' },
    { id: 'pt-2', employeeId: 'emp-head-soc', activityId: 'csr-cleanup', proofUrl: 'https://ecosphere.com/proofs/beach-soc.jpg', approvalStatus: 'Approved', pointsEarned: 100, completionDate: '2026-05-15T15:00:00Z' },
    { id: 'pt-3', employeeId: 'emp-7', activityId: 'csr-cleanup', proofUrl: 'https://ecosphere.com/proofs/beach-emp7.jpg', approvalStatus: 'Approved', pointsEarned: 100, completionDate: '2026-05-15T16:00:00Z' },
    { id: 'pt-4', employeeId: 'emp-6', activityId: 'csr-garden', proofUrl: 'https://ecosphere.com/proofs/ops-garden.jpg', approvalStatus: 'Pending', pointsEarned: 50, completionDate: null }
  ];

  for (const pt of participations) {
    await setDoc(doc(db, 'employeeParticipations', pt.id), pt);
  }

  // 16. Seed Challenge Participation
  const chalParticipations: ChallengeParticipation[] = [
    { id: 'cp-1', challengeId: 'chal-plastic', employeeId: 'emp-thiru', progress: 100, proofUrl: 'https://ecosphere.com/proofs/no-plastic.jpg', approvalStatus: 'Approved', xpAwarded: 150 },
    { id: 'cp-2', challengeId: 'chal-transit', employeeId: 'emp-thiru', progress: 60, proofUrl: undefined, approvalStatus: 'Pending', xpAwarded: 0 },
    { id: 'cp-3', challengeId: 'chal-transit', employeeId: 'emp-7', progress: 100, proofUrl: 'https://ecosphere.com/proofs/bike-commute.jpg', approvalStatus: 'Pending', xpAwarded: 0 }
  ];

  for (const cp of chalParticipations) {
    await setDoc(doc(db, 'challengeParticipations', cp.id), cp);
  }

  console.log('EcoSphere Fallback database seeded successfully!');
}
