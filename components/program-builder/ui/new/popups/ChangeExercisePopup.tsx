import { useState, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { CentralizedExercise } from '@/database/program-builder.types';

interface ChangeExercisePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onChangeExercise: (exerciseId: string) => void;
  currentExerciseName: string;
}

export default function ChangeExercisePopup({
  isOpen,
  onClose,
  onChangeExercise,
  currentExerciseName
}: ChangeExercisePopupProps) {
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [availableExercises, setAvailableExercises] = useState<CentralizedExercise[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredExercises = useMemo(() => {
    if (!exerciseQuery.trim()) return availableExercises;
    return availableExercises.filter(exercise =>
      exercise.name.toLowerCase().includes(exerciseQuery.toLowerCase()) ||
      (exercise.short_name && exercise.short_name.toLowerCase().includes(exerciseQuery.toLowerCase()))
    );
  }, [exerciseQuery, availableExercises]);

  useEffect(() => {
    if (isOpen) {
      fetchExercises();
      setExerciseQuery('');
      setSelectedExerciseId('');
      setHighlightedIndex(0);
      setShowDropdown(false);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchExercises = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/centralized-exercise');
      if (response.ok) {
        const exercises = await response.json();
        setAvailableExercises(exercises);
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown && e.key !== 'Enter') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filteredExercises.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredExercises[highlightedIndex]) {
        selectExercise(filteredExercises[highlightedIndex]);
      }
    }
  };

  const selectExercise = (exercise: CentralizedExercise) => {
    setSelectedExerciseId(exercise.id);
    setExerciseQuery(exercise.name);
    setShowDropdown(false);
  };

  const handleChange = () => {
    if (!selectedExerciseId) {
      alert('Please select an exercise');
      return;
    }
    onChangeExercise(selectedExerciseId);
    onClose();
  };

  if (!isOpen) return null;

  const selectedExercise = availableExercises.find(ex => ex.id === selectedExerciseId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-lg p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black cursor-pointer"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <h2 className="text-xl text-center font-semibold mb-4">Change Exercise</h2>
        
        <p className="text-sm text-gray-600 mb-4">
          Currently: <span className="font-medium">{currentExerciseName}</span>
        </p>

        <div className="mb-6">
          <div className="relative" ref={wrapperRef}>
            <input
              type="text"
              value={exerciseQuery}
              onChange={(e) => {
                setExerciseQuery(e.target.value);
                setShowDropdown(true);
                setHighlightedIndex(0);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search exercises..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {selectedExercise && (
                <span className='text-xs text-gray-400'>Selected: {selectedExercise.name}</span>
            //   <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
            //     <h4 className="font-medium text-blue-900">{selectedExercise.name}</h4>
            //     {selectedExercise.short_name && (
            //       <p className="text-sm text-blue-700">{selectedExercise.short_name}</p>
            //     )}
            //   </div>
            )}
            
            {showDropdown && filteredExercises.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredExercises.map((exercise, index) => (
                  <div
                    key={exercise.id}
                    className={`px-3 py-2 cursor-pointer transition-colors ${
                      index === highlightedIndex ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                    }`}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectExercise(exercise);
                    }}
                  >
                    <div className="font-medium">{exercise.name}</div>
                    {exercise.short_name && (
                      <div className="text-sm text-gray-500">{exercise.short_name}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleChange}
            className="flex-1 px-4 py-2 cursor-pointer bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300"
            disabled={!selectedExerciseId}
          >
            Change
          </button>
        </div>
      </div>
    </div>
  );
}