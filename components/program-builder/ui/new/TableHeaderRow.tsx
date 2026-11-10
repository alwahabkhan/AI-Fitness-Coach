/* eslint-disable @typescript-eslint/no-explicit-any */
// components/program-builder/ui/new/TableHeaderRow.tsx
import { useState, useRef } from "react";
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Pencil } from 'lucide-react';
import WhitePlus from '../icons/WhitePlus';
import Delete from '../icons/Delete';
import { TrainingDay } from '../../PLACEHOLDER';
import AddExercisePopup from "./popups/AddExercisePopup";
import EditDayNamePopup from "./popups/EditDayNamePopup";
import SessionDropdown from './popups/SessionDropdown';

interface TableHeaderRowProps {
  currentDay: TrainingDay;
  currentSessionNumber: number;
  availableSessions: number[];
  onSessionChange: (sessionNumber: number) => void;
  onAddExercise: () => void;
  onAddExerciseData: (exerciseData: any) => void;
  onAddMultipleExercises: () => void;
  onDeleteDay: () => void;
  onUpdateDay: (dayId: string, updates: { name: string }) => void;
  showInitialValues: boolean;
  mode: 'create' | 'edit' | 'sessions';
  isCompleted?: boolean;
  sessionStatus?: 'in_progress' | 'completed' | 'cancelled';
  userRole?: 'trainer' | 'trainee' | 'admin';
  traineeId?: string;
  isTraineeEditMode?: boolean;
  onRequestEditMode?: () => void;
}

