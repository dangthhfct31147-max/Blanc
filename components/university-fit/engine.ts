import type {
  AdmissionStatus,
  DeadlineSignal,
  EnglishExam,
  GoalOpportunity,
  MatchLabel,
  OpportunityUnlock,
  RequirementChecklistItem,
  RequirementStatus,
  RequirementTone,
  ScholarshipEvaluation,
  ScholarshipOpportunity,
  ScholarshipStatus,
  StandardizedPolicy,
  StudentProfile,
  University,
  UniversityFitResult,
  UniversityFilterState,
} from './types';

type SupportedEnglishExam = Exclude<EnglishExam, 'Unknown'>;

interface MetricEvaluation {
  category: RequirementChecklistItem['category'];
  label: string;
  shortLabel: string;
  status: RequirementStatus;
  tone: RequirementTone;
  currentValue: string;
  targetValue: string;
  explanation: string;
  targetable: boolean;
  hardBlocker: boolean;
  score: number;
  scoreLift: number;
  goalTitle?: string;
  goalMetric?: string;
  goalWhy?: string;
}

const englishTolerance: Record<SupportedEnglishExam, number> = {
  IELTS: 0.5,
  TOEFL: 10,
  Duolingo: 10,
};

const majorClusterLookup: Record<string, string[]> = {
  'Computer Science': ['technology'],
  'Data Science': ['technology', 'science'],
  'Business Analytics': ['business', 'technology'],
  Commerce: ['business'],
  Management: ['business'],
  'International Business': ['business'],
  'Economics and Finance': ['business'],
  Economics: ['business'],
  Journalism: ['media'],
  'Media and Communication': ['media'],
  'Media and Arts': ['media', 'design'],
  'Communications and New Media': ['media'],
  Communication: ['media'],
  'Communication Science': ['media'],
  'Graphic Design': ['design'],
  Architecture: ['design'],
  'Industrial Design': ['design'],
  'Biomedical Science': ['science'],
  Biology: ['science'],
  'Life Sciences': ['science'],
  'Global Health': ['science'],
  'Molecular Bioscience': ['science'],
  Psychology: ['science'],
  'Electrical Engineering': ['technology'],
  Bioengineering: ['science', 'technology'],
};

const matchLabelOrder: MatchLabel[] = ['Strong Match', 'Good Match', 'Reach', 'Ambitious', 'Not Yet Ready'];
const admissionStatusOrder: AdmissionStatus[] = [
  'Can apply now',
  'Can apply but low competitiveness',
  'Can target after improving profile',
  'Not eligible yet',
];

export function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value);
}

function average(min: number, max: number): number {
  return (min + max) / 2;
}

function getProfileCounts(profile: StudentProfile) {
  return {
    extracurriculars: profile.extracurricularActivities.length,
    awards: profile.awards.length,
    leadership: profile.leadershipExperience.length,
    volunteering: profile.volunteerImpact.length,
    research: profile.researchProjects.length,
  };
}

function getStandingScore(profile: StudentProfile, university: University): MetricEvaluation {
  const targetRank = university.minimumAcademicRequirements.maxClassRankPercent;

  if (!targetRank || profile.classRankPercent === undefined) {
    return {
      category: 'academic',
      label: 'Academic standing',
      shortLabel: 'Standing',
      status: 'partial',
      tone: 'yellow',
      currentValue: profile.academicStanding,
      targetValue: targetRank ? `Top ${targetRank}%` : 'Strong standing',
      explanation: targetRank
        ? 'You have not entered an exact class-rank percentile yet, so this part of the fit stays provisional.'
        : 'This university does not publish a strict class-rank cutoff.',
      targetable: true,
      hardBlocker: false,
      score: targetRank ? 58 : 82,
      scoreLift: targetRank ? 6 : 0,
      goalTitle: targetRank ? `Clarify your class rank near top ${targetRank}%` : undefined,
      goalMetric: targetRank ? `Top ${targetRank}% academic standing` : undefined,
      goalWhy: targetRank ? 'Knowing your rank can strengthen admissions context and merit review.' : undefined,
    };
  }

  const gap = profile.classRankPercent - targetRank;

  if (gap <= 0) {
    return {
      category: 'academic',
      label: 'Academic standing',
      shortLabel: 'Standing',
      status: 'met',
      tone: 'green',
      currentValue: `Top ${profile.classRankPercent}%`,
      targetValue: `Top ${targetRank}%`,
      explanation: 'Your class standing is already within this university’s preferred range.',
      targetable: false,
      hardBlocker: false,
      score: 100,
      scoreLift: 0,
    };
  }

  if (gap <= 5) {
    return {
      category: 'academic',
      label: 'Academic standing',
      shortLabel: 'Standing',
      status: 'partial',
      tone: 'yellow',
      currentValue: `Top ${profile.classRankPercent}%`,
      targetValue: `Top ${targetRank}%`,
      explanation: 'You are close on class standing. Continued strong grades can move this into a stronger range.',
      targetable: true,
      hardBlocker: false,
      score: 70,
      scoreLift: 8,
      goalTitle: `Move closer to top ${targetRank}% standing`,
      goalMetric: `Top ${targetRank}% class rank`,
      goalWhy: 'A stronger class rank helps for schools that benchmark applicants against cohort performance.',
    };
  }

  return {
    category: 'academic',
    label: 'Academic standing',
    shortLabel: 'Standing',
    status: 'missing',
    tone: 'yellow',
    currentValue: `Top ${profile.classRankPercent}%`,
    targetValue: `Top ${targetRank}%`,
    explanation: 'This school usually expects a stronger class standing, but it can still be a future target.',
    targetable: true,
    hardBlocker: false,
    score: 42,
    scoreLift: 10,
    goalTitle: `Move toward top ${targetRank}% standing`,
    goalMetric: `Top ${targetRank}% class rank`,
    goalWhy: 'Improving class standing can meaningfully strengthen both admission and scholarship competitiveness.',
  };
}

