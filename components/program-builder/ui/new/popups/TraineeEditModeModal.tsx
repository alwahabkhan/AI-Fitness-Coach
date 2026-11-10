import { X } from 'lucide-react';

interface TraineeEditModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  programName?: string;
}

export default function TraineeEditModeModal({
  isOpen,
  onClose,
  onConfirm,
  programName
}: TraineeEditModeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white w-full max-w-sm rounded-lg p-5 relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black cursor-pointer transition-colors"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900 mb-3 pr-6">
          Edit Program
        </h2>
        
        <p className="text-sm text-gray-600 mb-4">
          You can add or edit exercises. Changes will be saved immediately.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