export default function TableHeaderRow({
  currentDay,
  currentSessionNumber,
  availableSessions,
  onSessionChange,
  onAddExerciseData,
  onAddMultipleExercises,
  onDeleteDay,
  onUpdateDay,
  showInitialValues,
  mode,
  isCompleted = false,
  sessionStatus,
  userRole,
  traineeId,
  isTraineeEditMode = false,
  onRequestEditMode
}: TableHeaderRowProps) {
  const [isAddExercisePopupOpen, setIsAddExercisePopupOpen] = useState(false);
  const [isEditNamePopupOpen, setIsEditNamePopupOpen] = useState(false);
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);
  const sessionSpanRef = useRef<HTMLSpanElement>(null);

  const handleAddExercise = (exerciseData: any) => {
    onAddExerciseData(exerciseData);
    setIsAddExercisePopupOpen(false);
  };

  const handleUpdateName = (newName: string) => {
    onUpdateDay(currentDay.id, { name: newName });
    setIsEditNamePopupOpen(false);
  };

  const getSessionLabel = () => {
    if (showInitialValues) return 'Initial';

    const completedSessions = availableSessions.filter(s => s > 0);
    const upNextSessionNumber = completedSessions.length > 0 ? Math.max(...completedSessions) + 1 : 1;
    const followingSessionNumber = upNextSessionNumber + 1;

    if (currentSessionNumber === upNextSessionNumber) {
      return 'Up Next';
    } else if (currentSessionNumber === followingSessionNumber) {
      return 'Following';
    } else {
      return `#${currentSessionNumber.toString().padStart(2, '0')}`;
    }
  };

  const SessionNavigation = () => (
    <div className="relative flex items-center gap-3 text-xs text-slate-900">
      <button
        onClick={() => {
          const currentIndex = availableSessions.indexOf(currentSessionNumber);
          if (currentIndex > 0) {
            onSessionChange(availableSessions[currentIndex - 1]);
          }
        }}
        className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={availableSessions.indexOf(currentSessionNumber) <= 0}
        aria-label="Previous session"
      >
        <ArrowLeft size={16} />
      </button>

      <span
        ref={sessionSpanRef}
        className="cursor-pointer hover:bg-gray-100 px-3 py-1 rounded transition-all min-w-[60px] text-center"
        onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}
      >
        {getSessionLabel()}
      </span>

      <button
        onClick={() => {
          const currentIndex = availableSessions.indexOf(currentSessionNumber);
          if (currentIndex < availableSessions.length - 1) {
            onSessionChange(availableSessions[currentIndex + 1]);
          }
        }}
        className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={availableSessions.indexOf(currentSessionNumber) >= availableSessions.length - 1}
        aria-label="Next session"
      >
        <ArrowRight size={16} />
      </button>

      <SessionDropdown
        isOpen={isSessionDropdownOpen}
        onClose={() => setIsSessionDropdownOpen(false)}
        currentDay={currentDay}
        currentSessionNumber={currentSessionNumber}
        availableSessions={availableSessions}
        onSessionChange={onSessionChange}
        anchorRef={sessionSpanRef}
      />
    </div>
  );

  const DayName = ({ className = "" }: { className?: string }) => (
      <div className={cn("flex items-center gap-2 font-semibold", className)}>
        <span className="text-sm md:text-base">
          {currentDay?.name || `Day ${currentDay?.order.toString().padStart(2, '0') || '01'}`}
        </span>
        {mode === 'edit' && !isCompleted && (userRole === 'trainer' || userRole === 'admin' || (userRole === 'trainee' && isTraineeEditMode)) && (
          <button
            onClick={() => setIsEditNamePopupOpen(true)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50"
            aria-label="Edit day name"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
    );

  const ActionButtons = ({ layout }: { layout: 'mobile' | 'desktop' }) => {
    if (mode !== "edit" || isCompleted || sessionStatus === 'completed') {
      return null;
    }

    // For trainees, show edit mode button if not in edit mode
    if (userRole === 'trainee' && !isTraineeEditMode && onRequestEditMode) {
      return (
        <button
          className="flex items-center justify-center gap-2 bg-blue-500 text-white rounded-md px-4 py-2 hover:bg-blue-600 transition-colors text-sm font-medium whitespace-nowrap w-full md:w-auto cursor-pointer"
          onClick={onRequestEditMode}
        >
          <Pencil size={16} />
          <span>Edit</span>
        </button>
      );
    }

    // Check if trainee is in edit mode or user is trainer/admin
    const canEdit = userRole === 'trainer' || userRole === 'admin' || (userRole === 'trainee' && isTraineeEditMode);

    if (layout === 'mobile') {
      return (
        <div className="flex flex-col gap-2 w-full">
          {(userRole === 'trainer' || userRole === 'admin') && (
            <button
              className="flex items-center justify-center gap-2 bg-blue-500 text-white rounded-md px-4 py-2 hover:bg-blue-600 transition-colors w-full text-sm font-medium"
              onClick={onAddMultipleExercises}
            >
              <WhitePlus />
              <span>Quick Add</span>
            </button>
          )}

          <div className="flex items-center gap-2 w-full">
            {canEdit && (
              <button
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#CFD9E0] rounded-md px-4 py-2 shadow-sm hover:shadow-md transition-all text-sm"
                onClick={() => setIsAddExercisePopupOpen(true)}
              >
                <span>Add an Exercise</span>
              </button>
            )}

            {(userRole === 'trainer' || userRole === 'admin') && (
              <button
                className='p-2 hover:scale-95 transition-all'
                onClick={onDeleteDay}
                aria-label="Delete day"
              >
                <Delete />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Desktop layout
    return (
      <>
        {(userRole === 'trainer' || userRole === 'admin') && (
          <button
            className="flex items-center justify-center gap-2 bg-blue-500 text-white rounded-md px-4 py-2 hover:bg-blue-600 transition-colors text-sm font-medium whitespace-nowrap"
            onClick={onAddMultipleExercises}
          >
            <WhitePlus />
            <span>Quick Add</span>
          </button>
        )}

        {canEdit && (
          <button
            className="flex items-center justify-center gap-2 bg-white border border-[#CFD9E0] rounded-md px-4 py-2 shadow-sm hover:shadow-md transition-all text-sm whitespace-nowrap"
            onClick={() => setIsAddExercisePopupOpen(true)}
          >
            <span>Add an Exercise</span>
          </button>
        )}

        {(userRole === 'trainer' || userRole === 'admin') && (
          <button
            className='p-1 hover:scale-95 transition-all'
            onClick={onDeleteDay}
            aria-label="Delete day"
          >
            <Delete />
          </button>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile Layout */}
      <div className="flex md:hidden flex-col gap-3">
        <div className="flex items-center justify-between">
          <DayName />
          {(mode === "sessions" || mode === "edit") && <SessionNavigation />}
        </div>
        <ActionButtons layout="mobile" />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between gap-4">
        <DayName />
        <div className="flex items-center gap-3">
          {(mode === "sessions" || mode === "edit") && <SessionNavigation />}
          <ActionButtons layout="desktop" />
        </div>
      </div>

      {/* Popups */}
      <AddExercisePopup
        isOpen={isAddExercisePopupOpen}
        onClose={() => setIsAddExercisePopupOpen(false)}
        onAddExercise={handleAddExercise}
        traineeId={traineeId}
      />
      <EditDayNamePopup
        isOpen={isEditNamePopupOpen}
        currentName={currentDay?.name || ''}
        onClose={() => setIsEditNamePopupOpen(false)}
        onSave={handleUpdateName}
      />
    </div>
  );
}