function evaluateThreshold(
  value: number,
  minimum: number,
  target: number,
  tolerance: number,
): { score: number; status: RequirementStatus; tone: RequirementTone; hardBlocker: boolean } {
  if (value >= target) {
    return { score: 100, status: 'met', tone: 'green', hardBlocker: false };
  }

  if (value >= minimum) {
    const progress = target === minimum ? 1 : (value - minimum) / (target - minimum);
    return { score: clamp(82 + progress * 16), status: 'met', tone: 'green', hardBlocker: false };
  }

  if (value >= minimum - tolerance) {
    const progress = (value - (minimum - tolerance)) / tolerance;
    return { score: clamp(58 + progress * 18), status: 'partial', tone: 'yellow', hardBlocker: false };
  }

  const hardBlocker = value < minimum - tolerance * 1.4;
  return {
    score: hardBlocker ? 16 : 32,
    status: hardBlocker ? 'blocker' : 'missing',
    tone: hardBlocker ? 'red' : 'yellow',
    hardBlocker,
  };
}

function getPolicyTolerance(policy: StandardizedPolicy): number {
  switch (policy.exam) {
    case 'SAT':
      return 70;
    case 'ACT':
      return 3;
    case 'AP':
      return 1;
    case 'IB':
      return 4;
    case 'A-Level':
      return 1;
    case 'National Exam':
      return 0.5;
    default:
      return 3;
  }
}

function getPolicyMinimum(policy: StandardizedPolicy, value: number): number {
  if (policy.minimum !== undefined) return policy.minimum;
  if (policy.target === undefined) return value;

  switch (policy.exam) {
    case 'SAT':
      return policy.target - 100;
    case 'ACT':
      return policy.target - 3;
    case 'AP':
      return Math.max(policy.target - 1, 1);
    case 'IB':
      return Math.max(policy.target - 4, 24);
    case 'A-Level':
      return Math.max(policy.target - 1, 1);
    case 'National Exam':
      return Math.max(policy.target - 0.7, 0);
    default:
      return value;
  }
}

function getGpaEvaluation(profile: StudentProfile, university: University): MetricEvaluation {
  const minimum = university.minimumAcademicRequirements.minGpa10;
  const target = university.minimumAcademicRequirements.targetGpa10;
  const threshold = evaluateThreshold(profile.gpa10, minimum, target, 0.4);

  return {
    category: 'academic',
    label: 'Academic requirement',
    shortLabel: 'GPA',
    status: threshold.status,
    tone: threshold.tone,
    currentValue: `${profile.gpa10.toFixed(1)}/10`,
    targetValue: `${minimum.toFixed(1)} minimum, ${target.toFixed(1)} competitive`,
    explanation:
      threshold.status === 'met'
        ? 'Your GPA is already in range for this school.'
        : threshold.hardBlocker
          ? 'Your GPA is currently well below this school’s usual range.'
          : 'You are close on GPA. A stronger final term could improve your readiness.',
    targetable: !threshold.hardBlocker,
    hardBlocker: threshold.hardBlocker,
    score: threshold.score,
    scoreLift: threshold.status === 'met' ? 0 : 12,
    goalTitle: threshold.status === 'met' ? undefined : `Raise GPA toward ${target.toFixed(1)}`,
    goalMetric: threshold.status === 'met' ? undefined : `GPA ${target.toFixed(1)}/10`,
    goalWhy: threshold.status === 'met' ? undefined : 'GPA is the biggest academic driver across both admission and scholarship review.',
  };
}

function getEnglishEvaluation(profile: StudentProfile, university: University): MetricEvaluation {
  const { exam, score } = profile.englishProficiency;

  if (exam === 'Unknown' || score === undefined) {
    const recommended = university.englishRequirements[0];
    return {
      category: 'english',
      label: 'English proficiency',
      shortLabel: 'English',
      status: 'missing',
      tone: 'yellow',
      currentValue: 'Not provided',
      targetValue: `${recommended.exam} ${recommended.minimum}+`,
      explanation: 'You have not added an English test yet. Adding one will sharpen both admissions and scholarship visibility.',
      targetable: true,
      hardBlocker: false,
      score: 34,
      scoreLift: 14,
      goalTitle: `Add a ${recommended.exam} score`,
      goalMetric: `${recommended.exam} ${recommended.target ?? recommended.minimum}`,
      goalWhy: 'English results are one of the fastest ways to unlock more schools and scholarship bands.',
    };
  }

  const requirement = university.englishRequirements.find((item) => item.exam === exam);
  if (!requirement) {
    const fallback = university.englishRequirements[0];
    return {
      category: 'english',
      label: 'English proficiency',
      shortLabel: 'English',
      status: 'partial',
      tone: 'yellow',
      currentValue: `${exam} ${score}`,
      targetValue: `${fallback.exam} ${fallback.minimum}+`,
      explanation: 'This school lists a different preferred English test, so manual confirmation may still be needed.',
      targetable: true,
      hardBlocker: false,
      score: 62,
      scoreLift: 6,
      goalTitle: `Confirm accepted English pathway`,
      goalMetric: `${fallback.exam} ${fallback.minimum}+ or official equivalency`,
      goalWhy: 'Clarifying accepted English evidence removes uncertainty from the application plan.',
    };
  }

  const threshold = evaluateThreshold(score, requirement.minimum, requirement.target ?? requirement.minimum, englishTolerance[exam]);

  return {
    category: 'english',
    label: 'English proficiency',
    shortLabel: 'English',
    status: threshold.status,
    tone: threshold.tone,
    currentValue: `${exam} ${score}`,
    targetValue: `${exam} ${requirement.minimum}+${requirement.target ? `, ${requirement.target} scholarship-friendly` : ''}`,
    explanation:
      threshold.status === 'met'
        ? 'Your English score is already acceptable for this university.'
        : threshold.hardBlocker
          ? 'Your current English score is far below the expected range.'
          : 'You are close on English. A modest increase could improve both readiness and scholarship strength.',
    targetable: !threshold.hardBlocker,
    hardBlocker: threshold.hardBlocker,
    score: threshold.score,
    scoreLift: threshold.status === 'met' ? 0 : 12,
    goalTitle: threshold.status === 'met' ? undefined : `Improve ${exam} toward ${requirement.target ?? requirement.minimum}`,
    goalMetric: threshold.status === 'met' ? undefined : `${exam} ${requirement.target ?? requirement.minimum}`,
    goalWhy: threshold.status === 'met' ? undefined : 'English score increases often have a direct scholarship impact.',
  };
}

