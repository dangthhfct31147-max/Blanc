import React from 'react';
import UniversityFitFeature from '../components/university-fit/UniversityFitFeature';
import { usePageMeta } from '../hooks/usePageMeta';

const UniversityFitPage: React.FC = () => {
  usePageMeta({
    title: 'University Fit',
    description: 'Find best-fit universities, compare scholarships, and turn admission gaps into actionable goals.',
  });

  return <UniversityFitFeature />;
};

export default UniversityFitPage;
