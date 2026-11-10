// components/program-builder/ui/new/popups/AddNotePopup.tsx
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddNotePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (note: string) => void;
  initialNote?: string;
}

export default function AddNotePopup({
  isOpen,
  onClose,
  onSaveNote,
  initialNote = ''
}: AddNotePopupProps) {
  const [note, setNote] = useState('');

  // Reset state whenever popup opens
  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
    }
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  const handleSaveNote = () => {
    onSaveNote(note);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-lg p-6 relative">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black cursor-pointer"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-normal mb-4 text-center">Add a Note</h2>

        {/* Note Textarea */}
        <div className="mb-4">
          <textarea
            placeholder="Enter your note here..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#98CBFF] resize-none"
            rows={4}
          />
        </div>

        {/* Action Buttons */}
        <button
          onClick={handleSaveNote}
          className={cn(
            'gap-2 bg-white border border-[#CFD9E0] rounded-[6px] px-6 py-2',
            'cursor-pointer transition-all',
            'hover:shadow-md',
            'w-full flex items-center justify-center'
          )}
        >
          Save Note
        </button>
      </div>
    </div>
  );
}
