import { theWorldTop100_2026, webometricsVietnamTop100_Jan2026 } from './generatedRankings';
import { applyPriorityUniversityEnrichments } from './priorityUniversityEnrichments';
import type { ScholarshipOpportunity, University } from './types';

type RankingTier = University['rankingTier'];
type UniversityCategory = 'general' | 'technology' | 'business' | 'health' | 'creative';

interface CostProfile {
  tuition: University['tuitionRangeUsd'];
  living: University['livingCostRangeUsd'];
  englishMinimum: number;
  englishTarget: number;
  needBasedAidAvailability: boolean;
  primaryDeadline: string;
  scholarshipDeadline: string;
  priorityDeadline: string;
}

interface RankingSourceRecord {
  source: 'THE' | 'Webometrics';
  edition: string;
  scope: 'world' | 'vietnam';
  rank: number;
  sourceUrl: string;
  overallScore?: number;
  worldRank?: number;
}

const majorProfiles: Record<
  UniversityCategory,
  {
    availableMajors: string[];
    majorClusters: University['majorClusters'];
    hardConstraints?: University['hardConstraints'];
    benefits: string[];
  }
> = {
  general: {
    availableMajors: [
      'Computer Science',
      'Data Science',
      'Business Analytics',
      'Economics and Finance',
      'Media and Communication',
      'Graphic Design',
      'Psychology',
      'Electrical Engineering',
    ],
    majorClusters: ['technology', 'business', 'media', 'design', 'science'],
    benefits: ['Broad subject choice', 'Cross-disciplinary opportunities', 'Flexible pathways into scholarships and honors tracks'],
  },
  technology: {
    availableMajors: [
      'Computer Science',
      'Data Science',
      'Electrical Engineering',
      'Bioengineering',
      'Architecture',
      'Industrial Design',
      'Business Analytics',
    ],
    majorClusters: ['technology', 'science', 'design', 'business'],
    hardConstraints: {
      majorsNotSupported: ['Media and Communication', 'Journalism'],
    },
    benefits: ['Strong technical pathways', 'Project-heavy learning', 'Good fit for research and innovation scholarships'],
  },
  business: {
    availableMajors: [
      'Business Analytics',
      'Management',
      'International Business',
      'Economics and Finance',
      'Commerce',
      'Data Science',
    ],
    majorClusters: ['business', 'technology'],
    hardConstraints: {
      majorsNotSupported: ['Biomedical Science', 'Biology', 'Graphic Design'],
    },
    benefits: ['Career-oriented programs', 'Internship-friendly curriculum', 'Merit awards often linked to leadership and profile strength'],
  },
  health: {
    availableMajors: ['Biomedical Science', 'Biology', 'Global Health', 'Psychology'],
    majorClusters: ['science'],
    hardConstraints: {
      majorsNotSupported: ['Graphic Design', 'Media and Communication', 'Business Analytics'],
    },
    benefits: ['Strong science preparation', 'Research-oriented environment', 'Good fit for students with lab or health-impact evidence'],
  },
  creative: {
    availableMajors: ['Media and Communication', 'Journalism', 'Graphic Design', 'Architecture', 'Communication'],
    majorClusters: ['media', 'design'],
    hardConstraints: {
      majorsNotSupported: ['Biomedical Science'],
    },
    benefits: ['Portfolio-friendly programs', 'Creative project emphasis', 'Clear upside for students with communication or design evidence'],
  },
};

