import { MuscleGroupProgress } from '../../utils/progressCalculations';
import ProgressChart from './ProgressChart';

interface ProgressTableProps {
  progressData: MuscleGroupProgress[];
  mode: 'weight' | 'reps' | 'normalized';
}

export default function ProgressTableMobile({ progressData, mode }: ProgressTableProps) {
  if (progressData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No training session data available yet.</p>
        <p className="text-sm mt-2">Complete some training sessions to see progress tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {progressData.map((muscleGroup) => (
        <div key={muscleGroup.muscleName} className="overflow-hidden">
          <div className="p-4">
            <span className="font-semibold text-[#012B59] text-lg">{muscleGroup.muscleName}</span>
          </div>
          <div className="p-4">
            <ProgressChart
              series={muscleGroup.series}
              mode={mode}
              muscleName={muscleGroup.muscleName}
            />
          </div>
        </div>
      ))}
    </div>
  );
}