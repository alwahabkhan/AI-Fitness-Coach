import { MuscleGroupProgress } from '../../utils/progressCalculations';
import ProgressChart from './ProgressChart';

interface ProgressTableProps {
  progressData: MuscleGroupProgress[];
  mode: 'weight' | 'reps' | 'normalized';
}

export default function ProgressTable({ progressData, mode }: ProgressTableProps) {

  if (progressData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No training session data available yet.</p>
        <p className="text-sm mt-2">Complete some training sessions to see progress tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {progressData.map((muscleGroup) => {
        return (
          <div key={muscleGroup.muscleName} className="overflow-hidden flex flex-col md:flex-row">
            <div className="w-full md:w-1/4 p-6 flex items-center justify-start">
              <span className="font-semibold text-[#012B59] text-lg">{muscleGroup.muscleName}</span>
            </div>
            <div className="w-full md:w-3/4 p-4">
              <ProgressChart 
                series={muscleGroup.series}
                mode={mode}
                muscleName={muscleGroup.muscleName}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}