function scorePolicyValue(value: number | undefined, policy: StandardizedPolicy): MetricEvaluation {
  if (value === undefined) {
    const status: RequirementStatus =
      policy.policy === 'required' ? 'missing' : policy.policy === 'recommended' ? 'recommended' : 'met';
    const tone: RequirementTone =
      policy.policy === 'required' ? 'yellow' : policy.policy === 'recommended' ? 'gray' : 'green';

    return {
      category: 'testing',
      label: `${policy.exam} policy`,
      shortLabel: policy.exam,
      status,
      tone,
      currentValue: 'Not submitted',
      targetValue:
        policy.minimum || policy.target
          ? `${policy.policy === 'required' ? 'Required' : 'Useful'} around ${policy.target ?? policy.minimum}`
          : policy.policy === 'not-required'
            ? 'Not required'
            : 'Optional',
      explanation:
        policy.policy === 'required'
          ? 'This exam or an equivalent academic credential is usually expected.'
          : policy.policy === 'recommended'
            ? 'A score is not mandatory, but it can strengthen your file.'
            : 'This school does not depend on this score.',
      targetable: policy.policy !== 'not-required',
      hardBlocker: false,
      score: policy.policy === 'required' ? 42 : policy.policy === 'recommended' ? 68 : 85,
      scoreLift: policy.policy === 'required' || policy.policy === 'recommended' ? 6 : 0,
      goalTitle:
        policy.policy === 'not-required'
          ? undefined
          : `Add ${policy.exam}${policy.target ? ` around ${policy.target}` : ''}`,
      goalMetric: policy.policy === 'not-required' ? undefined : `${policy.exam} ${policy.target ?? policy.minimum ?? ''}`.trim(),
      goalWhy:
        policy.policy === 'not-required'
          ? undefined
          : `${policy.exam} can improve your competitiveness even when the school keeps it optional.`,
    };
  }

  const minimum = getPolicyMinimum(policy, value);
  const target = policy.target ?? minimum;
  const threshold = evaluateThreshold(value, minimum, target, getPolicyTolerance(policy));

  return {
    category: 'testing',
    label: `${policy.exam} policy`,
    shortLabel: policy.exam,
    status: threshold.status,
    tone: threshold.tone,
    currentValue: `${policy.exam} ${value}`,
    targetValue: policy.minimum || policy.target ? `${policy.minimum ?? policy.target}+` : 'Optional',
    explanation:
      threshold.status === 'met'
        ? `${policy.exam} supports your application well.`
        : `${policy.exam} is present but could be stronger for this school.`,
    targetable: !threshold.hardBlocker,
    hardBlocker: false,
    score: threshold.score,
    scoreLift: threshold.status === 'met' ? 0 : 6,
    goalTitle: threshold.status === 'met' ? undefined : `Improve ${policy.exam}`,
    goalMetric: threshold.status === 'met' ? undefined : `${policy.exam} ${target}`,
    goalWhy: threshold.status === 'met' ? undefined : `${policy.exam} can help offset borderline fit elsewhere.`,
  };
}

function getTestingEvaluation(profile: StudentProfile, university: University): MetricEvaluation {
  if (university.standardizedPolicies.length === 0) {
    return {
      category: 'testing',
      label: 'Standardized testing',
      shortLabel: 'Tests',
      status: 'met',
      tone: 'green',
      currentValue: 'Flexible policy',
      targetValue: 'No strict test requirement',
      explanation: 'This university keeps testing flexible, so your file relies more on grades, English, and profile strength.',
      targetable: false,
      hardBlocker: false,
      score: 88,
      scoreLift: 0,
    };
  }

  const evaluations = university.standardizedPolicies.map((policy) => {
    const score = profile.standardizedTests[policy.exam];
    return scorePolicyValue(score, policy);
  });

  const requiredMissing = evaluations.some((item) => item.status === 'missing' && item.tone === 'yellow' && item.shortLabel !== 'AP');
  const averageScore = evaluations.reduce((sum, item) => sum + item.score, 0) / evaluations.length;
  const summary = evaluations
    .filter((item) => item.status !== 'met')
    .map((item) => item.shortLabel)
    .slice(0, 2)
    .join(', ');

  return {
    category: 'testing',
    label: 'Standardized testing',
    shortLabel: 'Tests',
    status: requiredMissing ? 'partial' : averageScore >= 82 ? 'met' : averageScore >= 62 ? 'partial' : 'recommended',
    tone: requiredMissing ? 'yellow' : averageScore >= 82 ? 'green' : averageScore >= 62 ? 'yellow' : 'gray',
    currentValue: summary ? `Needs attention: ${summary}` : 'On track',
    targetValue: 'Meet required tests or strengthen optional scores',
    explanation:
      requiredMissing
        ? 'At least one testing pathway still needs attention.'
        : averageScore >= 82
          ? 'Your testing profile is already helping this application.'
          : 'Tests are not the main blocker, but stronger scores could help.',
    targetable: true,
    hardBlocker: false,
    score: averageScore,
    scoreLift: averageScore >= 82 ? 0 : 6,
    goalTitle: averageScore >= 82 ? undefined : 'Strengthen testing profile',
    goalMetric: averageScore >= 82 ? undefined : 'Meet or exceed school target scores',
    goalWhy: averageScore >= 82 ? undefined : 'Better testing can improve competitiveness at reach schools.',
  };
}

function getMajorEvaluation(profile: StudentProfile, university: University): MetricEvaluation {
  const intendedClusters = majorClusterLookup[profile.intendedMajor] ?? ['exploratory'];
  const exactMatch = university.availableMajors.some(
    (major) => major.toLowerCase() === profile.intendedMajor.toLowerCase(),
  );
  const clusterMatch = intendedClusters.some((cluster) => university.majorClusters.includes(cluster));
  const hardBlocked =
    university.hardConstraints?.majorsNotSupported?.some(
      (major) => major.toLowerCase() === profile.intendedMajor.toLowerCase(),
    ) ?? false;

  if (hardBlocked || (!exactMatch && !clusterMatch)) {
    return {
      category: 'major',
      label: 'Major alignment',
      shortLabel: 'Major',
      status: 'blocker',
      tone: 'red',
      currentValue: profile.intendedMajor,
      targetValue: 'Choose a university that supports your intended major',
      explanation: 'This university is not a realistic fit for your current intended major.',
      targetable: false,
      hardBlocker: true,
      score: 5,
      scoreLift: 0,
    };
  }

  if (exactMatch) {
    return {
      category: 'major',
      label: 'Major alignment',
      shortLabel: 'Major',
      status: 'met',
      tone: 'green',
      currentValue: profile.intendedMajor,
      targetValue: 'Exact major available',
      explanation: 'Your intended major is directly available here.',
      targetable: false,
      hardBlocker: false,
      score: 100,
      scoreLift: 0,
    };
  }

  return {
    category: 'major',
    label: 'Major alignment',
    shortLabel: 'Major',
    status: 'partial',
    tone: 'yellow',
    currentValue: profile.intendedMajor,
    targetValue: 'Related major cluster available',
    explanation: 'Your intended path is available through a related program cluster, so checking specific course maps matters.',
    targetable: true,
    hardBlocker: false,
    score: 74,
    scoreLift: 8,
    goalTitle: `Confirm exact program path for ${profile.intendedMajor}`,
    goalMetric: 'Program map and specialization plan',
    goalWhy: 'Program fit clarity strengthens essays and prevents misaligned applications.',
  };
}

