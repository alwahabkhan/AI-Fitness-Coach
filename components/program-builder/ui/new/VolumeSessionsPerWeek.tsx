// components/program-builder/ui/new/VolumeSessionsPerWeek.tsx
import { cn } from "@/lib/utils";

interface VolumeSessionsPerWeekProps {
  sessionsPerWeek: number;
  onSessionsChange: (sessions: number) => void;
}

export default function VolumeSessionsPerWeek({ 
  sessionsPerWeek, 
  onSessionsChange 
}: VolumeSessionsPerWeekProps) {
    return <div className="flex items-center gap-4 w-fit md:w-auto mx-auto md:mx-none mb-4">
        <span className="text-sm text-[#747474]">
            Sessions Per Week
        </span>
        <input 
            type="number" 
            min="1"
            max="7"
            value={sessionsPerWeek}
            onChange={(e) => onSessionsChange(parseInt(e.target.value) || 1)}
            className={cn(
                "border border-[#CFD9E0] no_input_number_arrows rounded-md max-w-18 px-3 py-1.5 text-center outline-none ring-offset-0 focus:ring-2 focus:ring-[#3B82F6] transition-all font-semibold",
            )}
        />
    </div>
}