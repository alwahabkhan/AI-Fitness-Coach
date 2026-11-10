import { X } from 'lucide-react';

// Helper to get letter badge for R+ option
const getRPlusLetter = (option: number): string => {
  const letters: Record<number, string> = { 1: 'A', 2: 'B', 3: 'C' };
  return letters[option] || 'A';
};

interface RPlusPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentOption: number;
  repsProgression?: number;
  onSelectOption: (option: number) => void;
}

export default function RPlusPopup({
  isOpen,
  onClose,
  currentOption,
  repsProgression = 0,
  onSelectOption
}: RPlusPopupProps) {
  if (!isOpen) return null;

  const options = [
    { value: 1, label: `Add ${repsProgression} to all sets` },
    { value: 2, label: `Add ${repsProgression} to weakest set` },
    { value: 3, label: `Add ${repsProgression} to 2 weakest sets` }
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-md rounded-lg p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black cursor-pointer"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-normal mb-4 text-center">Rep Progression Style</h2>

        {/* Options */}
        <div className="space-y-2 mb-4">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onSelectOption(option.value);
                onClose();
              }}
              className={`w-full text-left px-4 py-3 rounded-md text-sm transition-all border flex items-center gap-2 ${
                currentOption === option.value
                  ? 'bg-blue-500 text-white border-blue-500 font-medium'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
            >
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${
                currentOption === option.value
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {getRPlusLetter(option.value)}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}