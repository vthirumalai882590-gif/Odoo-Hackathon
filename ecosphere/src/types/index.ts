// ─────────────────────────────────────────────────────────────
// EcoSphere ESG Management Platform — Core Data Model
// ─────────────────────────────────────────────────────────────

export type ID = string;
export type ISODate = string; // ISO 8601 string

// ── Shared / Enums ──────────────────────────────────────────

export type Status = 'Active' | 'Inactive';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
export type CategoryType = 'CSR Activity' | 'Challenge';
export type ChallengeStatus = 'Draft' | 'Active' | 'Under Review' | 'Completed' | 'Archived';
export type AuditSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type ComplianceStatus = 'Open' | 'In Progress' | 'Resolved' | 'Overdue';
export type UserRole = 'Admin' | 'ESG Manager' | 'Department Head' | 'Employee';

// ── People ───────────────────────────────────────────────────

export interface Employee {
  id: ID;
  name: string;
  email: string;
  departmentId: ID;
  role: UserRole;
  status: Status;
  xp: number;
  points: number; // redeemable balance, deducted on reward redemption
  badgeIds: ID[];
  joinedAt: ISODate;
}

// ── Master Data ──────────────────────────────────────────────

export interface Department {
  id: ID;
  name: string;
  code: string;
  headEmployeeId: ID | null;
  parentDepartmentId: ID | null;
  employeeCount: number;
  status: Status;
}

export interface Category {
  id: ID;
  name: string;
  type: CategoryType;
  status: Status;
}

export interface EmissionFactor {
  id: ID;
  activityType: string;      // e.g. "Diesel Fuel", "Grid Electricity", "Air Travel"
  scope: 1 | 2 | 3;
  unit: string;               // e.g. "kg CO2e / liter"
  factorValue: number;
  effectiveDate: ISODate;
}

export interface ProductESGProfile {
  id: ID;
  productName: string;
  sku: string;
  carbonFootprint: number;    // kg CO2e per unit
  recyclable: boolean;
  notes?: string;
}

export interface EnvironmentalGoal {
  id: ID;
  title: string;
  departmentId: ID | null;    // null = org-wide
  metric: 'Carbon Emissions' | 'Energy Usage' | 'Water Usage' | 'Waste Reduction';
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: ISODate;
  status: 'On Track' | 'At Risk' | 'Achieved' | 'Missed';
}

export interface ESGPolicy {
  id: ID;
  title: string;
  category: 'Environmental' | 'Social' | 'Governance';
  version: string;
  documentUrl?: string;
  effectiveDate: ISODate;
  status: Status;
}

export interface Badge {
  id: ID;
  name: string;
  description: string;
  unlockRule: {
    metric: 'XP' | 'CompletedChallenges' | 'CSRParticipations';
    threshold: number;
  };
  icon: string; // icon key
}

export interface Reward {
  id: ID;
  name: string;
  description: string;
  pointsRequired: number;
  stock: number;
  status: Status;
}

// ── Transactional Data ──────────────────────────────────────

export interface CarbonTransaction {
  id: ID;
  departmentId: ID;
  emissionFactorId: ID;
  sourceModule: 'Purchase' | 'Manufacturing' | 'Expense' | 'Fleet' | 'Manual';
  sourceRecordId?: ID;        // linked ERP record if auto-calculated
  quantity: number;
  calculatedEmissions: number; // kg CO2e
  date: ISODate;
  autoCalculated: boolean;
}

export interface CSRActivity {
  id: ID;
  title: string;
  categoryId: ID;
  description: string;
  departmentId: ID | null;
  date: ISODate;
  status: 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled';
}

export interface EmployeeParticipation {
  id: ID;
  employeeId: ID;
  activityId: ID;
  proofUrl?: string;
  approvalStatus: ApprovalStatus;
  pointsEarned: number;
  completionDate: ISODate | null;
}

export interface Challenge {
  id: ID;
  title: string;
  categoryId: ID;
  description: string;
  xp: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  evidenceRequired: boolean;
  deadline: ISODate;
  status: ChallengeStatus;
}

export interface ChallengeParticipation {
  id: ID;
  challengeId: ID;
  employeeId: ID;
  progress: number; // 0-100
  proofUrl?: string;
  approvalStatus: ApprovalStatus;
  xpAwarded: number;
}

export interface PolicyAcknowledgement {
  id: ID;
  policyId: ID;
  employeeId: ID;
  acknowledgedAt: ISODate | null;
  reminderSentAt: ISODate | null;
}

export interface Audit {
  id: ID;
  title: string;
  departmentId: ID;
  auditorEmployeeId: ID;
  scheduledDate: ISODate;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  findingsSummary?: string;
}

export interface ComplianceIssue {
  id: ID;
  auditId: ID;
  severity: AuditSeverity;
  description: string;
  ownerEmployeeId: ID;
  dueDate: ISODate;
  status: ComplianceStatus;
}

export interface DepartmentScore {
  id: ID;
  departmentId: ID;
  period: string; // e.g. "2026-Q3"
  environmentalScore: number; // 0-100
  socialScore: number;        // 0-100
  governanceScore: number;    // 0-100
  totalScore: number;         // weighted
}

// ── Gamification support ────────────────────────────────────

export interface LeaderboardEntry {
  employeeId: ID;
  employeeName: string;
  departmentName: string;
  xp: number;
  rank: number;
}

// ── Notifications ────────────────────────────────────────────

export type NotificationType =
  | 'ComplianceIssueRaised'
  | 'CSRApprovalDecision'
  | 'ChallengeApprovalDecision'
  | 'PolicyReminder'
  | 'BadgeUnlocked';

export interface AppNotification {
  id: ID;
  type: NotificationType;
  recipientEmployeeId: ID;
  message: string;
  read: boolean;
  createdAt: ISODate;
}

// ── ESG Configuration ────────────────────────────────────────

export interface ESGConfig {
  weighting: { environmental: number; social: number; governance: number };
  autoEmissionCalculation: boolean;
  evidenceRequiredForCSR: boolean;
  badgeAutoAward: boolean;
  notificationsEnabled: {
    inApp: boolean;
    email: boolean;
  };
}
