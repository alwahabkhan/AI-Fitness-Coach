// components/program-builder/ui/new/popups/CreateProgramPopup.tsx
import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface CreateProgramPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProgram: (name: string) => void;
}

export default function CreateProgramPopup({
  isOpen,
  onClose,
  onCreateProgram
}: CreateProgramPopupProps) {
  const [programName, setProgramName] = useState('');

  // Reset state whenever popup opens
  useEffect(() => {
    if (isOpen) {
      setProgramName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (programName.trim()) {
      onCreateProgram(programName.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-lg p-6 relative">
        <h2 className="text-2xl font-normal mb-6 text-center">Add a Program</h2>

        {/* Input Row */}
        <div className="flex items-center gap-3 mb-6">
          {/* Close button */}
          <button
            className="text-[#BD002A] border border-gray-300 flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Input */}
          <input
            type="text"
            placeholder="Enter name of program ..."
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#98CBFF]"
            autoFocus
          />

          {/* Check button */}
          <button
            className="text-[#009A12] border border-gray-300 flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:bg-gray-200 disabled:hover:bg-gray-200 disabled:cursor-not-allowed"
            onClick={handleCreate}
            disabled={!programName.trim()}
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}