function getProfileStrengthEvaluation(profile: StudentProfile, university: University): MetricEvaluation {
  const counts = getProfileCounts(profile);
  const requirements = university.minimumAcademicRequirements;
  const depthScore = clamp((counts.extracurriculars / Math.max(requirements.extracurricularDepthTarget ?? 1, 1)) * 40, 0, 40);
  const leadershipScore = clamp((counts.leadership / Math.max(requirements.leadershipTarget ?? 1, 1)) * 20, 0, 20);
  const awardScore = clamp((counts.awards / Math.max(requirements.awardsTarget ?? 1, 1)) * 20, 0, 20);
  const researchTarget = requirements.researchPortfolioPreferred ? 1 : 0.5;
  const researchScore = clamp((Math.max(counts.research, counts.volunteering) / researchTarget) * 20, 0, 20);
  const score = round(depthScore + leadershipScore + awardScore + researchScore);

  if (score >= 82) {
    return {
      category: 'profile',
      label: 'Extracurricular profile',
      shortLabel: 'Profile',
      status: 'met',
      tone: 'green',
      currentValue: `${counts.extracurriculars} activities, ${counts.leadership} leadership roles`,
      targetValue: 'Depth with evidence',
      explanation: 'Your profile already shows useful depth beyond academics.',
      targetable: false,
      hardBlocker: false,
      score,
      scoreLift: 0,
    };
  }

  if (score >= 60) {
    return {
      category: 'profile',
      label: 'Extracurricular profile',
      shortLabel: 'Profile',
      status: 'partial',
      tone: 'yellow',
      currentValue: `${counts.extracurriculars} activities, ${counts.leadership} leadership roles`,
      targetValue: 'Stronger depth or evidence',
      explanation: 'Your profile is credible, and one more strong leadership or impact story would help.',
      targetable: true,
      hardBlocker: false,
      score,
      scoreLift: 9,
      goalTitle: 'Add one stronger leadership or impact example',
      goalMetric: '1 additional high-impact leadership/project entry',
      goalWhy: 'Profile depth helps both scholarship review and tie-break decisions.',
    };
  }

  return {
    category: 'profile',
    label: 'Extracurricular profile',
    shortLabel: 'Profile',
    status: 'missing',
    tone: 'yellow',
    currentValue: `${counts.extracurriculars} activities, ${counts.leadership} leadership roles`,
    targetValue: 'Stronger depth or evidence',
    explanation: 'This school would feel more realistic with deeper leadership, awards, or project evidence.',
    targetable: true,
    hardBlocker: false,
    score,
    scoreLift: 12,
    goalTitle: 'Build a stronger extracurricular signature',
    goalMetric: 'Leadership, awards, or project evidence',
    goalWhy: 'A stronger profile can raise both admission confidence and merit positioning.',
  };
}

function getFinanceEvaluation(
  profile: StudentProfile,
  university: University,
  scholarshipReadiness: number,
): MetricEvaluation & { estimatedNetMin: number; estimatedNetMax: number } {
  const bestScholarship = university.scholarships.reduce((max, scholarship) => Math.max(max, scholarship.estimatedValueUsd), 0);
  const scholarshipFactor = scholarshipReadiness >= 78 ? 0.7 : scholarshipReadiness >= 60 ? 0.45 : scholarshipReadiness >= 45 ? 0.2 : 0;
  const effectiveScholarship = bestScholarship * scholarshipFactor;
  const estimatedNetMin = Math.max(0, university.tuitionRangeUsd.min + university.livingCostRangeUsd.min - effectiveScholarship);
  const estimatedNetMax = Math.max(0, university.tuitionRangeUsd.max + university.livingCostRangeUsd.max - effectiveScholarship);
  const budget = profile.budgetPerYearUsd;
  const gap = average(estimatedNetMin, estimatedNetMax) - budget;

  if (gap <= 0) {
    return {
      category: 'finance',
      label: 'Annual budget match',
      shortLabel: 'Budget',
      status: 'met',
      tone: 'green',
      currentValue: `${formatCurrency(budget)} budget`,
      targetValue: `${formatCurrency(estimatedNetMin)}-${formatCurrency(estimatedNetMax)} estimated net cost`,
      explanation: 'Your current budget can realistically cover the estimated annual cost.',
      targetable: false,
      hardBlocker: false,
      score: 100,
      scoreLift: 0,
      estimatedNetMin,
      estimatedNetMax,
    };
  }

  if (gap <= 5000 || (university.needBasedAidAvailability && profile.financialNeed !== 'low')) {
    return {
      category: 'finance',
      label: 'Annual budget match',
      shortLabel: 'Budget',
      status: 'partial',
      tone: 'yellow',
      currentValue: `${formatCurrency(budget)} budget`,
      targetValue: `${formatCurrency(estimatedNetMin)}-${formatCurrency(estimatedNetMax)} estimated net cost`,
      explanation: 'Budget is close. Scholarship timing or a modest increase in support could make this realistic.',
      targetable: true,
      hardBlocker: false,
      score: 68,
      scoreLift: 10,
      goalTitle: 'Close the annual funding gap',
      goalMetric: `${formatCurrency(Math.max(gap, 2500))} more annual support`,
      goalWhy: 'Budget clarity prevents strong-fit schools from becoming financially unsafe choices.',
      estimatedNetMin,
      estimatedNetMax,
    };
  }

  return {
    category: 'finance',
    label: 'Annual budget match',
    shortLabel: 'Budget',
    status: 'missing',
    tone: 'yellow',
    currentValue: `${formatCurrency(budget)} budget`,
    targetValue: `${formatCurrency(estimatedNetMin)}-${formatCurrency(estimatedNetMax)} estimated net cost`,
    explanation: 'Cost is the biggest tension right now. This can still be a useful target if scholarship upside is strong.',
    targetable: true,
    hardBlocker: false,
    score: gap <= 12000 ? 42 : 18,
    scoreLift: 12,
    goalTitle: 'Target scholarships or lower-cost options',
    goalMetric: gap <= 12000 ? `${formatCurrency(gap)} funding gap` : 'Major cost gap',
    goalWhy: 'A clear funding plan matters before committing time to an expensive application.',
    estimatedNetMin,
    estimatedNetMax,
  };
}

