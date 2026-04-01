import { describe, expect, it } from 'vitest';
import { studentProfiles, universityCatalogue } from '../../components/university-fit/data';
import { buildGoalTracker, buildOpportunityUnlocks, buildUniversityMatches } from '../../components/university-fit/engine';

describe('university fit engine', () => {
  it('builds ranked university matches with explainable outputs', () => {
    const profile = studentProfiles[0];
    const results = buildUniversityMatches(profile, universityCatalogue);

    expect(results).toHaveLength(universityCatalogue.length);
    expect(results[0].overallFitScore).toBeGreaterThanOrEqual(results[1].overallFitScore);
    expect(results[0].scoreBreakdown.academic).toBeGreaterThan(0);
    expect(results[0].checklist.length).toBeGreaterThan(5);
    expect(results[0].bestNextMove.length).toBeGreaterThan(10);
  });

  it('flags major mismatch as a hard blocker for incompatible universities', () => {
    const businessProfile = studentProfiles.find((item) => item.id === 'minh-business');
    expect(businessProfile).toBeTruthy();

    const results = buildUniversityMatches(businessProfile!, universityCatalogue);
    const kaist = results.find((item) => item.university.id === 'kaist');

    expect(kaist).toBeTruthy();
    expect(kaist!.hardBlockers.some((item) => item.shortLabel === 'Major')).toBe(true);
    expect(kaist!.matchLabel).toMatch(/Ambitious|Not Yet Ready/);
  });

  it('creates reusable goals and improvement unlock suggestions', () => {
    const profile = studentProfiles[0];
    const results = buildUniversityMatches(profile, universityCatalogue);
    const goals = buildGoalTracker(results);
    const unlocks = buildOpportunityUnlocks(profile, universityCatalogue);

    expect(goals.length).toBeGreaterThan(0);
    expect(goals.some((goal) => goal.category === 'english' || goal.category === 'academic')).toBe(true);
    expect(unlocks.length).toBeGreaterThan(0);
    expect(unlocks[0].admissionGain + unlocks[0].scholarshipGain + unlocks[0].unlockedScholarships).toBeGreaterThan(0);
  });
});
