export type AcademicStanding =
  | 'Top 5%'
  | 'Top 10%'
  | 'Top 15%'
  | 'Top 25%'
  | 'Above average'
  | 'Strong upward trend';

export type StandardizedExam = 'SAT' | 'ACT' | 'AP' | 'IB' | 'A-Level' | 'National Exam';
export type EnglishExam = 'IELTS' | 'TOEFL' | 'Duolingo' | 'Unknown';
export type ScholarshipType =
  | 'merit'
  | 'need-based'
  | 'full ride'
  | 'tuition reduction'
  | 'honors'
  | 'automatic scholarship';

export type MatchLabel = 'Strong Match' | 'Good Match' | 'Reach' | 'Ambitious' | 'Not Yet Ready';
export type AdmissionStatus =
  | 'Can apply now'
  | 'Can apply but low competitiveness'
  | 'Can target after improving profile'
  | 'Not eligible yet';

export type ScholarshipStatus =
  | 'Likely eligible'
  | 'Potentially eligible'
  | 'Needs improvement'
  | 'Not eligible yet';

export type RequirementStatus = 'met' | 'partial' | 'missing' | 'recommended' | 'blocker';
export type RequirementTone = 'green' | 'yellow' | 'red' | 'gray';
export type SortOption =
  | 'best-fit'
  | 'lowest-cost'
  | 'highest-scholarship'
  | 'easiest-entry'
  | 'deadline-urgency';

export interface StudentActivity {
  title: string;
  impact: string;
  tier: 'school' | 'regional' | 'national' | 'international';
}

export interface StudentProfile {
  id: string;
  label: string;
  name: string;
  headline: string;
  gpa10: number;
  classRankPercent?: number;
  academicStanding: AcademicStanding;
  standardizedTests: Partial<Record<StandardizedExam, number>>;
  englishProficiency: {
    exam: EnglishExam;
    score?: number;
  };
  intendedMajor: string;
  countryPreferences: string[];
  budgetPerYearUsd: number;
  extracurricularActivities: StudentActivity[];
  awards: StudentActivity[];
  leadershipExperience: StudentActivity[];
  volunteerImpact: StudentActivity[];
  researchProjects: StudentActivity[];
  financialNeed: 'low' | 'medium' | 'high';
  citizenship: string;
  residency: string;
  preferredIntakeTerm: string;
  preferredScholarshipTypes: ScholarshipType[];
}

export interface ScoreThreshold {
  minimum?: number;
  target?: number;
}

export interface EnglishRequirement {
  exam: Exclude<EnglishExam, 'Unknown'>;
  minimum: number;
  target?: number;
}

export interface StandardizedPolicy {
  exam: StandardizedExam;
  policy: 'required' | 'optional' | 'recommended' | 'not-required';
  minimum?: number;
  target?: number;
}

export interface ScholarshipOpportunity {
  id: string;
  name: string;
  type: ScholarshipType;
  automatic: boolean;
  coverage: string;
  estimatedValueUsd: number;
  benefits: string[];
  minimumGpa10?: number;
  targetGpa10?: number;
  englishThresholds?: Partial<Record<Exclude<EnglishExam, 'Unknown'>, number>>;
  leadershipPreferred?: number;
  awardsPreferred?: number;
  volunteerPreferred?: number;
  researchPreferred?: boolean;
  financialNeedEligible?: Array<'low' | 'medium' | 'high'>;
  citizenshipsEligible?: string[];
  notes: string;
  applicationSteps: string[];
}