function buildDocumentEvaluation(profile: StudentProfile, university: University): MetricEvaluation {
  const portfolioRelevant =
    university.portfolioRequirement !== 'not required' &&
    (profile.intendedMajor.includes('Media') ||
      profile.intendedMajor.includes('Design') ||
      profile.intendedMajor.includes('Architecture') ||
      profile.intendedMajor.includes('Journalism'));
  const hasPortfolioEvidence = profile.researchProjects.length > 0 || profile.awards.length > 0;

  if (portfolioRelevant && !hasPortfolioEvidence) {
    return {
      category: 'documents',
      label: 'Document and portfolio readiness',
      shortLabel: 'Documents',
      status: university.portfolioRequirement === 'required' ? 'blocker' : 'missing',
      tone: university.portfolioRequirement === 'required' ? 'red' : 'yellow',
      currentValue: 'Core documents likely, portfolio evidence limited',
      targetValue: university.portfolioRequirement === 'required' ? 'Portfolio required' : 'Portfolio recommended',
      explanation:
        university.portfolioRequirement === 'required'
          ? 'This program usually needs portfolio evidence before you can submit a strong application.'
          : 'A portfolio is not mandatory, but it would make your application more convincing.',
      targetable: true,
      hardBlocker: university.portfolioRequirement === 'required',
      score: university.portfolioRequirement === 'required' ? 22 : 48,
      scoreLift: 12,
      goalTitle: 'Prepare a focused portfolio or evidence set',
      goalMetric: 'Portfolio with 2-4 annotated examples',
      goalWhy: 'A small but clear portfolio can materially improve creative or communication-focused applications.',
    };
  }

  return {
    category: 'documents',
    label: 'Document readiness',
    shortLabel: 'Documents',
    status: 'recommended',
    tone: 'gray',
    currentValue: `${university.documentRequirements.length} core document types`,
    targetValue: `${university.recommendationLettersRequired} recommendation letters`,
    explanation: 'This is more of an execution checklist than a fit blocker. Start early so deadlines feel lighter.',
    targetable: true,
    hardBlocker: false,
    score: 78,
    scoreLift: 3,
    goalTitle: 'Prepare documents early',
    goalMetric: `${university.recommendationLettersRequired} recommendation letters and essays`,
    goalWhy: 'Early document prep reduces deadline risk and lets you spend more time on scholarship quality.',
  };
}

