import type {
  DepartmentScore,
  Department,
  CarbonTransaction,
  EnvironmentalGoal,
  EmployeeParticipation,
  ChallengeParticipation,
  PolicyAcknowledgement,
  ComplianceIssue,
  Employee,
  ESGConfig
} from '../types';

export interface ScoringInput {
  departments: Department[];
  employees: Employee[];
  carbonTransactions: CarbonTransaction[];
  environmentalGoals: EnvironmentalGoal[];
  employeeParticipations: EmployeeParticipation[];
  challengeParticipations: ChallengeParticipation[];
  policyAcknowledgements: PolicyAcknowledgement[];
  complianceIssues: ComplianceIssue[];
  config: ESGConfig;
}

export interface ScoreOutput {
  departmentScores: Record<string, DepartmentScore>;
  overallScore: {
    environmental: number;
    social: number;
    governance: number;
    total: number;
  };
}

export function calculateESGScores(input: ScoringInput): ScoreOutput {
  const {
    departments,
    employees,
    carbonTransactions,
    environmentalGoals,
    employeeParticipations,
    challengeParticipations,
    policyAcknowledgements,
    complianceIssues,
    config
  } = input;

  const weights = config.weighting || { environmental: 40, social: 30, governance: 30 };
  const totalWeight = weights.environmental + weights.social + weights.governance || 100;

  const departmentScores: Record<string, DepartmentScore> = {};

  let sumEnv = 0;
  let sumSoc = 0;
  let sumGov = 0;
  let countDepts = 0;

  // Process score per department
  for (const dept of departments) {
    const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
    const employeeIds = deptEmployees.map((e) => e.id);

    // 1. Environmental Score (based on carbon emissions vs goal)
    const deptTxs = carbonTransactions.filter((t) => t.departmentId === dept.id);
    const totalEmissions = deptTxs.reduce((sum, t) => sum + t.calculatedEmissions, 0);

    const deptGoal = environmentalGoals.find(
      (g) => g.departmentId === dept.id && g.metric === 'Carbon Emissions'
    );
    const targetLimit = deptGoal ? deptGoal.targetValue : 5000; // default benchmark target

    let envScore = 100;
    if (totalEmissions > 0) {
      // 100 - (percentage of emissions to target limit * 50)
      // Clamped to 0 - 100
      const fraction = totalEmissions / targetLimit;
      envScore = Math.max(0, Math.min(100, 100 * (1 - fraction * 0.5)));
    }

    // 2. Social Score (blended participations + acknowledgements)
    let csrRate = 0;
    let challengeRate = 0;
    let policyRate = 0;

    if (employeeIds.length > 0) {
      // CSR activities participations approved
      const approvedCsrsCount = employeeParticipations.filter(
        (p) => employeeIds.includes(p.employeeId) && p.approvalStatus === 'Approved'
      ).length;
      csrRate = Math.min((approvedCsrsCount / employeeIds.length) * 100, 100);

      // Challenge completions approved
      const approvedChallengesCount = challengeParticipations.filter(
        (p) => employeeIds.includes(p.employeeId) && p.approvalStatus === 'Approved'
      ).length;
      challengeRate = Math.min((approvedChallengesCount / employeeIds.length) * 100, 100);

      // Policy acknowledgements
      const deptAcks = policyAcknowledgements.filter((ack) => employeeIds.includes(ack.employeeId));
      const acknowledgedCount = deptAcks.filter((ack) => ack.acknowledgedAt !== null).length;
      policyRate = deptAcks.length > 0 ? (acknowledgedCount / deptAcks.length) * 100 : 100;
    } else {
      csrRate = 100;
      challengeRate = 100;
      policyRate = 100;
    }

    const socialScore = (csrRate + challengeRate + policyRate) / 3;

    // 3. Governance Score (issues severity + overdue acks)
    const openIssues = complianceIssues.filter(
      (ci) => employeeIds.includes(ci.ownerEmployeeId) && ci.status !== 'Resolved'
    );

    let issuesPenalty = 0;
    for (const issue of openIssues) {
      switch (issue.severity) {
        case 'Critical':
          issuesPenalty += 30;
          break;
        case 'High':
          issuesPenalty += 15;
          break;
        case 'Medium':
          issuesPenalty += 8;
          break;
        case 'Low':
          issuesPenalty += 3;
          break;
      }
    }

    // Overdue Policy signoffs
    const overdueAcksCount = policyAcknowledgements.filter((ack) => {
      if (!employeeIds.includes(ack.employeeId)) return false;
      return ack.acknowledgedAt === null && ack.reminderSentAt !== null;
    }).length;

    const acksPenalty = overdueAcksCount * 5;

    const govScore = Math.max(0, 100 - issuesPenalty - acksPenalty);

    // 4. Weighted Total
    const totalScore =
      (envScore * weights.environmental +
        socialScore * weights.social +
        govScore * weights.governance) /
      totalWeight;

    departmentScores[dept.id] = {
      id: `score-${dept.id}`,
      departmentId: dept.id,
      period: '2026-Q3',
      environmentalScore: Math.round(envScore),
      socialScore: Math.round(socialScore),
      governanceScore: Math.round(govScore),
      totalScore: Math.round(totalScore)
    };

    sumEnv += envScore;
    sumSoc += socialScore;
    sumGov += govScore;
    countDepts++;
  }

  // Compute Overall aggregates
  const defaultScore = { environmental: 100, social: 100, governance: 100, total: 100 };
  if (countDepts === 0) return { departmentScores, overallScore: defaultScore };

  const avgEnv = Math.round(sumEnv / countDepts);
  const avgSoc = Math.round(sumSoc / countDepts);
  const avgGov = Math.round(sumGov / countDepts);
  const avgTotal = Math.round(
    (avgEnv * weights.environmental +
      avgSoc * weights.social +
      avgGov * weights.governance) /
      totalWeight
  );

  return {
    departmentScores,
    overallScore: {
      environmental: avgEnv,
      social: avgSoc,
      governance: avgGov,
      total: avgTotal
    }
  };
}
