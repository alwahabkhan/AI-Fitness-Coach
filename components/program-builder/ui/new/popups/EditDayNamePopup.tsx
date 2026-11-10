import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EditDayNamePopupProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export default function EditDayNamePopup({
  isOpen,
  currentName,
  onClose,
  onSave
}: EditDayNamePopupProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white w-full max-w-md rounded-lg p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black cursor-pointer"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold mb-4">Edit Day Name</h2>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Day Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(name);
              if (e.key === 'Escape') onClose();
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Leg Day"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}