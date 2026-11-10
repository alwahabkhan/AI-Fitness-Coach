// components/program-builder/ui/new/popups/SelectClientPopup.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { UserWithoutPassword } from '@/lib/auth';
import AddUser from '../../icons/AddUser';
import { cn } from '@/lib/utils';

interface SelectClientPopupProps {
  isOpen: boolean;
  trainees: UserWithoutPassword[];
  onClose: () => void;
  onSelect: (trainee: UserWithoutPassword) => void;
}

export default function SelectClientPopup({
  isOpen,
  trainees,
  onClose,
  onSelect
}: SelectClientPopupProps) {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selected, setSelected] = useState<UserWithoutPassword | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredTrainees = useMemo(() => {
    if (!query.trim()) return trainees;
    return trainees.filter(
      (t) =>
        t.name.toLowerCase().includes(query.toLowerCase()) ||
        t.email.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, trainees]);

  // Reset state whenever popup opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightedIndex(0);
      setSelected(null);
      setShowDropdown(false);
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown && e.key !== 'Enter') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filteredTrainees.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTrainees[highlightedIndex]) {
        const trainee = filteredTrainees[highlightedIndex];
        setSelected(trainee);
        setQuery(trainee.name);
        setShowDropdown(false);
      }
    }
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

        <h2 className="text-2xl font-normal mb-4">Select Trainee</h2>

        {/* Search input with dropdown */}
        <div className="flex gap-2 mb-4 relative" ref={wrapperRef}>
          <input
            type="text"
            placeholder="Search trainees..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[#98CBFF]"
          />
          <button
            disabled={!selected}
            onClick={() => {
              if (selected) onSelect(selected);
            }}
            className={cn(
              'w-10 bg-white border border-gray-300 rounded-md flex items-center justify-center cursor-pointer',
              'hover:bg-gray-100',
              'disabled:opacity-40 disabled:bg-gray-200 disabled:hover:bg-gray-200 disabled:cursor-not-allowed'
            )}
          >
            <AddUser />
          </button>

          {/* Dropdown */}
          {showDropdown && filteredTrainees.length > 0 && (
            <div
              className={cn(
                "absolute top-full left-0 mt-2",
                "bg-white border-5 border-white rounded-md shadow-xl z-10 overflow-y-auto",
                "flex flex-col"
            )}
              style={{ 
                width: 'calc(100% - 48px)', 
                boxShadow: '0px 0px 36px rgba(25, 37, 50, 0.2)' 
                }}

            >
              {filteredTrainees.map((trainee, i) => (
                <div
                  key={trainee.id}
                  className={`text-left px-2 py-1.5 cursor-pointer ${
                    i === highlightedIndex ? 'bg-gray-200' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur
                    setSelected(trainee);
                    setQuery(trainee.name);
                    setShowDropdown(false);
                  }}
                >
                  <span>{trainee.name}</span>
                  {/* <div className="font-medium">{trainee.name}</div>
                  <div className="text-sm text-gray-500">{trainee.email}</div> */}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
