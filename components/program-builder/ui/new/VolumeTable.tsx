'use client';

import { useEffect, useState } from 'react';
import VolumeTableDesktop from './VolumeTableDesktop';
import VolumeTableMobile from './VolumeTableMobile';
import { MuscleGroupVolume } from '../../PLACEHOLDER';

interface VolumeTableProps {
  volumeData: MuscleGroupVolume[];
  dayCount: number;
}

export default function VolumeTable(props: VolumeTableProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile ? <VolumeTableMobile {...props} /> : <VolumeTableDesktop {...props} />;
}