import type { ScholarshipOpportunity, University } from './types';

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

type Enrichment = {
  aliases: string[];
  apply: (university: University) => University;
};

function withOfficialSources(
  university: University,
  profileSources: University['profileSources'],
  overrides: Partial<University> = {},
): University {
  return {
    ...university,
    ...overrides,
    dataQuality: 'hybrid',
    profileSources,
  };
}

const enrichments: Enrichment[] = [
  {
    aliases: ['university of oxford', 'oxford'],
    apply: (university) =>
      withOfficialSources(
        university,
        [
          { type: 'official', label: 'Oxford applicant guide', url: 'https://www.ox.ac.uk/admissions/undergraduate/applying-to-oxford/guide' },
          { type: 'official', label: 'Oxford English requirements', url: 'https://www.ox.ac.uk/admissions/undergraduate/applying-to-oxford/for-international-students/english-language-requirements' },
          { type: 'official', label: 'Oxford fees and funding', url: 'https://www.ox.ac.uk/admissions/undergraduate/fees-and-funding' },
        ],
        {
          reputationLabel: 'Oxford applicant guide and English requirements cross-checked on official undergraduate admissions pages',
          englishRequirements: [
            { exam: 'IELTS', minimum: 7.5, target: 8 },
            { exam: 'TOEFL', minimum: 110, target: 112 },
            { exam: 'Duolingo', minimum: 145, target: 155 },
          ],
          deadlines: {
            intake: 'Fall 2027',
            applicationDeadline: '2026-10-15',
            priorityDeadline: '2026-10-15',
            scholarshipDeadline: university.deadlines.scholarshipDeadline ?? '2026-12-01',
          },
          standardizedPolicies: [],
          scholarships: [
            {
              id: 'oxford-college-and-external-awards',
              name: 'Oxford College and External Awards',
              type: 'merit',
              automatic: false,
              coverage: 'Competitive college-specific or external funding',
              estimatedValueUsd: 8000,
              benefits: ['Can reduce annual cost', 'Best treated as competitive upside rather than guaranteed funding'],
              minimumGpa10: 8.8,
              targetGpa10: 9.4,
              englishThresholds: { IELTS: 7.5, TOEFL: 110, Duolingo: 145 },
              leadershipPreferred: 1,
              awardsPreferred: 1,
              notes: 'Oxford points students to its fees, funding and scholarship search because support is fragmented across colleges and external schemes.',
              applicationSteps: [
                'Step 1: Submit the UCAS application by the Oxford deadline.',
                'Step 2: Check whether your college or course has separate funding opportunities.',
                'Step 3: Use Oxford funding search tools and confirm country-specific eligibility early.',
                'Step 4: Prepare concise academic and extracurricular evidence for scholarship review.',
                'Step 5: Track any college or external funding forms after an offer is made.',
              ],
            },
          ],
          automaticMeritScholarships: [],
          specialNotes: [
            'Oxford states that its 2026 UCAS deadline is 15 October 2026 and that shortlisted applicants are interviewed online in December.',
            'Oxford says all undergraduate courses now require the higher level of English ability. IELTS 7.5 and TOEFL iBT 110 are listed on the official English language page.',
          ],
          officialApplicationSteps: [
            'Step 1: Review Oxford course-specific admission requirements before choosing a course.',
            'Step 2: Submit the UCAS application by 15 October 2026.',
            'Step 3: Register any required admissions test before the UCAS deadline and submit written work by the Oxford deadline where required.',
            'Step 4: Prepare for online interviews in December if shortlisted.',
            'Step 5: Verify college-level fees, funding, and scholarship options after an offer is made.',
          ],
          scholarshipApplicationSteps: [
            'Step 1: Search Oxford, college, and external funding options relevant to your nationality and course.',
            'Step 2: Confirm whether the scholarship requires a separate form or activates after an offer.',
            'Step 3: Keep financial planning documents ready because Oxford funding is not usually one simple central award.',
            'Step 4: Track offer-holder and college deadlines closely after admission decisions.',
          ],
          scholarshipHighlights: ['College and external awards', 'Funding search rather than one central undergraduate scholarship'],
        },
      ),
  },
  {
    aliases: ['massachusetts institute of technology', 'mit'],
    apply: (university) =>
      withOfficialSources(
        university,
        [
          { type: 'official', label: 'MIT international applicants', url: 'https://mitadmissions.org/apply/firstyear/international/' },
          { type: 'official', label: 'MIT dates and deadlines', url: 'https://mitadmissions.org/apply/firstyear/deadlines-requirements/' },
          { type: 'official', label: 'MIT affordability and aid', url: 'https://mitadmissions.org/afford/' },
        ],
        {
          reputationLabel: 'MIT first-year international admissions and aid pages cross-checked for testing, deadlines, and need-based support',
          standardizedPolicies: [
            { exam: 'SAT', policy: 'required', target: 1500 },
            { exam: 'AP', policy: 'recommended', target: 4 },
          ],
          scholarships: [
            {
              id: 'mit-scholarship',
              name: 'MIT Scholarship',
              type: 'need-based',
              automatic: false,
              coverage: 'Need-based funding meeting 100% of demonstrated need',
              estimatedValueUsd: 65000,
              benefits: ['High-impact need-based aid', 'Designed to cover demonstrated need rather than reward merit alone'],
              minimumGpa10: 8.8,
              targetGpa10: 9.4,
              englishThresholds: { IELTS: 7, TOEFL: 100, Duolingo: 130 },
              financialNeedEligible: ['medium', 'high'],
              leadershipPreferred: 1,
              awardsPreferred: 1,
              notes: 'MIT states that it is need blind for all applicants, including international students, and meets 100% of demonstrated need for all admitted students.',
              applicationSteps: [
                'Step 1: Submit the MIT first-year application and financial aid forms on time.',
                'Step 2: Prepare strong academic evidence, especially math and science readiness.',
                'Step 3: Submit SAT or ACT aligned evidence through MIT admissions guidance.',
                'Step 4: Complete need-based financial aid documentation after the admission application.',
                'Step 5: Track follow-up requests carefully because aid is tied to demonstrated need rather than merit ranking.',
              ],
            },
          ],
          automaticMeritScholarships: [],
          specialNotes: [
            'MIT states that it is need blind for all applicants, including international students, and meets 100% of demonstrated need for all admitted students.',
            'MIT asks first-year international applicants to follow the same process as domestic applicants and treats SAT or ACT testing as part of the admissions requirements.',
          ],
          officialApplicationSteps: [
            'Step 1: Review MIT first-year and international applicant requirements on the admissions site.',
            'Step 2: Build a high-academic application with strong math and science preparation evidence.',
            'Step 3: Submit the MIT application by the relevant Early or Regular deadline and keep testing aligned with admissions guidance.',
            'Step 4: Complete financial aid documents separately if affordability matters.',
            'Step 5: Monitor the applicant portal for interview and document updates.',
          ],
          scholarshipApplicationSteps: [
            'Step 1: Treat funding as need-based aid rather than a simple merit scholarship search.',
            'Step 2: Gather family financial documents early for aid review.',
            'Step 3: Confirm the separate financial aid submission timeline after the application.',
            'Step 4: Keep profile evidence ready because admission competitiveness still drives access to aid.',
          ],
          scholarshipHighlights: ['Need-blind admission for internationals', '100% of demonstrated need for admitted students'],
        },
      ),
  },
  {
    aliases: ['university of cambridge', 'cambridge'],
    apply: (university) =>
      withOfficialSources(
        university,
        [
          { type: 'official', label: 'Cambridge international guide', url: 'https://www.undergraduate.study.cam.ac.uk/sites/default/files/publications/uoc_2023_ug_international_guide.pdf' },
          { type: 'official', label: 'Cambridge entry requirements', url: 'https://www.undergraduate.study.cam.ac.uk/apply/before/entry-requirements' },
          { type: 'official', label: 'Cambridge international financial support', url: 'https://www.undergraduate.study.cam.ac.uk/international-students/financial-support' },
        ],
        {
          reputationLabel: 'Cambridge undergraduate international guide and financial support pages cross-checked for English, deadlines, and funding posture',
          englishRequirements: [
            { exam: 'IELTS', minimum: 7.5, target: 8 },
            { exam: 'TOEFL', minimum: 110, target: 112 },
            { exam: 'Duolingo', minimum: 145, target: 155 },
          ],
          standardizedPolicies: [],
          scholarships: [
            {
              id: 'cambridge-trust-award',
              name: 'Cambridge Trust Award',
              type: 'merit',
              automatic: false,
              coverage: 'Partial competitive funding for international undergraduates',
              estimatedValueUsd: 12000,
              benefits: ['Can reduce part of international cost', 'Useful as scholarship upside, not a default outcome'],
              minimumGpa10: 8.8,
              targetGpa10: 9.3,
              englishThresholds: { IELTS: 7.5, TOEFL: 110, Duolingo: 145 },
              leadershipPreferred: 1,
              awardsPreferred: 1,
              notes: 'Cambridge notes that only a small number of partial-cost awards are available to international undergraduates, with Cambridge Trust among the main examples.',
              applicationSteps: [
                'Step 1: Submit the Cambridge application on time for the chosen college or open application route.',
                'Step 2: Check Cambridge Trust and college funding pages after confirming course fit.',
                'Step 3: Prepare excellent academics first because international funding is limited and highly competitive.',
                'Step 4: Track any college-level funding requests after receiving an offer.',
              ],
            },
          ],
          automaticMeritScholarships: [],
          specialNotes: [
            'The Cambridge international guide says the application deadline for 2026 entry was 15 October 2025 and the university highlights very limited partial-cost awards for international undergraduates.',
            'Cambridge lists IELTS 7.5 with usually at least 7.0 in each component, or TOEFL iBT 110 with 25 in each element, on the international guide.',
          ],
          scholarshipHighlights: ['Cambridge Trust partial support', 'Limited international undergraduate funding'],
        },
      ),
  },
  {
    aliases: ['imperial college london', 'imperial'],
    apply: (university) =>
      withOfficialSources(
        university,
        [
          { type: 'official', label: 'Imperial undergraduate entry requirements', url: 'https://www.imperial.ac.uk/study/apply/undergraduate/entry-requirements/' },
          { type: 'official', label: 'Imperial English language requirements', url: 'https://www.imperial.ac.uk/study/apply/english-language/' },
          { type: 'official', label: 'Imperial tuition fees', url: 'https://www.imperial.ac.uk/study/fees-and-funding/undergraduate/tuition-fees/' },
          { type: 'official', label: 'Imperial IB Excellence Scholarship', url: 'https://www.imperial.ac.uk/study/fees-and-funding/undergraduate/bursaries-grants-scholarships/ib-excellence/' },
        ],
        {
          reputationLabel: 'Imperial entry requirements, English policy, and tuition pages cross-checked with scholarship references',
          scholarships: [
            {
              id: 'imperial-ib-excellence',
              name: 'Imperial IB Excellence Scholarship',
              type: 'merit',
              automatic: false,
              coverage: 'GBP 5,000 per year for eligible IB students',
              estimatedValueUsd: 6400,
              benefits: ['Meaningful annual tuition offset', 'Strong fit for students applying with a high IB profile'],
              minimumGpa10: 8.8,
              targetGpa10: 9.2,
              englishThresholds: { IELTS: 6.5, TOEFL: 92, Duolingo: 120 },
              awardsPreferred: 1,
              notes: 'Imperial lists the IB Excellence Scholarship as a specific undergraduate award for eligible international applicants.',
              applicationSteps: [
                'Step 1: Check the scholarship page and confirm whether your qualification path is eligible.',
                'Step 2: Keep a strong academic profile because Imperial positions this as a selective merit route.',
                'Step 3: Follow Imperial course-page fee and admissions guidance before tracking funding details.',
                'Step 4: Submit any extra scholarship materials required for the relevant entry cycle.',
              ],
            },
          ],
          specialNotes: [
            'Imperial states that English requirements are set at either a standard or higher level depending on the course, and overseas tuition is published on course pages.',
            'Imperial also highlights specific awards such as the IB Excellence Scholarship rather than one universal automatic undergraduate scholarship.',
          ],
          scholarshipHighlights: ['IB Excellence Scholarship', 'Course-level overseas fee pages'],
        },
      ),
  },
  {
    aliases: ['hanoi university of science and technology', 'truong dai hoc bach khoa ha noi', 'bach khoa ha noi', 'hust'],
    apply: (university) =>
      withOfficialSources(
        university,
        [
          { type: 'official', label: 'HUST international admissions requirements', url: 'https://ts.hust.edu.vn/en/program-cate/undergraduate-programs/requirement' },
          { type: 'official', label: 'HUST 2026 domestic admissions update', url: 'https://ts.hust.edu.vn/tin-tuc/thong-tin-tuyen-sinh-dai-hoc-chinh-quy-nam-2026' },
          { type: 'official', label: 'HUST scholarship news', url: 'https://www.hust.edu.vn/en/news/news/posco-tj-foundation-awarded-scholarship-to-hust-students-653907.html' },
        ],
        {
          city: 'Hanoi',
          reputationLabel: 'HUST admissions and scholarship information cross-checked from official 2026 admissions pages',
          englishRequirements: [
            { exam: 'IELTS', minimum: 5.5, target: 6 },
            { exam: 'TOEFL', minimum: 73, target: 80 },
            { exam: 'Duolingo', minimum: 95, target: 105 },
          ],
          scholarships: [
            {
              id: 'hust-partner-and-industry-awards',
              name: 'HUST Partner and Industry Awards',
              type: 'merit',
              automatic: false,
              coverage: 'Partner scholarships and industry-linked awards',
              estimatedValueUsd: 1000,
              benefits: ['Useful annual support', 'Can stack with a strong academic application in selected programs'],
              minimumGpa10: 7.8,
              targetGpa10: 8.5,
              englishThresholds: { IELTS: 5.5, TOEFL: 73, Duolingo: 95 },
              leadershipPreferred: 1,
              notes: 'HUST publicizes partner scholarships such as the POSCO TJ Park scholarship and other industry-linked awards for eligible students.',
              applicationSteps: [
                'Step 1: Check whether your target HUST program is Vietnamese-taught or English-taught.',
                'Step 2: Confirm the qualification route used for admission and scholarship review.',
                'Step 3: Prepare transcripts, qualification proof, and English evidence for English-taught programs.',
                'Step 4: Track program or partner-specific scholarship notices after admission.',
              ],
            },
          ],
          specialNotes: [
            'HUST lists international undergraduate requirements by qualification route and notes IELTS 5.5 or equivalent for English-taught programs, together with financial-capacity documentation for international applicants.',
            'HUST also published 2026 admissions updates and partner scholarship news on its official sites, making it a strong candidate for further manual curation later.',
          ],
          officialApplicationSteps: [
            'Step 1: Choose the HUST program and check whether it uses the international or domestic admission pathway.',
            'Step 2: Prepare the admission application form, academic documents, and qualification evidence for the correct route.',
            'Step 3: Add IELTS 5.5 or an equivalent score if you are applying to an English-taught program.',
            'Step 4: Submit financial and identity documents where required by the international pathway.',
            'Step 5: Monitor official HUST scholarship and partner-award notices after admission.',
          ],
          scholarshipHighlights: ['Partner and industry awards', 'Admissions routes differ by program and applicant profile'],
        },
      ),
  },
  {
    aliases: ['ton duc thang university', 'ton duc thang'],
    apply: (university) =>
      withOfficialSources(
        university,
        [
          { type: 'official', label: 'TDTU how to apply', url: 'https://admission.tdtu.edu.vn/en/undergraduate/How-to-apply' },
          { type: 'official', label: 'TDTU scholarships', url: 'https://admission.tdtu.edu.vn/en/undergraduate/Scholarships' },
          { type: 'official', label: 'TDTU admissions timeline', url: 'https://admission.tdtu.edu.vn/en/undergraduate/Admissions-timeline' },
        ],
        {
          city: 'Ho Chi Minh City',
          reputationLabel: 'TDTU application, scholarship, and admissions timeline pages cross-checked from the official admissions site',
          englishRequirements: [
            { exam: 'IELTS', minimum: 5.5, target: 6 },
            { exam: 'TOEFL', minimum: 70, target: 80 },
            { exam: 'Duolingo', minimum: 95, target: 105 },
          ],
          deadlines: {
            intake: 'Fall 2026',
            applicationDeadline: '2026-10-20',
            priorityDeadline: '2026-07-15',
            scholarshipDeadline: '2026-07-15',
          },
          scholarships: [
            {
              id: 'tdtu-full-scholarship',
              name: 'TDTU Full International Scholarship',
              type: 'full ride',
              automatic: false,
              coverage: '100% tuition and dormitory support for selected students',
              estimatedValueUsd: 6500,
              benefits: ['Largest institutional funding route', 'Best for students who combine strong academics with a clean early application'],
              minimumGpa10: 8.2,
              targetGpa10: 8.8,
              englishThresholds: { IELTS: 5.5, TOEFL: 70, Duolingo: 95 },
              leadershipPreferred: 1,
              awardsPreferred: 1,
              notes: 'TDTU lists full, half, and quarter scholarships for international students and publishes explicit application windows on its admissions site.',
              applicationSteps: [
                'Step 1: Submit the online application in the correct admission round.',
                'Step 2: Prepare academic records, passport, health certificate, and English evidence.',
                'Step 3: Apply early if you want access to the larger scholarship bands.',
                'Step 4: Track scholarship results together with the admissions timeline for your intake.',
              ],
            },
            {
              id: 'tdtu-partial-scholarship',
              name: 'TDTU Partial International Scholarship',
              type: 'tuition reduction',
              automatic: false,
              coverage: '25% to 50% tuition reduction',
              estimatedValueUsd: 2500,
              benefits: ['More accessible than the full scholarship', 'Still materially reduces cost for regional applicants'],
              minimumGpa10: 7.5,
              targetGpa10: 8.2,
              englishThresholds: { IELTS: 5.5, TOEFL: 70, Duolingo: 95 },
              notes: 'This models TDTU’s published half and quarter scholarship bands for international students.',
              applicationSteps: [
                'Step 1: Apply in the main admissions cycle.',
                'Step 2: Keep English proof and clean academic records ready for review.',
                'Step 3: Watch scholarship windows because TDTU publishes them separately from general inquiry pages.',
              ],
            },
          ],
          specialNotes: [
            'TDTU publishes its admissions timeline with multiple 2026 rounds, including an application window closing on 15 July 2026 for the first round and a later 20 October 2026 close for the next round.',
            'TDTU’s official scholarship page describes full, half, and quarter scholarship levels for international students.',
          ],
          scholarshipHighlights: ['Full, half, and quarter scholarships', 'Official admissions timeline with multiple rounds'],
        },
      ),
  },
  {
    aliases: ['university of economics ho chi minh city', 'ueh', 'dai hoc kinh te thanh pho ho chi minh'],
    apply: (university) =>
      withOfficialSources(
        university,
        [
          { type: 'official', label: 'UEH admissions', url: 'https://www.ueh.edu.vn/en/outreach/students/admissions/' },
          { type: 'official', label: 'UEH how to apply', url: 'https://www.ueh.edu.vn/en/how-to-apply' },
          { type: 'official', label: 'UEH international scholarship', url: 'https://www.ueh.edu.vn/en/outreach/students/admissions/international-scholarship/graduate-scholarship/' },
        ],
        {
          city: 'Ho Chi Minh City',
          reputationLabel: 'UEH admissions and international scholarship information cross-checked from official English-language admissions pages',
          englishRequirements: [
            { exam: 'IELTS', minimum: 5.5, target: 6.5 },
            { exam: 'TOEFL', minimum: 72, target: 85 },
            { exam: 'Duolingo', minimum: 100, target: 115 },
          ],
          scholarships: [
            {
              id: 'ueh-full-time-international-scholarship',
              name: 'UEH Full-Time International Scholarship',
              type: 'full ride',
              automatic: false,
              coverage: '100% tuition plus dormitory and monthly stipend support for top applicants',
              estimatedValueUsd: 7000,
              benefits: ['High value for a Vietnam-based option', 'Works especially well for budget-sensitive students with strong academics'],
              minimumGpa10: 8.2,
              targetGpa10: 8.8,
              englishThresholds: { IELTS: 5.5, TOEFL: 72, Duolingo: 100 },
              leadershipPreferred: 1,
              awardsPreferred: 1,
              notes: 'UEH states that excellent candidates can receive 100% tuition, dormitory support, and around USD 100 per month, with awards often handled on a first-come, first-served basis.',
              applicationSteps: [
                'Step 1: Review the UEH full-time program structure and target your intended pathway.',
                'Step 2: Prepare academic documents, passport, and English evidence; some programs ask for IELTS 6.0 while others start from 5.5.',
                'Step 3: Submit early because UEH notes that scholarship consideration can work on a first-come, first-served basis.',
                'Step 4: Track scholarship communication alongside the admissions process rather than waiting for a separate late-stage cycle.',
              ],
            },
          ],
          specialNotes: [
            'UEH highlights scholarships up to 100% tuition, dormitory support, and an additional monthly stipend for strong international applicants.',
            'UEH also notes that English requirements can vary by program, with some pathways accepting IELTS 5.5 and others asking for 6.0.',
          ],
          scholarshipHighlights: ['100% tuition + dormitory + stipend support', 'Program-specific English thresholds'],
        },
      ),
  },
];

export function applyPriorityUniversityEnrichments(catalogue: University[]): University[] {
  return catalogue.map((university) => {
    const normalized = normalizeName(university.name);
    const enrichment = enrichments.find((entry) =>
      entry.aliases.some((alias) => {
        const normalizedAlias = normalizeName(alias);
        return normalized === normalizedAlias || normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized);
      }),
    );
    return enrichment ? enrichment.apply(university) : university;
  });
}
