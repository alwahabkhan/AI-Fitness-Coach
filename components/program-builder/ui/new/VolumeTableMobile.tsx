import { MuscleGroupVolume } from '../../PLACEHOLDER';

interface VolumeTableProps {
  volumeData: MuscleGroupVolume[];
  dayCount: number;
}

export default function VolumeTableMobile({ volumeData, dayCount }: VolumeTableProps) {
  const maxDaysToShow = Math.min(dayCount, 7);

  return (
    <div className="space-y-6">
      {volumeData.map((muscle) => (
        <div key={muscle.name}>
          {/* Muscle Group Heading */}
          <h1 className="text-left text-sm opacity-60 mb-4">Muscle Group</h1>
          
          {/* Details of Muscle Group */}
          <div>
            <h1 className="text-blue-900 opacity-70 mb-3">{muscle.name}</h1>
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="opacity-60 text-xs font-normal">Total Per week</th>
                  {muscle.dailyVolumes.slice(0, maxDaysToShow).map((_, index) => (
                    <th key={index} className="opacity-60 text-xs font-normal">Day {index + 1}</th>
                  ))}
                  <th className="opacity-60 text-xs font-normal">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div 
                      className="rounded-lg w-24 h-10 flex items-center justify-center font-bold text-white"
                      style={{ backgroundColor: muscle.color }}
                    >
                      {muscle.totalPerWeek.toFixed(1)}
                    </div>
                  </td>
                  {muscle.dailyVolumes.slice(0, maxDaysToShow).map((volume, index) => (
                    <td key={index}>{volume > 0 ? volume.toFixed(1) : '-'}</td>
                  ))}
                  <td className="font-semibold">{muscle.total.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}