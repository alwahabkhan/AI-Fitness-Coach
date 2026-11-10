// components/program-builder/ui/new/VolumeTable.tsx
import { MuscleGroupVolume } from '../../PLACEHOLDER';

interface VolumeTableProps {
  volumeData: MuscleGroupVolume[];
  dayCount: number;
}

export default function VolumeTable({
  volumeData,
  dayCount
}: VolumeTableProps) {
  const maxDaysToShow = Math.min(dayCount, 7);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-128 w-full table-auto border-separate text-center border-spacing-y-4">
        <thead className="text-sm text-[#747474]">
          <tr>
            <th className="w-[25%] font-normal text-left">Muscle Group</th>
            <th className="w-[12%] font-normal">Total per week</th>
            {Array.from({ length: maxDaysToShow }, (_, i) => (
              <th key={i} className="font-normal">
                Day {i + 1}
              </th>
            ))}
            <th className="w-[10%] font-normal">Total</th>
          </tr>
        </thead>
        <tbody>
          {volumeData.map((muscle) => (
            <tr key={muscle.name}>
              <td className="text-[#012B59] text-left">{muscle.name}</td>
              <td>
                <div
                  className="w-full h-13 rounded-lg flex items-center justify-center font-semibold text-white"
                  style={{ backgroundColor: muscle.color }}
                >
                  {muscle.totalPerWeek.toFixed(1)}
                </div>
              </td>
              {muscle.dailyVolumes
                .slice(0, maxDaysToShow)
                .map((volume, index) => (
                  <td key={index}>{volume > 0 ? volume.toFixed(1) : '-'}</td>
                ))}
              <td className="font-semibold">{muscle.total.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
