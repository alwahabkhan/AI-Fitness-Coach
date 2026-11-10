import { cn } from "@/lib/utils";

interface ProgressModeSwitcherProps {
  mode: 'weight' | 'reps' | 'normalized' | 'percentage';
  onModeChange: (mode: 'weight' | 'reps' | 'normalized' | 'percentage') => void;
}

export default function ProgressModeSwitcher({ mode, onModeChange }: ProgressModeSwitcherProps) {
  const modes = [
    { value: 'weight' as const, label: 'Weights' },
    { value: 'reps' as const, label: 'Reps' },
    { value: 'normalized' as const, label: 'Normalized' },
    { value: 'percentage' as const, label: 'Percentage' }
  ];

  return (
    <div className="flex items-center gap-2 w-full md:w-auto">
        {modes.map(({ value, label }) => (
          <button
            key={value}
            className={cn(
              "px-3 py-1.5 text-sm font-[500] cursor-pointer transition-all select-none w-1/4 md:w-auto border border-gray-200 rounded-md",
              mode === value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-[#909090]",
              mode === value ? "hover:shadow-sm" : "hover:bg-[#F1F5F9]/50 hover:shadow-sm"
            )}
            onClick={() => onModeChange(value)}
          >
            {label}
          </button>
        ))}
    </div>
  );
}