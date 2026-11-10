// components/program-builder/ui/new/popups/AddExercisePopup.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import DownCaretInput from '../../icons/DownCaretInput';
import { cn } from '@/lib/utils';
import { CentralizedExercise } from '@/database/program-builder.types';

interface AddExercisePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExercise: (exerciseData: {
    exercise_id: string;
    sets: number;
    reps: number[];
    weights: number[];
    rest_seconds: number;
    group_number: number;
    notes: string;
    reps_progression: number;
    weight_progression: number;
    r_plus_option: number;
  }) => void;
  traineeId?: string;
}

interface ExerciseFormData {
  exercise_id: string;
  sets: number;
  reps: number;
  weight: number;
  rest_seconds: number;
  group_number: number;
  notes: string;
  reps_progression: number;
  weight_progression: number;
  r_plus_option: number;
}

export default function AddExercisePopup({
  isOpen,
  onClose,
  onAddExercise,
  traineeId
}: AddExercisePopupProps) {
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [availableExercises, setAvailableExercises] = useState<CentralizedExercise[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<ExerciseFormData>({
    exercise_id: '',
    sets: 3,
    reps: 10,
    weight: 20,
    rest_seconds: 60,
    group_number: 1,
    notes: '',
    reps_progression: 1,
    weight_progression: 2.5,
    r_plus_option: 1
  });

  // Filter exercises based on search
  const filteredExercises = useMemo(() => {
    if (!exerciseQuery.trim()) return availableExercises;
    return availableExercises.filter(exercise =>
      exercise.name.toLowerCase().includes(exerciseQuery.toLowerCase()) ||
      (exercise.short_name && exercise.short_name.toLowerCase().includes(exerciseQuery.toLowerCase()))
    );
  }, [exerciseQuery, availableExercises]);

  // Fetch exercises on mount
  useEffect(() => {
    if (isOpen) {
      fetchExercises();
    }
  }, [isOpen]);

  // Reset form when popup opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        exercise_id: '',
        sets: 3,
        reps: 10,
        weight: 20,
        rest_seconds: 60,
        group_number: 1,
        notes: '',
        reps_progression: 1,
        weight_progression: 2.5,
        r_plus_option: 1
      });
      setExerciseQuery('');
      setHighlightedIndex(0);
      setShowDropdown(false);
    }
  }, [isOpen]);

  // Close dropdown on outside click
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
    setFormData(prev => ({ ...prev, exercise_id: exercise.id }));
    setExerciseQuery(exercise.name);
    setShowDropdown(false);

    if (traineeId) {
      fetchLastSessionStats(exercise.id);
    }
  };

  const fetchLastSessionStats = async (exerciseId: string) => {
    try {
      // Don't set main loading state to avoid blocking UI, maybe add a subtle indicator later
      const response = await fetch(
        `/api/program/exercise/last-session-stats?exercise_id=${exerciseId}&trainee_id=${traineeId}`
      );

      if (response.ok) {
        const stats = await response.json();
        if (stats) {
          setFormData(prev => ({
            ...prev,
            sets: stats.sets || 3,
            reps: stats.reps?.[0] || 10,
            weight: stats.weights?.[0] || 20,
            rest_seconds: stats.rest_seconds || 60,
            group_number: stats.group_number || 1,
            notes: stats.notes || '',
            reps_progression: stats.reps_progression !== undefined && stats.reps_progression !== null ? stats.reps_progression : prev.reps_progression,
            weight_progression: stats.weight_progression !== undefined && stats.weight_progression !== null ? stats.weight_progression : 2.5,
            r_plus_option: stats.r_plus_option || 1
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching last session stats:', error);
    }
  };

  const handleInputChange = (field: keyof ExerciseFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddExercise = () => {
    if (!formData.exercise_id) {
      alert('Please select an exercise');
      return;
    }

    // Create arrays for reps and weights based on sets count
    const repsArray = Array(formData.sets).fill(formData.reps);
    const weightsArray = Array(formData.sets).fill(formData.weight);

    onAddExercise({
      exercise_id: formData.exercise_id,
      sets: formData.sets,
      reps: repsArray,
      weights: weightsArray,
      rest_seconds: formData.rest_seconds,
      group_number: formData.group_number,
      notes: formData.notes,
      reps_progression: formData.reps_progression,
      weight_progression: formData.weight_progression,
      r_plus_option: formData.r_plus_option
    });

    onClose();
  };

  if (!isOpen) return null;

  const selectedExercise = availableExercises.find(ex => ex.id === formData.exercise_id);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-lg p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black cursor-pointer"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-normal mb-6 text-center">Add Exercise</h2>

        {/* Exercise Search Field */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exercise *
          </label>
          <div className="relative" ref={wrapperRef}>
            <input
              type="text"
              placeholder="Search exercises..."
              value={exerciseQuery}
              onChange={(e) => {
                setExerciseQuery(e.target.value);
                setShowDropdown(true);
                setHighlightedIndex(0);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#98CBFF]"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <DownCaretInput />
            </div>

            {/* Dropdown */}
            {showDropdown && filteredExercises.length > 0 && (
              <div
                className={cn(
                  "absolute top-full left-0 mt-2",
                  "bg-white border-5 border-white rounded-md shadow-xl z-10 overflow-y-auto max-h-48",
                  "flex flex-col w-full"
                )}
                style={{
                  boxShadow: '0px 0px 36px rgba(25, 37, 50, 0.2)'
                }}
              >
                {filteredExercises.map((exercise, i) => (
                  <div
                    key={exercise.id}
                    className={`text-left px-3 py-2 cursor-pointer ${i === highlightedIndex ? 'bg-gray-200' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
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

        {/* Selected Exercise Display */}
        {selectedExercise && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900">{selectedExercise.name}</h4>
            {selectedExercise.short_name && (
              <p className="text-sm text-blue-700">{selectedExercise.short_name}</p>
            )}
          </div>
        )}

        {/* Exercise Parameters */}
        <div className="space-y-4">
          {/* Sets, Reps, Weight */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sets</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.sets}
                onChange={(e) => handleInputChange('sets', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reps</label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.reps}
                onChange={(e) => handleInputChange('reps', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Rest and Progressions */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rest (s)</label>
              <input
                type="number"
                min="0"
                value={formData.rest_seconds}
                onChange={(e) => handleInputChange('rest_seconds', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">R+</label>
              <input
                type="number"
                min="0"
                value={formData.reps_progression}
                onChange={(e) => handleInputChange('reps_progression', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">W+</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.weight_progression}
                onChange={(e) => handleInputChange('weight_progression', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          {/* R+ Progression Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">R+ Progression Style</label>
            <select
              value={formData.r_plus_option}
              onChange={(e) => handleInputChange('r_plus_option', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>A: Add {formData.reps_progression} to all sets</option>
              <option value={2}>B: Add {formData.reps_progression} to weakest set</option>
              <option value={3}>C: Add {formData.reps_progression} to 2 weakest sets</option>
            </select>
          </div>

          {/* Group Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group Number</label>
            <input
              type="number"
              min="1"
              max="8"
              value={formData.group_number}
              onChange={(e) => handleInputChange('group_number', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Exercises in the same group are performed together</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Optional notes or instructions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleAddExercise}
            disabled={!formData.exercise_id || isLoading}
            className={cn(
              'flex-1 bg-blue-500 text-white py-2 px-4 rounded-md transition-all',
              'hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Add Exercise
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}