const costProfiles: Record<string, CostProfile> = {
  Argentina: {
    tuition: { min: 4000, max: 12000 },
    living: { min: 7000, max: 12000 },
    englishMinimum: 6,
    englishTarget: 6.5,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-11-30',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Australia: {
    tuition: { min: 26000, max: 42000 },
    living: { min: 15000, max: 22000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-11-30',
    scholarshipDeadline: '2026-10-15',
    priorityDeadline: '2026-09-15',
  },
  Belgium: {
    tuition: { min: 4000, max: 9000 },
    living: { min: 11000, max: 16000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-01',
    scholarshipDeadline: '2026-10-15',
    priorityDeadline: '2026-09-30',
  },
  Brazil: {
    tuition: { min: 3000, max: 10000 },
    living: { min: 7000, max: 12000 },
    englishMinimum: 6,
    englishTarget: 6.5,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-11-30',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Canada: {
    tuition: { min: 24000, max: 40000 },
    living: { min: 14000, max: 21000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: true,
    primaryDeadline: '2027-01-15',
    scholarshipDeadline: '2026-12-15',
    priorityDeadline: '2026-11-01',
  },
  Chile: {
    tuition: { min: 5000, max: 12000 },
    living: { min: 8000, max: 13000 },
    englishMinimum: 6,
    englishTarget: 6.5,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-11-30',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Denmark: {
    tuition: { min: 12000, max: 20000 },
    living: { min: 14000, max: 20000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-01',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Finland: {
    tuition: { min: 12000, max: 18000 },
    living: { min: 11000, max: 16000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2027-01-10',
    scholarshipDeadline: '2026-12-01',
    priorityDeadline: '2026-10-15',
  },
  France: {
    tuition: { min: 3000, max: 10000 },
    living: { min: 12000, max: 18000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-15',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Germany: {
    tuition: { min: 1000, max: 7000 },
    living: { min: 11000, max: 16000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-15',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  'Hong Kong': {
    tuition: { min: 18000, max: 32000 },
    living: { min: 12000, max: 20000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-15',
    scholarshipDeadline: '2026-11-15',
    priorityDeadline: '2026-10-01',
  },
  Ireland: {
    tuition: { min: 18000, max: 30000 },
    living: { min: 13000, max: 18000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2027-01-31',
    scholarshipDeadline: '2026-11-30',
    priorityDeadline: '2026-10-01',
  },
  Italy: {
    tuition: { min: 3000, max: 12000 },
    living: { min: 10000, max: 16000 },
    englishMinimum: 6,
    englishTarget: 6.5,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-15',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Japan: {
    tuition: { min: 5000, max: 12000 },
    living: { min: 9000, max: 15000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-01',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Malaysia: {
    tuition: { min: 7000, max: 16000 },
    living: { min: 7000, max: 11000 },
    englishMinimum: 6,
    englishTarget: 6.5,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-15',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Netherlands: {
    tuition: { min: 14000, max: 26000 },
    living: { min: 12000, max: 18000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2027-01-15',
    scholarshipDeadline: '2026-11-01',
    priorityDeadline: '2026-10-01',
  },
  'New Zealand': {
    tuition: { min: 22000, max: 36000 },
    living: { min: 14000, max: 20000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-11-30',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Norway: {
    tuition: { min: 0, max: 5000 },
    living: { min: 14000, max: 19000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-15',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Qatar: {
    tuition: { min: 12000, max: 22000 },
    living: { min: 9000, max: 15000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: true,
    primaryDeadline: '2026-12-01',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  'Saudi Arabia': {
    tuition: { min: 12000, max: 25000 },
    living: { min: 9000, max: 14000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: true,
    primaryDeadline: '2026-12-01',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  'South Korea': {
    tuition: { min: 8000, max: 18000 },
    living: { min: 10000, max: 16000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-01',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Sweden: {
    tuition: { min: 12000, max: 20000 },
    living: { min: 11000, max: 17000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2027-01-15',
    scholarshipDeadline: '2026-11-15',
    priorityDeadline: '2026-10-01',
  },
  Switzerland: {
    tuition: { min: 1500, max: 6000 },
    living: { min: 22000, max: 30000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-01',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  Taiwan: {
    tuition: { min: 4000, max: 12000 },
    living: { min: 8000, max: 13000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2026-12-01',
    scholarshipDeadline: '2026-10-31',
    priorityDeadline: '2026-09-30',
  },
  'United Kingdom': {
    tuition: { min: 24000, max: 42000 },
    living: { min: 15000, max: 22000 },
    englishMinimum: 6.5,
    englishTarget: 7,
    needBasedAidAvailability: false,
    primaryDeadline: '2027-01-31',
    scholarshipDeadline: '2026-12-01',
    priorityDeadline: '2026-10-15',
  },
  'United States': {
    tuition: { min: 42000, max: 62000 },
    living: { min: 18000, max: 26000 },
    englishMinimum: 7,
    englishTarget: 7.5,
    needBasedAidAvailability: true,
    primaryDeadline: '2027-01-15',
    scholarshipDeadline: '2026-12-15',
    priorityDeadline: '2026-11-01',
  },
  Vietnam: {
    tuition: { min: 1200, max: 6000 },
    living: { min: 2000, max: 5000 },
    englishMinimum: 5.5,
    englishTarget: 6,
    needBasedAidAvailability: true,
    primaryDeadline: '2026-08-15',
    scholarshipDeadline: '2026-07-20',
    priorityDeadline: '2026-06-30',
  },
};

const defaultCostProfile: CostProfile = {
  tuition: { min: 12000, max: 24000 },
  living: { min: 10000, max: 16000 },
  englishMinimum: 6.5,
  englishTarget: 7,
  needBasedAidAvailability: false,
  primaryDeadline: '2026-12-15',
  scholarshipDeadline: '2026-10-31',
  priorityDeadline: '2026-09-30',
};

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^the\s+/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectAliases(value: string): string[] {
  const aliases = new Set<string>();
  const base = value.trim();

  aliases.add(normalizeName(base));

  base
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => aliases.add(normalizeName(part)));

  for (const match of base.matchAll(/\(([^)]+)\)/g)) {
    aliases.add(normalizeName(match[1]));
  }

  return Array.from(aliases).filter(Boolean);
}

function slugify(value: string): string {
  return normalizeName(value).replace(/\s+/g, '-');
}

function inferCategory(name: string): UniversityCategory {
  const lower = normalizeName(name);

  if (/(medicine|medical|pharmacy|health|nursing)/.test(lower)) return 'health';
  if (/(design|architecture|arts|media|journal|communication)/.test(lower)) return 'creative';
  if (/(economics|business|commerce|management|finance|law)/.test(lower)) return 'business';
  if (/(technology|polytechnic|engineering|science and technology|institute of technology|bach khoa|tech)/.test(lower)) return 'technology';

  return 'general';
}

function inferRankingTier(record: RankingSourceRecord): RankingTier {
  if (record.scope === 'world') {
    if (record.rank <= 20) return 'Global elite';
    if (record.rank <= 60) return 'Highly selective';
    return 'Strong international';
  }

  if (record.rank <= 15 || (record.worldRank !== undefined && record.worldRank <= 3000)) {
    return 'Strong international';
  }

  return 'Accessible value';
}

function getAcademicRequirements(tier: RankingTier, isVietnam: boolean): University['minimumAcademicRequirements'] {
  if (tier === 'Global elite') {
    return {
      minGpa10: 8.8,
      targetGpa10: 9.4,
      maxClassRankPercent: 5,
      academicStandingNotes: 'Applications at this level usually need both academic precision and profile depth.',
      extracurricularDepthTarget: 3,
      awardsTarget: 2,
      leadershipTarget: 1,
      volunteerTarget: 1,
      researchPortfolioPreferred: true,
    };
  }

  if (tier === 'Highly selective') {
    return {
      minGpa10: 8.2,
      targetGpa10: 8.9,
      maxClassRankPercent: 10,
      academicStandingNotes: 'Strong grades still matter most, but leadership and awards can separate candidates.',
      extracurricularDepthTarget: 2,
      awardsTarget: 1,
      leadershipTarget: 1,
      volunteerTarget: 1,
      researchPortfolioPreferred: false,
    };
  }

  if (tier === 'Strong international') {
    return {
      minGpa10: isVietnam ? 7.5 : 7.6,
      targetGpa10: isVietnam ? 8.2 : 8.4,
      maxClassRankPercent: isVietnam ? 20 : 18,
      academicStandingNotes: 'A clear fit story and timely scholarship planning usually matter alongside grades.',
      extracurricularDepthTarget: 2,
      awardsTarget: 1,
      leadershipTarget: 1,
      volunteerTarget: 1,
      researchPortfolioPreferred: false,
    };
  }

  return {
    minGpa10: isVietnam ? 6.8 : 7,
    targetGpa10: isVietnam ? 7.6 : 7.8,
    maxClassRankPercent: isVietnam ? 30 : 28,
    academicStandingNotes: 'These schools can be viable value options if budget and major alignment are strong.',
    extracurricularDepthTarget: 1,
    awardsTarget: 0,
    leadershipTarget: 0,
    volunteerTarget: 0,
    researchPortfolioPreferred: false,
  };
}

function scaleRange(range: { min: number; max: number }, multiplier: number): { min: number; max: number } {
  return {
    min: Math.round(range.min * multiplier),
    max: Math.round(range.max * multiplier),
  };
}

function buildCostProfile(country: string, tier: RankingTier, isVietnam: boolean): Pick<University, 'tuitionRangeUsd' | 'livingCostRangeUsd' | 'needBasedAidAvailability' | 'deadlines' | 'englishRequirements'> {
  const base = costProfiles[country] ?? defaultCostProfile;
  const multiplier =
    tier === 'Global elite'
      ? 1.18
      : tier === 'Highly selective'
        ? 1.08
        : tier === 'Accessible value'
          ? 0.88
          : 1;
  const tuition = isVietnam ? base.tuition : scaleRange(base.tuition, multiplier);
  const living = isVietnam ? base.living : scaleRange(base.living, tier === 'Global elite' ? 1.08 : 1);

  return {
    tuitionRangeUsd: tuition,
    livingCostRangeUsd: living,
    needBasedAidAvailability: base.needBasedAidAvailability,
    deadlines: {
      intake: isVietnam ? 'Next domestic intake cycle' : 'Next international intake cycle',
      applicationDeadline: base.primaryDeadline,
      priorityDeadline: base.priorityDeadline,
      scholarshipDeadline: base.scholarshipDeadline,
    },
    englishRequirements: [
      { exam: 'IELTS', minimum: base.englishMinimum, target: base.englishTarget },
      { exam: 'TOEFL', minimum: Math.round(base.englishMinimum * 12 + 2), target: Math.round(base.englishTarget * 12 + 4) },
      { exam: 'Duolingo', minimum: Math.round(base.englishMinimum * 18 + 5), target: Math.round(base.englishTarget * 18 + 8) },
    ],
  };
}

function buildStandardizedPolicies(tier: RankingTier, isVietnam: boolean): University['standardizedPolicies'] {
  if (isVietnam) {
    return [
      { exam: 'National Exam', policy: 'recommended', target: tier === 'Accessible value' ? 7.4 : 8 },
      { exam: 'SAT', policy: 'optional', target: tier === 'Strong international' ? 1250 : 1150 },
    ];
  }

  if (tier === 'Global elite') {
    return [
      { exam: 'SAT', policy: 'recommended', target: 1450 },
      { exam: 'AP', policy: 'recommended', target: 4 },
      { exam: 'ACT', policy: 'optional', target: 32 },
    ];
  }

  if (tier === 'Highly selective') {
    return [
      { exam: 'SAT', policy: 'recommended', target: 1350 },
      { exam: 'AP', policy: 'recommended', target: 3 },
    ];
  }

  if (tier === 'Strong international') {
    return [
      { exam: 'SAT', policy: 'optional', target: 1250 },
      { exam: 'AP', policy: 'optional', target: 3 },
    ];
  }

  return [{ exam: 'SAT', policy: 'optional', target: 1150 }];
}

function buildScholarships(
  universityName: string,
  tier: RankingTier,
  category: UniversityCategory,
  tuitionRangeUsd: University['tuitionRangeUsd'],
  englishTarget: number,
  isVietnam: boolean,
): ScholarshipOpportunity[] {
  const strongTarget = tier === 'Global elite' ? 9.1 : tier === 'Highly selective' ? 8.6 : tier === 'Strong international' ? 8.1 : 7.5;
  const minimum = tier === 'Global elite' ? 8.6 : tier === 'Highly selective' ? 8 : tier === 'Strong international' ? 7.4 : 6.8;
  const baseValue = Math.max(1500, Math.round((tuitionRangeUsd.max - tuitionRangeUsd.min) * 0.45 + tuitionRangeUsd.min * (isVietnam ? 0.35 : 0.18)));
  const meritCoverage = isVietnam ? `${Math.min(100, Math.round((baseValue / Math.max(tuitionRangeUsd.max, 1)) * 100))}% tuition reduction` : `${baseValue.toLocaleString('en-US')} USD tuition support`;
  const leadershipBoost = category === 'business' || category === 'creative' ? 2 : 1;

  const scholarships: ScholarshipOpportunity[] = [
    {
      id: `${slugify(universityName)}-merit-scholarship`,
      name: `${universityName} Merit Scholarship`,
      type: isVietnam ? 'tuition reduction' : 'merit',
      automatic: tier !== 'Global elite',
      coverage: meritCoverage,
      estimatedValueUsd: baseValue,
      benefits: isVietnam ? ['Tuition reduction', 'Renewal based on academic performance'] : ['Merit tuition support', 'Can improve annual affordability'],
      minimumGpa10: minimum,
      targetGpa10: strongTarget,
      englishThresholds: { IELTS: Math.max(6, englishTarget - 0.5), TOEFL: Math.round((englishTarget - 0.4) * 12), Duolingo: Math.round((englishTarget - 0.4) * 18) },
      leadershipPreferred: leadershipBoost,
      awardsPreferred: tier === 'Accessible value' ? 0 : 1,
      notes: 'Academic strength remains the clearest driver, with leadership used as a differentiator when many candidates are close.',
      applicationSteps: buildScholarshipSteps(universityName),
    },
    {
      id: `${slugify(universityName)}-future-leaders`,
      name: `${universityName} Future Leaders Scholarship`,
      type: tier === 'Global elite' ? 'honors' : 'automatic scholarship',
      automatic: tier !== 'Global elite',
      coverage: isVietnam ? 'Leadership award plus partial fee waiver' : `${Math.round(baseValue * (tier === 'Global elite' ? 1.4 : 0.8)).toLocaleString('en-US')} USD additional support`,
      estimatedValueUsd: Math.round(baseValue * (tier === 'Global elite' ? 1.4 : 0.8)),
      benefits: ['Recognition for leadership and initiative', 'Often paired with priority advising or honors access'],
      minimumGpa10: minimum,
      targetGpa10: strongTarget + (tier === 'Global elite' ? 0.2 : 0.1),
      englishThresholds: { IELTS: englishTarget, TOEFL: Math.round(englishTarget * 12 + 2), Duolingo: Math.round(englishTarget * 18 + 6) },
      leadershipPreferred: Math.max(1, leadershipBoost),
      awardsPreferred: 1,
      volunteerPreferred: category === 'health' ? 1 : 0,
      notes: 'This award usually favors applicants whose profile shows initiative, reliability, and impact beyond grades alone.',
      applicationSteps: buildScholarshipSteps(universityName),
    },
  ];

  if (!isVietnam && tier === 'Global elite') {
    scholarships.push({
      id: `${slugify(universityName)}-global-honors-award`,
      name: `${universityName} Global Honors Award`,
      type: 'full ride',
      automatic: false,
      coverage: 'Full tuition plus competitive living support',
      estimatedValueUsd: Math.round(tuitionRangeUsd.max + tuitionRangeUsd.min * 0.25),
      benefits: ['High-value funding', 'Strong signaling for elite-profile applicants'],
      minimumGpa10: 8.9,
      targetGpa10: 9.4,
      englishThresholds: { IELTS: Math.max(7, englishTarget), TOEFL: Math.round(englishTarget * 12 + 6), Duolingo: Math.round(englishTarget * 18 + 10) },
      leadershipPreferred: 2,
      awardsPreferred: 2,
      researchPreferred: category === 'technology' || category === 'health',
      notes: 'This is intentionally modeled as a very selective scholarship for students who are already near the top of the pool.',
      applicationSteps: buildScholarshipSteps(universityName),
    });
  }

  return scholarships;
}

function buildApplicationSteps(schoolName: string, isVietnam: boolean): string[] {
  return [
    'Step 1: Confirm program fit, intake timing, and major availability.',
    'Step 2: Review academic, English, and testing expectations for your pathway.',
    'Step 3: Prepare transcripts, identity documents, and a clean activity summary.',
    `Step 4: Draft a school-specific statement for ${schoolName} and collect recommendation letters early.`,
    `Step 5: Submit the ${schoolName} application before the main deadline and track portal updates.`,
    isVietnam
      ? 'Step 6: Check whether the school uses a domestic admission round, direct admission, or scholarship review form.'
      : 'Step 6: Check scholarship, honors, housing, and visa-related next steps immediately after submission.',
  ];
}

function buildScholarshipSteps(schoolName: string): string[] {
  return [
    `Step 1: Identify which ${schoolName} awards are automatic and which require a separate application.`,
    'Step 2: Match your GPA, English score, leadership, and awards against the scholarship line.',
    'Step 3: Prepare short evidence-backed activity descriptions instead of generic lists.',
    'Step 4: Tailor your essay or statement to scholarship goals such as impact, initiative, or academic promise.',
    'Step 5: Submit the scholarship application before the earlier priority date whenever possible.',
  ];
}

function buildSpecialNotes(record: RankingSourceRecord): string[] {
  if (record.source === 'THE') {
    return [
      `Included in the THE World University Rankings ${record.edition} top 100 at rank ${record.rank}.`,
      'This profile is generated from ranking data and standardized planning defaults, so students should still verify final requirements on the official admissions page.',
    ];
  }

  return [
    `Included in the Webometrics Vietnam ranking (${record.edition}) at national rank ${record.rank}${record.worldRank ? ` and world rank ${record.worldRank}` : ''}.`,
    'This profile is generated from ranking data and standardized planning defaults, so local admission pathways should still be confirmed with the institution.',
  ];
}

function buildReputationLabel(record: RankingSourceRecord, category: UniversityCategory): string {
  const categoryLabel =
    category === 'technology'
      ? 'technology-focused university'
      : category === 'business'
        ? 'business-oriented institution'
        : category === 'health'
          ? 'health and science-focused institution'
          : category === 'creative'
            ? 'creative and communication-oriented institution'
            : 'broad academic institution';

  if (record.source === 'THE') {
    return `THE ${record.edition} world top 100 ${categoryLabel}`;
  }

  return `Webometrics ${record.edition} Vietnam top 100 ${categoryLabel}`;
}

function inferCity(name: string, country: string): string {
  if (country === 'Vietnam') {
    const lower = normalizeName(name);
    if (/(ha noi|hanoi)/.test(lower)) return 'Hanoi';
    if (/(ho chi minh|sai gon|saigon)/.test(lower)) return 'Ho Chi Minh City';
    if (/da nang/.test(lower)) return 'Da Nang';
    if (/can tho/.test(lower)) return 'Can Tho';
    if (/hue/.test(lower)) return 'Hue';
    if (/hai phong/.test(lower)) return 'Hai Phong';
  }

  return 'Primary campus';
}

function withRankingMetadata(university: University, rankingSources: RankingSourceRecord[], dataQuality: University['dataQuality']): University {
  return {
    ...university,
    dataQuality,
    rankingSources: rankingSources.map((source) => ({ ...source })),
  };
}

function buildGeneratedUniversity(name: string, country: string, rankingSource: RankingSourceRecord): University {
  const isVietnam = rankingSource.scope === 'vietnam';
  const category = inferCategory(name);
  const tier = inferRankingTier(rankingSource);
  const profile = majorProfiles[category];
  const cost = buildCostProfile(country, tier, isVietnam);
  const scholarships = buildScholarships(name, tier, category, cost.tuitionRangeUsd, cost.englishRequirements[0].target ?? cost.englishRequirements[0].minimum, isVietnam);

  return withRankingMetadata(
    {
      id: `${slugify(name)}-${rankingSource.source.toLowerCase()}`,
      name,
      country,
      city: inferCity(name, country),
      reputationLabel: buildReputationLabel(rankingSource, category),
      rankingTier: tier,
      tuitionRangeUsd: cost.tuitionRangeUsd,
      livingCostRangeUsd: cost.livingCostRangeUsd,
      availableMajors: profile.availableMajors,
      majorClusters: profile.majorClusters,
      minimumAcademicRequirements: getAcademicRequirements(tier, isVietnam),
      englishRequirements: cost.englishRequirements,
      standardizedPolicies: buildStandardizedPolicies(tier, isVietnam),
      scholarships,
      automaticMeritScholarships: scholarships.filter((item) => item.automatic).map((item) => item.name),
      needBasedAidAvailability: cost.needBasedAidAvailability,
      deadlines: cost.deadlines,
      documentRequirements: ['Academic transcripts', 'English score report', 'Activity summary', 'Passport or identification'],
      essayRequirements: {
        required: tier !== 'Accessible value',
        summary:
          tier === 'Global elite'
            ? 'A school-specific statement that shows intellectual direction, evidence, and fit.'
            : 'A focused statement on goals, academic direction, and why this program matches your profile.',
      },
      recommendationLettersRequired: tier === 'Global elite' ? 2 : 1,
      interviewRequirement: tier === 'Global elite' ? 'possible' : 'not required',
      portfolioRequirement: category === 'creative' ? (tier === 'Global elite' ? 'required' : 'recommended') : 'not required',
      specialNotes: buildSpecialNotes(rankingSource),
      officialApplicationSteps: buildApplicationSteps(name, isVietnam),
      scholarshipApplicationSteps: buildScholarshipSteps(name),
      tipsToIncreaseChances: [
        'Keep your GPA and English score aligned with the scholarship target instead of only the minimum line.',
        'Use one or two strong leadership or project stories with measurable results.',
        'Apply before the priority deadline if funding matters.',
      ],
      benefits: profile.benefits,
      scholarshipHighlights: scholarships.map((item) => item.name),
      hardConstraints: profile.hardConstraints,
    },
    [rankingSource],
    'generated',
  );
}

export function buildExpandedUniversityCatalogue(curatedUniversities: University[]): University[] {
  const aliasMap = new Map<string, number>();
  const catalogue = curatedUniversities.map((university, index) => {
    const rankingSources = university.rankingSources ?? [];
    const enriched = withRankingMetadata(university, rankingSources, university.dataQuality ?? 'curated');

    collectAliases(university.name).forEach((alias) => aliasMap.set(alias, index));

    return enriched;
  });

  const registerGeneratedUniversity = (name: string, country: string, rankingSource: RankingSourceRecord) => {
    const aliases = collectAliases(name);
    const existingIndex = aliases.find((alias) => aliasMap.has(alias));

    if (existingIndex) {
      const universityIndex = aliasMap.get(existingIndex)!;
      const current = catalogue[universityIndex];

      catalogue[universityIndex] = withRankingMetadata(
        current,
        [...(current.rankingSources ?? []), rankingSource],
        current.dataQuality ?? 'curated',
      );

      aliases.forEach((alias) => aliasMap.set(alias, universityIndex));
      return;
    }

    const generatedUniversity = buildGeneratedUniversity(name, country, rankingSource);
    const nextIndex = catalogue.push(generatedUniversity) - 1;
    aliases.forEach((alias) => aliasMap.set(alias, nextIndex));
  };

  theWorldTop100_2026.forEach((item) =>
    registerGeneratedUniversity(item.name, item.country, {
      source: 'THE',
      edition: '2026',
      scope: 'world',
      rank: item.rank,
      overallScore: item.overallScore,
      sourceUrl: item.sourceUrl,
    }),
  );

  webometricsVietnamTop100_Jan2026.forEach((item) =>
    registerGeneratedUniversity(item.name, item.country, {
      source: 'Webometrics',
      edition: 'January 2026',
      scope: 'vietnam',
      rank: item.rank,
      worldRank: item.worldRank,
      sourceUrl: item.sourceUrl,
    }),
  );

  return applyPriorityUniversityEnrichments(catalogue).sort((left, right) => {
    const leftRank = left.rankingSources?.[0]?.rank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = right.rankingSources?.[0]?.rank ?? Number.MAX_SAFE_INTEGER;

    if (left.country === right.country) return leftRank - rightRank;
    if (left.country === 'Vietnam') return 1;
    if (right.country === 'Vietnam') return -1;

    return leftRank - rightRank;
  });
}
