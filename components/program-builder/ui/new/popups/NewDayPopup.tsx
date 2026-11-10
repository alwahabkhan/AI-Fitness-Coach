import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { UserWithoutPassword } from '@/lib/auth';
import { cn } from '@/lib/utils';
import BlackPlus from '../../icons/BlackPlus';
import DownCaretInput from '../../icons/DownCaretInput';

interface NewDayPopupProps {
  isOpen: boolean;
  trainees: UserWithoutPassword[];
  currentProgramId?: string;
  onClose: () => void;
  onAddDay: () => void;
  onCopyDay: (sourceDayId: string) => void;
}

interface Program {
  id: string;
  name: string;
  trainee_id: string;
}

interface TrainingDay {
  id: string;
  name: string;
  day_order: number;
  program_id: string;
}

function NewDayPopupContent({
  isOpen,
  trainees,
  currentProgramId,
  onClose,
  onAddDay,
  onCopyDay
}: NewDayPopupProps) {
  const [traineeQuery, setTraineeQuery] = useState('');
  const [programQuery, setProgramQuery] = useState('');
  const [traineeHighlightedIndex, setTraineeHighlightedIndex] = useState(0);
  const [programHighlightedIndex, setProgramHighlightedIndex] = useState(0);
  const [selectedTrainee, setSelectedTrainee] = useState<UserWithoutPassword | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showTraineeDropdown, setShowTraineeDropdown] = useState(false);
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const traineeInputRef = useRef<HTMLInputElement>(null);
  const programInputRef = useRef<HTMLInputElement>(null);
  const traineeDropdownRef = useRef<HTMLDivElement>(null);
  const programDropdownRef = useRef<HTMLDivElement>(null);

  const filteredTrainees = useMemo(() => {
    if (!traineeQuery.trim()) return trainees;
    return trainees.filter(
      (t) =>
        t.name.toLowerCase().includes(traineeQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(traineeQuery.toLowerCase())
    );
  }, [traineeQuery, trainees]);

  const filteredPrograms = useMemo(() => {
    if (!programQuery.trim()) return programs;
    return programs.filter((p) =>
      p.name.toLowerCase().includes(programQuery.toLowerCase())
    );
  }, [programQuery, programs]);

  // Reset state when popup opens
  useEffect(() => {
    if (isOpen) {
      setTraineeQuery('');
      setProgramQuery('');
      setTraineeHighlightedIndex(0);
      setProgramHighlightedIndex(0);
      setSelectedTrainee(null);
      setSelectedProgram(null);
      setShowTraineeDropdown(false);
      setShowProgramDropdown(false);
      setPrograms([]);
      setTrainingDays([]);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fetch programs when trainee is selected
  useEffect(() => {
    if (selectedTrainee) {
      fetchPrograms(selectedTrainee.id);
    } else {
      setPrograms([]);
      setSelectedProgram(null);
      setTrainingDays([]);
    }
  }, [selectedTrainee]);

  // Fetch training days when program is selected
  useEffect(() => {
    if (selectedProgram) {
      fetchTrainingDays(selectedProgram.id);
    } else {
      setTrainingDays([]);
    }
  }, [selectedProgram]);

  // Keyboard navigation for trainee dropdown
  useEffect(() => {
    if (!showTraineeDropdown) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setTraineeHighlightedIndex((prev) =>
          prev < filteredTrainees.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setTraineeHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredTrainees[traineeHighlightedIndex]) {
          handleTraineeSelect(filteredTrainees[traineeHighlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowTraineeDropdown(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showTraineeDropdown, traineeHighlightedIndex, filteredTrainees]);

  // Keyboard navigation for program dropdown
  useEffect(() => {
    if (!showProgramDropdown) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setProgramHighlightedIndex((prev) =>
          prev < filteredPrograms.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setProgramHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredPrograms[programHighlightedIndex]) {
          handleProgramSelect(filteredPrograms[programHighlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        setShowProgramDropdown(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProgramDropdown, programHighlightedIndex, filteredPrograms]);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setTraineeHighlightedIndex(0);
  }, [filteredTrainees]);

  useEffect(() => {
    setProgramHighlightedIndex(0);
  }, [filteredPrograms]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInsideModal = modalRef.current?.contains(target);
      const clickedInsideTraineeDropdown = traineeDropdownRef.current?.contains(target);
      const clickedInsideProgramDropdown = programDropdownRef.current?.contains(target);
      
      if (!clickedInsideModal && !clickedInsideTraineeDropdown && !clickedInsideProgramDropdown) {
        setShowTraineeDropdown(false);
        setShowProgramDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const fetchPrograms = async (traineeId: string) => {
    setIsLoadingPrograms(true);
    try {
      const response = await fetch('/api/program');
      if (response.ok) {
        const allPrograms: Program[] = await response.json();
        const traineePrograms = allPrograms.filter(
          (p) => p.trainee_id === traineeId && p.id !== currentProgramId
        );
        setPrograms(traineePrograms);
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setIsLoadingPrograms(false);
    }
  };

  const fetchTrainingDays = async (programId: string) => {
    setIsLoadingDays(true);
    try {
      const response = await fetch(`/api/program/day?program_id=${programId}`);
      if (response.ok) {
        const days: TrainingDay[] = await response.json();
        setTrainingDays(days);
      }
    } catch (error) {
      console.error('Error fetching training days:', error);
    } finally {
      setIsLoadingDays(false);
    }
  };

  const handleTraineeSelect = (trainee: UserWithoutPassword) => {
    setSelectedTrainee(trainee);
    setTraineeQuery(trainee.name);
    setShowTraineeDropdown(false);
    setProgramQuery('');
    setSelectedProgram(null);
  };

  const handleProgramSelect = (program: Program) => {
    setSelectedProgram(program);
    setProgramQuery(program.name);
    setShowProgramDropdown(false);
  };

  const handleDaySelect = (dayId: string) => {
    onCopyDay(dayId);
    onClose();
  };

  const handleAddNewDay = () => {
    onAddDay();
    onClose();
  };

  const getDropdownStyle = (inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (!inputRef.current) return { display: 'none' };
    const rect = inputRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      top: `${rect.bottom + 4}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    };
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      >
        <div 
          ref={modalRef}
          className="bg-white w-full max-w-md rounded-lg shadow-2xl relative"
          style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 pr-8">Copy Day from Program</h2>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Trainee Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Trainee
              </label>
              <div className="relative">
                <input
                  ref={traineeInputRef}
                  type="text"
                  value={traineeQuery}
                  onChange={(e) => {
                    setTraineeQuery(e.target.value);
                    setShowTraineeDropdown(true);
                    setSelectedTrainee(null);
                  }}
                  onFocus={() => setShowTraineeDropdown(true)}
                  placeholder="Search trainees..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowTraineeDropdown(!showTraineeDropdown)}
                >
                  <DownCaretInput />
                </button>
              </div>
            </div>

            {/* Program Selection */}
            {selectedTrainee && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Program
                </label>
                {isLoadingPrograms ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm">Loading programs...</p>
                  </div>
                ) : programs.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-600">No other programs found for this trainee</p>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      ref={programInputRef}
                      type="text"
                      value={programQuery}
                      onChange={(e) => {
                        setProgramQuery(e.target.value);
                        setShowProgramDropdown(true);
                        setSelectedProgram(null);
                      }}
                      onFocus={() => setShowProgramDropdown(true)}
                      placeholder="Search programs..."
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setShowProgramDropdown(!showProgramDropdown)}
                    >
                      <DownCaretInput />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Day Selection Buttons */}
            {selectedProgram && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Day to Copy
                </label>
                {isLoadingDays ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm">Loading days...</p>
                  </div>
                ) : trainingDays.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-sm text-gray-600">No days found in this program</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {trainingDays
                      .sort((a, b) => a.day_order - b.day_order)
                      .map((day) => (
                        <button
                          key={day.id}
                          onClick={() => handleDaySelect(day.id)}
                          className={cn(
                            'px-4 py-2 text-sm font-medium border border-[#CFD9E0] rounded-md',
                            'cursor-pointer transition-all',
                            'hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm',
                            'active:scale-95'
                          )}
                        >
                          {day.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Separator */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-3 text-sm text-gray-500 font-medium">or</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Add New Day Button */}
            <button
              onClick={handleAddNewDay}
              className={cn(
                'gap-2 bg-white border border-[#CFD9E0] rounded-md px-6 py-2.5',
                'cursor-pointer transition-all',
                'hover:bg-gray-50 hover:shadow-md active:scale-95',
                'w-full flex items-center justify-center font-medium'
              )}
            >
              <BlackPlus />
              <span>Add new Day</span>
            </button>
          </div>
        </div>
      </div>

      {/* Trainee Dropdown - rendered outside modal */}
      {showTraineeDropdown && filteredTrainees.length > 0 && createPortal(
        <div 
          ref={traineeDropdownRef}
          style={getDropdownStyle(traineeInputRef)}
          className="bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-y-auto z-[100000]"
        >
          {filteredTrainees.map((trainee, index) => (
            <div
              key={trainee.id}
              className={cn(
                'px-4 py-2 cursor-pointer transition-colors',
                'hover:bg-blue-50',
                index === traineeHighlightedIndex && 'bg-gray-100'
              )}
              onClick={() => handleTraineeSelect(trainee)}
            >
              <div className="font-medium text-gray-900">{trainee.name}</div>
              <div className="text-sm text-gray-500">{trainee.email}</div>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Program Dropdown - rendered outside modal */}
      {showProgramDropdown && filteredPrograms.length > 0 && createPortal(
        <div 
          ref={programDropdownRef}
          style={getDropdownStyle(programInputRef)}
          className="bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-y-auto z-[100000]"
        >
          {filteredPrograms.map((program, index) => (
            <div
              key={program.id}
              className={cn(
                'px-4 py-3 cursor-pointer transition-colors',
                'hover:bg-blue-50',
                index === programHighlightedIndex && 'bg-gray-100'
              )}
              onClick={() => handleProgramSelect(program)}
            >
              <div className="font-medium text-gray-900">{program.name}</div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default function NewDayPopup(props: NewDayPopupProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !props.isOpen) return null;

  return createPortal(
    <NewDayPopupContent {...props} />,
    document.body
  );
}