export interface University {
  id: string;
  name: string;
  country: string;
  city: string;
  dataQuality?: 'curated' | 'hybrid' | 'generated';
  profileSources?: Array<{
    label: string;
    url: string;
    type: 'official' | 'ranking';
  }>;
  reputationLabel: string;
  rankingTier: 'Global elite' | 'Highly selective' | 'Strong international' | 'Accessible value';
  rankingSources?: Array<{
    source: 'THE' | 'Webometrics';
    edition: string;
    scope: 'world' | 'vietnam';
    rank: number;
    sourceUrl: string;
    overallScore?: number;
    worldRank?: number;
  }>;
  tuitionRangeUsd: {
    min: number;
    max: number;
  };
  livingCostRangeUsd: {
    min: number;
    max: number;
  };
  availableMajors: string[];
  majorClusters: string[];
  minimumAcademicRequirements: {
    minGpa10: number;
    targetGpa10: number;
    maxClassRankPercent?: number;
    academicStandingNotes?: string;
    extracurricularDepthTarget?: number;
    awardsTarget?: number;
    leadershipTarget?: number;
    volunteerTarget?: number;
    researchPortfolioPreferred?: boolean;
  };
  englishRequirements: EnglishRequirement[];
  standardizedPolicies: StandardizedPolicy[];
  scholarships: ScholarshipOpportunity[];
  automaticMeritScholarships: string[];
  needBasedAidAvailability: boolean;
  deadlines: {
    intake: string;
    applicationDeadline: string;
    priorityDeadline?: string;
    scholarshipDeadline?: string;
  };
  documentRequirements: string[];
  essayRequirements: {
    required: boolean;
    summary: string;
  };
  recommendationLettersRequired: number;
  interviewRequirement: 'required' | 'possible' | 'not required';
  portfolioRequirement: 'required' | 'recommended' | 'not required';
  specialNotes: string[];
  officialApplicationSteps: string[];
  scholarshipApplicationSteps: string[];
  tipsToIncreaseChances: string[];
  benefits: string[];
  scholarshipHighlights: string[];
  hardConstraints?: {
    majorsNotSupported?: string[];
    needBasedAidCitizenships?: string[];
  };
}

export interface RequirementChecklistItem {
  id: string;
  category:
    | 'academic'
    | 'english'
    | 'testing'
    | 'major'
    | 'finance'
    | 'profile'
    | 'documents'
    | 'timeline'
    | 'scholarship';
  label: string;
  shortLabel: string;
  status: RequirementStatus;
  tone: RequirementTone;
  currentValue: string;
  targetValue: string;
  explanation: string;
  targetable: boolean;
  hardBlocker: boolean;
  goal?: GoalOpportunity;
}

export interface GoalOpportunity {
  id: string;
  title: string;
  category: 'academic' | 'english' | 'leadership' | 'awards' | 'budget' | 'portfolio' | 'documents';
  targetMetric: string;
  whyItMatters: string;
  universitiesUnlocked: string[];
  estimatedImpact: string;
  scoreLift: number;
}

export interface ScholarshipEvaluation {
  scholarship: ScholarshipOpportunity;
  score: number;
  status: ScholarshipStatus;
  missingCriteria: string[];
  matchedCriteria: string[];
  benefits: string[];
}

export interface DeadlineSignal {
  label: string;
  daysUntil: number;
  tone: 'red' | 'yellow' | 'gray';
}

export interface UniversityFitResult {
  university: University;
  overallFitScore: number;
  admissionReadiness: number;
  scholarshipReadiness: number;
  financialMatch: number;
  majorMatch: number;
  extracurricularStrength: number;
  scoreBreakdown: {
    academic: number;
    english: number;
    major: number;
    scholarship: number;
    financial: number;
    extracurricular: number;
  };
  matchLabel: MatchLabel;
  competitivenessLevel: 'High potential' | 'Competitive with support' | 'Stretch target' | 'Future target';
  admissionStatus: AdmissionStatus;
  scholarshipStatus: ScholarshipStatus;
  explainability: string[];
  bestNextMove: string;
  metRequirements: RequirementChecklistItem[];
  missingRequirements: RequirementChecklistItem[];
  hardBlockers: RequirementChecklistItem[];
  checklist: RequirementChecklistItem[];
  scholarshipEvaluations: ScholarshipEvaluation[];
  gapAnalysis: {
    strengths: string[];
    futureTargets: string[];
    biggestUnlock?: GoalOpportunity;
  };
  estimatedNetCostUsd: {
    min: number;
    max: number;
  };
  benefitsPreview: string[];
  deadlineSignal?: DeadlineSignal;
}

export interface OpportunityUnlock {
  id: string;
  title: string;
  improvement: string;
  admissionGain: number;
  scholarshipGain: number;
  unlockedScholarships: number;
  unlockedUniversities: string[];
}

export interface UniversityFilterState {
  search: string;
  country: string;
  major: string;
  budget: number | null;
  scholarshipType: ScholarshipType | 'all';
  eligibility: AdmissionStatus | 'all';
  fitLevel: MatchLabel | 'all';
  englishRequirement: EnglishExam | 'all';
  sortBy: SortOption;
}
