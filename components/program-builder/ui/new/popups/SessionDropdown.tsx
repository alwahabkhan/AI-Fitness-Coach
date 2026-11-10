// components/program-builder/ui/new/popups/SessionDropdown.tsx
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SessionDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  currentDay: { order: number; name?: string };
  currentSessionNumber: number;
  availableSessions: number[];
  onSessionChange: (sessionNumber: number) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export default function SessionDropdown({
  isOpen,
  onClose,
  currentDay,
  currentSessionNumber,
  availableSessions,
  onSessionChange,
  anchorRef
}: SessionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position based on anchor element
  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const dropdownWidth = 240; // approximate min-width
      
      // Calculate left position, centering below the anchor
      let left = rect.left + (rect.width / 2) - (dropdownWidth / 2);
      
      // Ensure dropdown doesn't go off-screen on the left
      if (left < 8) left = 8;
      
      // Ensure dropdown doesn't go off-screen on the right
      const maxLeft = window.innerWidth - dropdownWidth - 8;
      if (left > maxLeft) left = maxLeft;

      setPosition({
        top: rect.bottom + 8,
        left: left
      });
    }
  }, [isOpen, anchorRef]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (dropdownRef.current?.contains(target)) {
        const isButton =
          (target as HTMLElement).tagName === 'BUTTON' ||
          (target as HTMLElement).closest('button');
        if (isButton) return;
      }

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  // Ensure unique session numbers and filter/sort
  const completedSessions = Array.from(new Set(availableSessions))
    .filter((s) => s > 0)
    .sort((a, b) => a - b);

  const upNextSessionNumber =
    completedSessions.length > 0 ? Math.max(...completedSessions) + 1 : 1;
  const followingSessionNumber = upNextSessionNumber + 1;

  const isViewingUpNext = currentSessionNumber === upNextSessionNumber;
  const isViewingFollowing = currentSessionNumber === followingSessionNumber;

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'fixed bg-white border border-gray-200 rounded-xl shadow-lg z-50',
        'p-6 min-w-[240px]',
        'flex flex-col gap-3'
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Header */}
      <div className="text-base font-medium text-slate-900">
        Day {currentDay.order.toString().padStart(2, '0')}
      </div>

      {/* Sessions Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Completed Session Buttons */}
        {completedSessions.map((sessionNum) => (
          <button
            key={`session-${sessionNum}`}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSessionChange(sessionNum);
              onClose();
            }}
            className={cn(
              'p-1.5 w-10 h-10 text-base rounded-lg border transition-all cursor-pointer',
              'border border-[#CFD9E0]',
              currentSessionNumber === sessionNum
                ? 'bg-blue-100 border-blue-300'
                : 'hover:bg-gray-50'
            )}
          >
            #{sessionNum}
          </button>
        ))}

        {/* Up Next Button */}
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSessionChange(upNextSessionNumber);
            setTimeout(() => onClose(), 0);
          }}
          className={cn(
            'px-3 py-1.5 text-sm rounded-lg border transition-all cursor-pointer h-10',
            'border border-[#CFD9E0]',
            isViewingUpNext
              ? 'bg-green-100 border-green-300 text-green-700 font-medium'
              : 'text-green-600 hover:bg-green-50'
          )}
        >
          Up Next
        </button>

        {/* Following Button */}
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSessionChange(followingSessionNumber);
            setTimeout(() => onClose(), 0);
          }}
          className={cn(
            'px-3 py-1.5 text-sm rounded-lg border transition-all cursor-pointer h-10',
            'border border-[#CFD9E0]',
            isViewingFollowing
              ? 'bg-gray-100 border-gray-300 text-gray-700 font-medium'
              : 'text-gray-500 hover:bg-gray-50'
          )}
        >
          Following
        </button>
      </div>
    </div>
  );
}