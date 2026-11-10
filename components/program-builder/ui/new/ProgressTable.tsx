'use client';

import { useEffect, useState } from 'react';
import ProgressTableDesktop from './ProgressTableDesktop';
import ProgressTableMobile from './ProgressTableMobile';
import { MuscleGroupProgress } from '../../utils/progressCalculations';

interface ProgressTableProps {
  progressData: MuscleGroupProgress[];
  mode: 'weight' | 'reps' | 'normalized' | 'percentage';
}

export default function ProgressTable(props: ProgressTableProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const normalizedProps = {
    ...props,
    mode: props.mode === 'percentage' ? 'normalized' : props.mode
  } as const;

  return isMobile ? <ProgressTableMobile {...normalizedProps} /> : <ProgressTableDesktop {...normalizedProps} />;
}