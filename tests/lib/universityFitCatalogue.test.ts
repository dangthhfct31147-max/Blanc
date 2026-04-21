import { describe, expect, it } from 'vitest';
import { universityCatalogue } from '../../components/university-fit/data';
import { theWorldTop100_2026, webometricsVietnamTop100_Jan2026 } from '../../components/university-fit/generatedRankings';

describe('university fit catalogue expansion', () => {
  it('loads 100 world rows and 100 Vietnam rows from generated ranking sources', () => {
    expect(theWorldTop100_2026).toHaveLength(100);
    expect(webometricsVietnamTop100_Jan2026).toHaveLength(100);
  });

  it('expands the catalogue without breaking curated universities', () => {
    expect(universityCatalogue.length).toBeGreaterThanOrEqual(200);
    expect(universityCatalogue.some((item) => item.id === 'asu')).toBe(true);
    expect(universityCatalogue.some((item) => item.name === 'University of Oxford')).toBe(true);
    expect(universityCatalogue.some((item) => item.name.includes('Vietnam National University Hanoi'))).toBe(true);
  });

  it('marks priority schools as hybrid when official links are attached on top of generated defaults', () => {
    const prioritySchoolFragments = [
      'University of Oxford',
      'Massachusetts Institute of Technology',
      'University of Cambridge',
      'Ton Duc Thang University',
      'University of Economics Ho Chi Minh City',
    ];

    for (const schoolFragment of prioritySchoolFragments) {
      const university = universityCatalogue.find((item) => item.name.includes(schoolFragment));
      expect(university).toBeTruthy();
      expect(university?.dataQuality).toBe('hybrid');
      expect((university?.profileSources ?? []).length).toBeGreaterThan(0);
    }
  });

  it('keeps every catalogue entry usable by the fit engine', () => {
    const ids = new Set<string>();

    for (const university of universityCatalogue) {
      expect(ids.has(university.id)).toBe(false);
      ids.add(university.id);

      expect(university.name.length).toBeGreaterThanOrEqual(3);
      expect(university.country.length).toBeGreaterThan(1);
      expect(university.city.length).toBeGreaterThan(1);
      expect(university.availableMajors.length).toBeGreaterThan(0);
      expect(university.majorClusters.length).toBeGreaterThan(0);
      expect(university.englishRequirements.length).toBeGreaterThan(0);
      expect(university.scholarships.length).toBeGreaterThan(0);
      expect(university.documentRequirements.length).toBeGreaterThan(0);
      expect(university.officialApplicationSteps.length).toBeGreaterThan(0);
      expect(university.scholarshipApplicationSteps.length).toBeGreaterThan(0);
      expect(university.tuitionRangeUsd.max).toBeGreaterThanOrEqual(university.tuitionRangeUsd.min);
      expect(university.livingCostRangeUsd.max).toBeGreaterThanOrEqual(university.livingCostRangeUsd.min);
      expect(university.minimumAcademicRequirements.targetGpa10).toBeGreaterThanOrEqual(
        university.minimumAcademicRequirements.minGpa10,
      );
    }
  });
});
