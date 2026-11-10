"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";

interface TopBarProps {
  trainingDayId: string;
}

interface TrainingDayData {
  name: string;
  program: {
    name: string;
  };
  day_order: number;
}

export default function TopBar({ trainingDayId }: TopBarProps) {
  const router = useRouter();
  const [trainingDay, setTrainingDay] = useState<TrainingDayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrainingDay = async () => {
      try {
        const response = await fetch(`/api/training-day/${trainingDayId}/execute`);
        if (!response.ok) throw new Error('Failed to fetch training day');
        
        const data = await response.json();
        setTrainingDay(data.trainingDay);
      } catch (error) {
        console.error('Error fetching training day:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainingDay();
  }, [trainingDayId]);

  const handleBack = () => {
    router.push('/trainee');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-between px-4 py-3 mb-4 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <ArrowLeft className="w-5 h-5 text-gray-700 cursor-pointer" onClick={handleBack} />
          <div className="animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 mb-4 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <ArrowLeft className="w-5 h-5 text-gray-700 cursor-pointer" onClick={handleBack} />
        <div>
          <h1 className="text-sm font-semibold text-gray-900">
            {trainingDay?.program.name || 'Loading...'}
          </h1>
          <p className="text-xs text-gray-500">
            {trainingDay?.name || 'Day 1'} • Session 1
          </p>
        </div>
      </div>

      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
        In Progress
      </span>
    </div>
  );
}