function getDeadlineSignal(university: University): DeadlineSignal | undefined {
  const candidates = [
    { label: 'Priority deadline soon', date: university.deadlines.priorityDeadline },
    { label: 'Scholarship deadline soon', date: university.deadlines.scholarshipDeadline },
    { label: 'Application deadline coming up', date: university.deadlines.applicationDeadline },
  ].filter((item): item is { label: string; date: string } => Boolean(item.date));

  const now = new Date();

  const upcoming = candidates
    .map((item) => ({
      label: item.label,
      daysUntil: Math.ceil((new Date(item.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter((item) => item.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)[0];

  if (!upcoming) {
    return undefined;
  }

  return {
    ...upcoming,
    tone: upcoming.daysUntil <= 14 ? 'red' : upcoming.daysUntil <= 35 ? 'yellow' : 'gray',
  };
}

function buildTimelineEvaluation(university: University): MetricEvaluation {
  const signal = getDeadlineSignal(university);

  return {
    category: 'timeline',
    label: 'Deadline timing',
    shortLabel: 'Deadline',
    status: signal && signal.daysUntil <= 14 ? 'missing' : 'recommended',
    tone: signal?.tone ?? 'gray',
    currentValue: signal?.label ?? 'No urgent deadline',
    targetValue: university.deadlines.priorityDeadline ?? university.deadlines.applicationDeadline,
    explanation:
      signal && signal.daysUntil <= 14
        ? 'This deadline is close enough that planning now matters.'
        : 'The timing is manageable, but early action still improves scholarship access.',
    targetable: true,
    hardBlocker: false,
    score: signal && signal.daysUntil <= 14 ? 52 : 80,
    scoreLift: 4,
    goalTitle: 'Prepare for the next deadline',
    goalMetric: signal?.label ?? university.deadlines.applicationDeadline,
    goalWhy: 'Applying before the key deadline often improves scholarship and housing options.',
  };
}

function buildChecklistItems(
  profile: StudentProfile,
  university: University,
  scholarshipReadiness: number,
): {
  checklist: RequirementChecklistItem[];
  scoreBreakdown: UniversityFitResult['scoreBreakdown'];
  estimatedNetCostUsd: UniversityFitResult['estimatedNetCostUsd'];
} {
  const gpa = getGpaEvaluation(profile, university);
  const standing = getStandingScore(profile, university);
  const english = getEnglishEvaluation(profile, university);
  const testing = getTestingEvaluation(profile, university);
  const major = getMajorEvaluation(profile, university);
  const profileStrength = getProfileStrengthEvaluation(profile, university);
  const finance = getFinanceEvaluation(profile, university, scholarshipReadiness);
  const documents = buildDocumentEvaluation(profile, university);
  const timeline = buildTimelineEvaluation(university);

  const metrics: MetricEvaluation[] = [gpa, standing, english, testing, major, profileStrength, finance, documents, timeline];

  const checklist = metrics.map<RequirementChecklistItem>((metric) => ({
    id: `${university.id}-${metric.shortLabel.toLowerCase().replace(/\s+/g, '-')}`,
    category: metric.category,
    label: metric.label,
    shortLabel: metric.shortLabel,
    status: metric.status,
    tone: metric.tone,
    currentValue: metric.currentValue,
    targetValue: metric.targetValue,
    explanation: metric.explanation,
    targetable: metric.targetable,
    hardBlocker: metric.hardBlocker,
    goal:
      metric.goalTitle && metric.goalMetric && metric.goalWhy
        ? {
            id: `${university.id}-${metric.shortLabel.toLowerCase()}-goal`,
            title: metric.goalTitle,
            category:
              metric.category === 'english'
                ? 'english'
                : metric.category === 'finance'
                  ? 'budget'
                  : metric.category === 'documents'
                    ? 'documents'
                    : metric.category === 'profile'
                      ? 'leadership'
                      : metric.category === 'major'
                        ? 'portfolio'
                        : 'academic',
            targetMetric: metric.goalMetric,
            whyItMatters: metric.goalWhy,
            universitiesUnlocked: [university.name],
            estimatedImpact: metric.scoreLift >= 10 ? 'High impact on readiness' : 'Moderate impact on competitiveness',
            scoreLift: metric.scoreLift,
          }
        : undefined,
  }));

  return {
    checklist,
    scoreBreakdown: {
      academic: round(gpa.score * 0.65 + standing.score * 0.15 + testing.score * 0.2),
      english: round(english.score),
      major: round(major.score),
      scholarship: round(scholarshipReadiness),
      financial: round(finance.score),
      extracurricular: round(profileStrength.score),
    },
    estimatedNetCostUsd: {
      min: finance.estimatedNetMin,
      max: finance.estimatedNetMax,
    },
  };
}

function evaluateScholarship(
  profile: StudentProfile,
  scholarship: ScholarshipOpportunity,
): ScholarshipEvaluation {
  const counts = getProfileCounts(profile);
  const components: number[] = [];
  const missingCriteria: string[] = [];
  const matchedCriteria: string[] = [];

  if (scholarship.minimumGpa10) {
    const evaluation = evaluateThreshold(
      profile.gpa10,
      scholarship.minimumGpa10,
      scholarship.targetGpa10 ?? scholarship.minimumGpa10,
      0.3,
    );
    components.push(evaluation.score);
    if (evaluation.status === 'met') {
      matchedCriteria.push(`GPA ${profile.gpa10.toFixed(1)}/10 is within range`);
    } else {
      missingCriteria.push(`GPA closer to ${scholarship.targetGpa10 ?? scholarship.minimumGpa10}/10`);
    }
  }

  if (scholarship.englishThresholds) {
    const exam = profile.englishProficiency.exam;
    const score = profile.englishProficiency.score;
    if (exam === 'Unknown' || score === undefined) {
      components.push(28);
      missingCriteria.push('Add an official English score');
    } else {
      const threshold = scholarship.englishThresholds[exam];
      if (threshold === undefined) {
        components.push(48);
        missingCriteria.push(`Confirm ${exam} equivalency for scholarship review`);
      } else {
        const evaluation = evaluateThreshold(score, threshold, threshold, englishTolerance[exam]);
        components.push(evaluation.score);
        if (evaluation.status === 'met') {
          matchedCriteria.push(`${exam} ${score} meets the scholarship line`);
        } else {
          missingCriteria.push(`${exam} closer to ${threshold}`);
        }
      }
    }
  }

  if (scholarship.leadershipPreferred) {
    const score = clamp((counts.leadership / scholarship.leadershipPreferred) * 100);
    components.push(score);
    if (score >= 85) {
      matchedCriteria.push('Leadership evidence is already strong');
    } else {
      missingCriteria.push('Add or better describe leadership impact');
    }
  }

  if (scholarship.awardsPreferred) {
    const score = clamp((counts.awards / scholarship.awardsPreferred) * 100);
    components.push(score);
    if (score >= 85) {
      matchedCriteria.push('Awards support this scholarship well');
    } else {
      missingCriteria.push('One more award or distinction would help');
    }
  }

  if (scholarship.volunteerPreferred) {
    const score = clamp((counts.volunteering / scholarship.volunteerPreferred) * 100);
    components.push(score);
    if (score >= 85) {
      matchedCriteria.push('Service impact matches the scholarship theme');
    } else {
      missingCriteria.push('Add community impact evidence');
    }
  }

  if (scholarship.researchPreferred) {
    const score = counts.research > 0 ? 100 : 35;
    components.push(score);
    if (score >= 85) {
      matchedCriteria.push('Project or research evidence is present');
    } else {
      missingCriteria.push('Add project, research, or portfolio evidence');
    }
  }

  if (scholarship.financialNeedEligible) {
    const eligible = scholarship.financialNeedEligible.includes(profile.financialNeed);
    components.push(eligible ? 100 : 45);
    if (eligible) {
      matchedCriteria.push('Financial-need profile is aligned');
    } else {
      missingCriteria.push('This award prioritizes a different financial-need profile');
    }
  }

  if (scholarship.citizenshipsEligible?.length) {
    const eligible = scholarship.citizenshipsEligible.includes(profile.citizenship);
    components.push(eligible ? 100 : 0);
    if (eligible) {
      matchedCriteria.push('Citizenship eligibility is confirmed');
    } else {
      missingCriteria.push('Citizenship eligibility is restricted');
    }
  }

  const score = components.length ? round(components.reduce((sum, item) => sum + item, 0) / components.length) : 0;
  const status: ScholarshipStatus =
    score >= 78
      ? 'Likely eligible'
      : score >= 58
        ? 'Potentially eligible'
        : score >= 38
          ? 'Needs improvement'
          : 'Not eligible yet';

  return {
    scholarship,
    score,
    status,
    missingCriteria,
    matchedCriteria,
    benefits: scholarship.benefits,
  };
}

function getMatchLabel(score: number, blockers: number): MatchLabel {
  if (blockers > 0 && score < 50) return 'Not Yet Ready';
  if (score >= 85 && blockers === 0) return 'Strong Match';
  if (score >= 74 && blockers === 0) return 'Good Match';
  if (score >= 62) return 'Reach';
  if (score >= 48) return 'Ambitious';
  return 'Not Yet Ready';
}

function getAdmissionStatus(admissionReadiness: number, blockers: RequirementChecklistItem[]): AdmissionStatus {
  if (blockers.length === 0 && admissionReadiness >= 78) return 'Can apply now';
  if (blockers.length === 0 && admissionReadiness >= 60) return 'Can apply but low competitiveness';
  if (admissionReadiness >= 45) return 'Can target after improving profile';
  return 'Not eligible yet';
}

function buildExplainability(
  result: UniversityFitResult,
  checklist: RequirementChecklistItem[],
): string[] {
  const messages: string[] = [];
  const gpa = checklist.find((item) => item.shortLabel === 'GPA');
  const english = checklist.find((item) => item.shortLabel === 'English');
  const finance = checklist.find((item) => item.shortLabel === 'Budget');
  const profile = checklist.find((item) => item.shortLabel === 'Profile');

  if (gpa) messages.push(gpa.explanation);
  if (english) messages.push(english.explanation);
  if (finance) messages.push(finance.explanation);
  if (profile && result.scoreBreakdown.extracurricular < 82) messages.push(profile.explanation);

  if (result.majorMatch >= 90) {
    messages.push('Your intended major is directly available here, which keeps this recommendation more grounded.');
  }

  return messages.slice(0, 4);
}

function buildBestNextMove(result: UniversityFitResult): string {
  const topGoal = result.gapAnalysis.biggestUnlock;
  if (result.admissionStatus === 'Can apply now' && result.scholarshipStatus !== 'Likely eligible') {
    return 'You can already apply now; focus on scholarship essays and priority timing.';
  }
  if (topGoal) {
    return `${topGoal.title} to lift your chances here.`;
  }
  if (result.financialMatch < 55) {
    return 'Academic fit is usable, but budget planning is the main issue to solve next.';
  }
  return 'You are close; tighten documents and apply before the earlier deadline.';
}

function buildCompetitiveness(overallFitScore: number, matchLabel: MatchLabel): UniversityFitResult['competitivenessLevel'] {
  if (matchLabel === 'Strong Match') return 'High potential';
  if (overallFitScore >= 72) return 'Competitive with support';
  if (overallFitScore >= 55) return 'Stretch target';
  return 'Future target';
}

function buildGapAnalysis(
  university: University,
  checklist: RequirementChecklistItem[],
): UniversityFitResult['gapAnalysis'] {
  const strengths = checklist
    .filter((item) => item.status === 'met')
    .slice(0, 3)
    .map((item) => `${item.shortLabel}: ${item.currentValue}`);

  const futureTargets = checklist
    .filter((item) => item.status === 'partial' || item.status === 'missing' || item.status === 'recommended')
    .slice(0, 4)
    .map((item) => item.explanation);

  const goals = checklist
    .filter((item): item is RequirementChecklistItem & { goal: GoalOpportunity } => Boolean(item.goal))
    .map((item) => item.goal)
    .sort((a, b) => b.scoreLift - a.scoreLift);

  return {
    strengths,
    futureTargets,
    biggestUnlock: goals[0]
      ? {
          ...goals[0],
          universitiesUnlocked: Array.from(new Set([...goals[0].universitiesUnlocked, university.name])),
        }
      : undefined,
  };
}

export function buildUniversityMatches(
  profile: StudentProfile,
  universities: University[],
): UniversityFitResult[] {
  return universities
    .map((university) => {
      const scholarshipEvaluations = university.scholarships.map((scholarship) => evaluateScholarship(profile, scholarship));
      const scholarshipReadiness = scholarshipEvaluations.length
        ? round(Math.max(...scholarshipEvaluations.map((item) => item.score)))
        : 0;
      const scholarshipStatus: ScholarshipStatus =
        scholarshipReadiness >= 78
          ? 'Likely eligible'
          : scholarshipReadiness >= 58
            ? 'Potentially eligible'
            : scholarshipReadiness >= 38
              ? 'Needs improvement'
              : 'Not eligible yet';

      const { checklist, scoreBreakdown, estimatedNetCostUsd } = buildChecklistItems(profile, university, scholarshipReadiness);
      const metRequirements = checklist.filter((item) => item.status === 'met');
      const missingRequirements = checklist.filter((item) => item.status !== 'met' && item.status !== 'recommended');
      const hardBlockers = checklist.filter((item) => item.hardBlocker);
      const overallFitScore = round(
        scoreBreakdown.academic * 0.3 +
          scoreBreakdown.english * 0.15 +
          scoreBreakdown.major * 0.15 +
          scoreBreakdown.scholarship * 0.2 +
          scoreBreakdown.financial * 0.1 +
          scoreBreakdown.extracurricular * 0.1,
      );
      const admissionReadiness = round(
        scoreBreakdown.academic * 0.45 +
          scoreBreakdown.english * 0.25 +
          scoreBreakdown.major * 0.2 +
          scoreBreakdown.extracurricular * 0.1,
      );
      const matchLabel = getMatchLabel(overallFitScore, hardBlockers.length);
      const admissionStatus = getAdmissionStatus(admissionReadiness, hardBlockers);
      const gapAnalysis = buildGapAnalysis(university, checklist);

      const result: UniversityFitResult = {
        university,
        overallFitScore,
        admissionReadiness,
        scholarshipReadiness,
        financialMatch: scoreBreakdown.financial,
        majorMatch: scoreBreakdown.major,
        extracurricularStrength: scoreBreakdown.extracurricular,
        scoreBreakdown,
        matchLabel,
        competitivenessLevel: buildCompetitiveness(overallFitScore, matchLabel),
        admissionStatus,
        scholarshipStatus,
        explainability: [],
        bestNextMove: '',
        metRequirements,
        missingRequirements,
        hardBlockers,
        checklist,
        scholarshipEvaluations: scholarshipEvaluations.sort((a, b) => b.score - a.score),
        gapAnalysis,
        estimatedNetCostUsd,
        benefitsPreview: Array.from(
          new Set([
            ...university.benefits,
            ...(scholarshipEvaluations[0]?.benefits ?? []),
            ...(university.scholarshipHighlights ?? []),
          ]),
        ).slice(0, 4),
        deadlineSignal: getDeadlineSignal(university),
      };

      result.explainability = buildExplainability(result, checklist);
      result.bestNextMove = buildBestNextMove(result);

      return result;
    })
    .sort((a, b) => b.overallFitScore - a.overallFitScore);
}

export function buildGoalTracker(results: UniversityFitResult[]): GoalOpportunity[] {
  const goalMap = new Map<string, GoalOpportunity>();

  results.forEach((result) => {
    result.checklist.forEach((item) => {
      if (!item.goal) return;

      const key = `${item.goal.title}|${item.goal.targetMetric}`;
      const existing = goalMap.get(key);

      if (!existing) {
        goalMap.set(key, { ...item.goal });
        return;
      }

      existing.universitiesUnlocked = Array.from(
        new Set([...existing.universitiesUnlocked, ...item.goal.universitiesUnlocked, result.university.name]),
      );
      if (item.goal.scoreLift > existing.scoreLift) {
        existing.scoreLift = item.goal.scoreLift;
        existing.estimatedImpact = item.goal.estimatedImpact;
      }
    });
  });

  return Array.from(goalMap.values()).sort((a, b) => {
    if (b.universitiesUnlocked.length !== a.universitiesUnlocked.length) {
      return b.universitiesUnlocked.length - a.universitiesUnlocked.length;
    }
    return b.scoreLift - a.scoreLift;
  });
}

function applyOpportunity(profile: StudentProfile, type: 'gpa' | 'english' | 'award' | 'leadership'): StudentProfile {
  if (type === 'gpa') {
    return { ...profile, gpa10: clamp(profile.gpa10 + 0.3, 0, 9.8) };
  }

  if (type === 'english') {
    if (profile.englishProficiency.exam === 'Unknown' || profile.englishProficiency.score === undefined) {
      return {
        ...profile,
        englishProficiency: {
          exam: 'IELTS',
          score: 6.5,
        },
      };
    }

    const bump =
      profile.englishProficiency.exam === 'IELTS'
        ? 0.5
        : profile.englishProficiency.exam === 'TOEFL'
          ? 8
          : 10;

    return {
      ...profile,
      englishProficiency: {
        ...profile.englishProficiency,
        score: (profile.englishProficiency.score ?? 0) + bump,
      },
    };
  }

  if (type === 'award') {
    return {
      ...profile,
      awards: [
        ...profile.awards,
        {
          title: 'Additional distinction',
          impact: 'Simulated new award for planning purposes.',
          tier: 'regional',
        },
      ],
    };
  }

  return {
    ...profile,
    leadershipExperience: [
      ...profile.leadershipExperience,
      {
        title: 'Additional leadership role',
        impact: 'Simulated leadership experience for planning purposes.',
        tier: 'school',
      },
    ],
  };
}

export function buildOpportunityUnlocks(
  profile: StudentProfile,
  universities: University[],
): OpportunityUnlock[] {
  const baseline = buildUniversityMatches(profile, universities);
  const baselineMap = new Map(baseline.map((item) => [item.university.id, item]));
  const scenarios: Array<{ type: 'gpa' | 'english' | 'award' | 'leadership'; title: string; improvement: string }> = [
    { type: 'gpa', title: 'Raise GPA by 0.3', improvement: 'A small GPA lift can move several reach schools into the realistic range.' },
    {
      type: 'english',
      title: profile.englishProficiency.exam === 'Unknown' ? 'Add an English score' : `Improve ${profile.englishProficiency.exam}`,
      improvement: 'English gains often unlock more scholarships than students expect.',
    },
    { type: 'award', title: 'Add one notable award', improvement: 'Awards help most when academics are already close to the target.' },
    { type: 'leadership', title: 'Add one leadership example', improvement: 'Leadership can improve honors and scholarship positioning.' },
  ];

  return scenarios
    .map((scenario) => {
      const improved = buildUniversityMatches(applyOpportunity(profile, scenario.type), universities);
      const unlockedUniversities = improved
        .filter((item) => {
          const before = baselineMap.get(item.university.id);
          if (!before) return false;
          return admissionStatusOrder.indexOf(item.admissionStatus) < admissionStatusOrder.indexOf(before.admissionStatus);
        })
        .map((item) => item.university.name);
      const unlockedScholarships = improved.reduce((count, item) => {
        const before = baselineMap.get(item.university.id);
        if (!before) return count;
        return count + Math.max(0, item.scholarshipEvaluations.filter((entry) => entry.status === 'Likely eligible').length - before.scholarshipEvaluations.filter((entry) => entry.status === 'Likely eligible').length);
      }, 0);
      const admissionGain = round(
        improved.reduce((sum, item) => sum + item.admissionReadiness, 0) / improved.length -
          baseline.reduce((sum, item) => sum + item.admissionReadiness, 0) / baseline.length,
      );
      const scholarshipGain = round(
        improved.reduce((sum, item) => sum + item.scholarshipReadiness, 0) / improved.length -
          baseline.reduce((sum, item) => sum + item.scholarshipReadiness, 0) / baseline.length,
      );

      return {
        id: scenario.type,
        title: scenario.title,
        improvement: scenario.improvement,
        admissionGain,
        scholarshipGain,
        unlockedScholarships,
        unlockedUniversities,
      };
    })
    .filter((item) => item.admissionGain > 0 || item.scholarshipGain > 0 || item.unlockedScholarships > 0)
    .sort((a, b) => {
      if (b.unlockedScholarships !== a.unlockedScholarships) {
        return b.unlockedScholarships - a.unlockedScholarships;
      }
      return b.admissionGain + b.scholarshipGain - (a.admissionGain + a.scholarshipGain);
    });
}

export function filterAndSortResults(
  results: UniversityFitResult[],
  filters: UniversityFilterState,
): UniversityFitResult[] {
  const search = filters.search.trim().toLowerCase();

  const filtered = results.filter((result) => {
    const { university } = result;
    const englishExams = university.englishRequirements.map((item) => item.exam);

    if (search) {
      const haystack = `${university.name} ${university.country} ${university.city}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (filters.country !== 'all' && university.country !== filters.country) return false;
    if (filters.major !== 'all' && !university.availableMajors.includes(filters.major)) return false;
    if (filters.budget !== null && result.estimatedNetCostUsd.max > filters.budget) return false;
    if (filters.scholarshipType !== 'all' && !university.scholarships.some((item) => item.type === filters.scholarshipType)) return false;
    if (filters.eligibility !== 'all' && result.admissionStatus !== filters.eligibility) return false;
    if (filters.fitLevel !== 'all' && result.matchLabel !== filters.fitLevel) return false;
    if (filters.englishRequirement !== 'all' && !englishExams.includes(filters.englishRequirement)) return false;

    return true;
  });

  return [...filtered].sort((left, right) => {
    switch (filters.sortBy) {
      case 'lowest-cost':
        return left.estimatedNetCostUsd.min - right.estimatedNetCostUsd.min;
      case 'highest-scholarship':
        return right.scholarshipReadiness - left.scholarshipReadiness;
      case 'easiest-entry':
        return right.admissionReadiness - left.admissionReadiness;
      case 'deadline-urgency': {
        const leftDeadline = left.deadlineSignal?.daysUntil ?? 999;
        const rightDeadline = right.deadlineSignal?.daysUntil ?? 999;
        return leftDeadline - rightDeadline;
      }
      case 'best-fit':
      default:
        return right.overallFitScore - left.overallFitScore;
    }
  });
}

export function compareMatchLabels(left: MatchLabel, right: MatchLabel): number {
  return matchLabelOrder.indexOf(left) - matchLabelOrder.indexOf(right);
}
