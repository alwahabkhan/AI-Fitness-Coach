/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ArrowDown,
  ArrowUp,
  ChevronUp,
  PlayCircle,
  Save,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import VideoModal from './YouTubeVideoModal';
import EditNotes from '../icons/EditNotes';
import NotesIcon from '../icons/NotesIcon';
import { Exercise } from '../../PLACEHOLDER';
import { TrainingExerciseWithDetails } from '@/database/program-builder.types';
import AddNotePopup from './popups/AddNotePopup';
import ChangeExercisePopup from './popups/ChangeExercisePopup';
import { formatWeight } from '@/lib/utils';
import { ExercisesTableProps } from './ExercisesTable';

const GROUP_COLORS = [
  '#036FE3',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#84CC16',
  '#F97316'
];

interface EditingData {
  sets: number;
  rest_seconds: number;
  reps_progression: number;
  weight_progression: number;
  reps: number[];
  weights: number[];
  group_number: number;
  r_plus_option: number;
}

export default function ExercisesTableMobile({
  exercises,
  trainingExercises = [],
  onExerciseUpdate,
  onExerciseReorder,
  onExerciseDelete,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sessionId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sessionStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSessionStatusChange,
  isCompleted = false,
  userRole,
  currentSessionNumber = 1,
  availableSessions = [],
  isTraineeEditMode = false,
  onRequestEditMode
}: ExercisesTableProps) {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [selectedVideoTitle, setSelectedVideoTitle] = useState('');
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    new Set()
  );
  const [isNotePopupOpen, setIsNotePopupOpen] = useState(false);
  const [selectedExerciseForNote, setSelectedExerciseForNote] =
    useState<Exercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingData | null>(null);
  const [showGroupColors, setShowGroupColors] = useState<string | null>(null);
  const [isChangeExercisePopupOpen, setIsChangeExercisePopupOpen] =
    useState(false);
  const [selectedExerciseForChange, setSelectedExerciseForChange] =
    useState<Exercise | null>(null);

  // Calculate if current session is "Up Next" or "Following"
  const completedSessions = availableSessions.filter(s => s > 0);
  const upNextSessionNumber = completedSessions.length > 0 ? Math.max(...completedSessions) + 1 : 1;
  const followingSessionNumber = upNextSessionNumber + 1;
  const isUpNext = currentSessionNumber === upNextSessionNumber;
  const isFollowing = currentSessionNumber === followingSessionNumber;
  const isEditable = isUpNext && !isCompleted && (userRole === 'trainer' || userRole === 'admin' || (userRole === 'trainee' && isTraineeEditMode));

  const [showRPlusPopup, setShowRPlusPopup] = useState<string | null>(null);

  const trainingExerciseMap = trainingExercises.reduce(
    (acc, te) => {
      acc[te.id] = te;
      return acc;
    },
    {} as Record<string, TrainingExerciseWithDetails>
  );

  const handlePlayClick = (exercise: Exercise) => {
    setSelectedVideoUrl(
      exercise.videoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    setSelectedVideoTitle(exercise.name);
    setIsVideoModalOpen(true);
  };

  const toggleExpanded = (exerciseId: string) => {
    const newExpanded = new Set(expandedExercises);
    if (newExpanded.has(exerciseId)) {
      newExpanded.delete(exerciseId);
    } else {
      newExpanded.add(exerciseId);
    }
    setExpandedExercises(newExpanded);
  };

  const startEditing = (exercise: Exercise) => {
    const trainingExercise = trainingExerciseMap[exercise.id];
    if (!trainingExercise) return;

    // When editing "Up Next", use the calculated session values (from exercise prop)
    // These are the values that will be used when the trainee starts the session
    // Editing these will update the base training_exercise values
    setEditingExercise(exercise.id);
    setEditingData({
      sets: exercise.sets || trainingExercise.sets || 3,
      rest_seconds: exercise.rest ?? trainingExercise.rest_seconds ?? 60,
      reps_progression: exercise.repsProgression ?? trainingExercise.reps_progression ?? 0,
      weight_progression: exercise.weightProgression ?? trainingExercise.weight_progression ?? 0,
      r_plus_option: trainingExercise.r_plus_option || 1,
      // Use the calculated session reps/weights from the exercise prop
      reps: Array.isArray(exercise.reps) ? exercise.reps : (trainingExercise.reps || [10, 10, 10]),
      weights: Array.isArray(exercise.weight) ? exercise.weight : (trainingExercise.weights || [20, 20, 20]),
      group_number: exercise.groupNumber || trainingExercise.group_number || 1
    });
  };

  const saveChanges = async (exerciseId: string) => {
    if (!editingData) return;

    try {
      await onExerciseUpdate(exerciseId, editingData);
      setEditingExercise(null);
      setEditingData(null);
    } catch (error) {
      console.error('Error saving exercise changes:', error);
    }
  };

  const cancelEditing = () => {
    setEditingExercise(null);
    setEditingData(null);
  };

  const updateEditingData = (field: keyof EditingData, value: any) => {
    if (!editingData) return;

    const newData = { ...editingData };

    if (field === 'sets') {
      const newSets = Math.max(1, value);
      newData.sets = newSets;
      newData.reps = Array(newSets)
        .fill(0)
        .map((_, i) => editingData.reps[i] || 10);
      newData.weights = Array(newSets)
        .fill(0)
        .map((_, i) => editingData.weights[i] || 20);
    } else {
      (newData as any)[field] = value;
    }

    setEditingData(newData);
  };

  // const updateSetValue = (setIndex: number, field: 'reps' | 'weights', value: number) => {
  //   if (!editingData) return;

  //   const newArray = [...editingData[field]];
  //   newArray[setIndex] = value;
  //   setEditingData({ ...editingData, [field]: newArray });
  // };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showRPlusPopup) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          setShowRPlusPopup(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRPlusPopup]);

  const handleGroupColorChange = async (
    exerciseId: string,
    groupNumber: number
  ) => {
    await onExerciseUpdate(exerciseId, { group_number: groupNumber });
    setShowGroupColors(null);
  };

  const handleChangeExercise = async (
    exerciseId: string,
    newExerciseId: string
  ) => {
    onExerciseUpdate(exerciseId, { exercise_id: newExerciseId });
    setIsChangeExercisePopupOpen(false);
    setSelectedExerciseForChange(null);
  };

  return (
    <div className="space-y-4">
      {exercises.map((exercise, index) => {
        const isExpanded = expandedExercises.has(exercise.id);
        const trainingExercise = trainingExerciseMap[exercise.id];
        const isEditing = editingExercise === exercise.id;

        return (
          <div
            key={exercise.id}
            className="border border-gray-200 rounded-lg p-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div
                className="border-l-4 pl-2 flex-1"
                style={{ borderColor: exercise.groupColor }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full cursor-pointer"
                    style={{ backgroundColor: exercise.groupColor }}
                    onClick={() =>
                      setShowGroupColors(
                        showGroupColors === exercise.id ? null : exercise.id
                      )
                    }
                  />
                  <h2
                    className="text-blue-900 text-sm cursor-pointer"
                    onClick={() => {
                      setSelectedExerciseForChange(exercise);
                      setIsChangeExercisePopupOpen(true);
                    }}
                  >
                    {exercise.name}
                  </h2>
                  <ChevronUp
                    size={20}
                    className={`cursor-pointer transition-transform ${isExpanded ? '' : 'rotate-180'}`}
                    onClick={() => toggleExpanded(exercise.id)}
                  />
                </div>
                <p className="text-xs text-gray-500 opacity-70 pl-6">
                  Last Session: {exercise.lastSession?.split(' ').slice(0, 3).join(' ')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-md text-gray-500">
                    {exercise.progress.current}
                  </p>
                  {exercise.progress.next && (
                    <p className="text-sm text-gray-500 opacity-70">
                      {!isFollowing && 'Next: '}{exercise.progress.next}
                    </p>
                  )}
                </div>
                <PlayCircle
                  size={30}
                  className="opacity-60 cursor-pointer hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={() => handlePlayClick(exercise)}
                />
              </div>
            </div>

            {/* Color picker popup */}
            {showGroupColors === exercise.id && (
              <div className="mb-2 flex flex-wrap gap-2 p-2 bg-gray-50 rounded">
                {GROUP_COLORS.map((color, idx) => (
                  <div
                    key={idx}
                    className="w-6 h-6 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-300"
                    style={{ backgroundColor: color }}
                    onClick={() => handleGroupColorChange(exercise.id, idx + 1)}
                  />
                ))}
              </div>
            )}

            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                {/* Action buttons */}
                <div className="flex gap-3 pb-2 border-b border-gray-200 items-center justify-between">
                  {isEditable && (
                    <button
                      className="text-red-600 hover:text-red-700"
                      onClick={() => onExerciseDelete(exercise.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  <div className="flex gap-3 items-center">
                    {isEditing ? (
                      <>
                        <button onClick={() => saveChanges(exercise.id)}>
                          <Save size={18} />
                        </button>
                        <button onClick={cancelEditing}>
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => startEditing(exercise)}>
                        <EditNotes />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedExerciseForNote(exercise);
                        setIsNotePopupOpen(true);
                      }}
                    >
                      <NotesIcon />
                    </button>
                  </div>

                  <div className="flex gap-3 items-center">
                    <button
                      onClick={() => onExerciseReorder(exercise.id, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp
                        size={14}
                        className={index === 0 ? 'opacity-30' : ''}
                      />
                    </button>
                    <button
                      onClick={() => onExerciseReorder(exercise.id, 'down')}
                      disabled={index === exercises.length - 1}
                    >
                      <ArrowDown
                        size={14}
                        className={
                          index === exercises.length - 1 ? 'opacity-30' : ''
                        }
                      />
                    </button>
                  </div>
                </div>

                {/* Sets display/editing */}
                <div className="pt-2 space-y-2">
                  {isEditing && editingData ? (
                    <>
                      {/* Editing controls */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs opacity-60 block mb-1">
                            Sets
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editingData.sets}
                            onChange={(e) =>
                              updateEditingData(
                                'sets',
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full px-2 py-1.5 border rounded text-center text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs opacity-60 block mb-1">
                            Rest (s)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={editingData.rest_seconds}
                            onChange={(e) =>
                              updateEditingData(
                                'rest_seconds',
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full px-2 py-1.5 border rounded text-center text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs opacity-60 block mb-1">
                            R+
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editingData.reps_progression}
                            onChange={(e) =>
                              updateEditingData(
                                'reps_progression',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-center"
                          />
                        </div>
                        <div>
                          <label className="text-xs opacity-60 block mb-1">
                            W+
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={editingData.weight_progression}
                            onChange={(e) =>
                              updateEditingData(
                                'weight_progression',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-center"
                          />
                        </div>
                      </div>

                      {/* Individual set editing */}
                      <div className="space-y-2">
                        {editingData.reps.map((reps, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-6 gap-2 text-center"
                          >
                            <div className="text-xs opacity-60 flex items-center justify-center">
                              {idx + 1}
                            </div>
                            {idx === 0 ? (
                              <>
                                <div className="text-xs opacity-60 flex items-center justify-center">
                                  -
                                </div>
                                <div className="text-xs opacity-60 flex items-center justify-center">
                                  -
                                </div>
                                <div className="text-xs opacity-60 flex items-center justify-center">
                                  -
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-center opacity-0">
                                  -
                                </div>
                                <div className="flex items-center justify-center opacity-0">
                                  -
                                </div>
                                <div className="flex items-center justify-center opacity-0">
                                  -
                                </div>
                              </>
                            )}
                            <input
                              type="number"
                              min="1"
                              value={reps}
                              onChange={(e) => {
                                const newReps = [...editingData.reps];
                                newReps[idx] = parseInt(e.target.value) || 0;
                                updateEditingData('reps', newReps);
                              }}
                              className="w-full px-2 py-1.5 border rounded text-center text-sm"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={editingData.weights[idx]}
                              onChange={(e) => {
                                const newWeights = [...editingData.weights];
                                newWeights[idx] =
                                  parseFloat(e.target.value) || 0;
                                updateEditingData('weights', newWeights);
                              }}
                              className="w-full px-2 py-1.5 border rounded text-center text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Display mode */}
                      <div className="space-y-2">
                        {/* Set 1 with all fields */}
                        <div className="grid grid-cols-6 gap-2 text-left text-sm">
                          <div>
                            <p className="opacity-70 text-xs">Sets</p>
                            <p className="font-medium">1</p>
                          </div>
                          <div>
                            <p className="opacity-70 text-xs">Rest</p>
                            <p className="font-medium">
                              {trainingExercise?.rest_seconds || exercise.rest}s
                            </p>
                          </div>
                          <div className="relative">
                            <p className="opacity-70 text-xs">R+</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowRPlusPopup(
                                  showRPlusPopup === exercise.id
                                    ? null
                                    : exercise.id
                                );
                              }}
                              className="flex items-center gap-1 font-medium bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors"
                            >
                              <span>
                                {trainingExercise?.reps_progression ??
                                  exercise.repsProgression ??
                                  0}
                              </span>
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>

                            {showRPlusPopup === exercise.id && (
                              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[200px]">
                                <div className="p-2">
                                  <div className="text-xs text-gray-500 mb-2 px-2 font-medium">
                                    Rep Progression Style
                                  </div>
                                  {[
                                    {
                                      value: 1,
                                      label: `A: Add ${trainingExercise?.reps_progression ?? exercise.repsProgression ?? 0} to all sets`
                                    },
                                    {
                                      value: 2,
                                      label: `B: Add ${trainingExercise?.reps_progression ?? exercise.repsProgression ?? 0} to weakest set`
                                    },
                                    {
                                      value: 3,
                                      label: `C: Add ${trainingExercise?.reps_progression ?? exercise.repsProgression ?? 0} to 2 weakest sets`
                                    }
                                  ].map((option) => {
                                    const currentOption =
                                      trainingExercise?.r_plus_option || 1;

                                    return (
                                      <button
                                        key={option.value}
                                        onClick={() => {
                                          onExerciseUpdate(exercise.id, {
                                            r_plus_option: option.value
                                          });
                                          setShowRPlusPopup(null);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                                          currentOption === option.value
                                            ? 'bg-blue-500 text-white font-medium'
                                            : 'hover:bg-gray-100 text-gray-700'
                                        }`}
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="opacity-70 text-xs">W+</p>
                            <p className="font-medium">
                              {trainingExercise?.weight_progression ||
                                exercise.weightProgression}
                            </p>
                          </div>
                          <div>
                            <p className="opacity-70 text-xs">Reps</p>
                            <p className="font-medium">
                              {trainingExercise?.reps?.[0] || exercise.reps}
                            </p>
                          </div>
                          <div>
                            <p className="opacity-70 text-xs">Weight</p>
                            <p className="font-medium">
                              {formatWeight(
                                Array.isArray(exercise.weight)
                                  ? exercise.weight[0]
                                  : exercise.weight
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Additional sets (2+) without Rest, R+, W+ */}
                        {trainingExercise?.reps &&
                          trainingExercise?.weights &&
                          trainingExercise.reps.length > 1 &&
                          trainingExercise.reps.slice(1).map((reps, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-6 gap-2 text-left text-sm"
                            >
                              <div>
                                <p className="opacity-70 text-xs">Sets</p>
                                <p className="font-medium">{idx + 2}</p>
                              </div>
                              <div>
                                <p className="font-medium opacity-0">-</p>
                              </div>
                              <div>
                                <p className="font-medium opacity-0">-</p>
                              </div>
                              <div>
                                <p className="font-medium opacity-0">-</p>
                              </div>
                              <div>
                                <p className="opacity-70 text-xs">Reps</p>
                                <p className="font-medium">{reps}</p>
                              </div>
                              <div>
                                <p className="opacity-70 text-xs">Weight</p>
                                <p className="font-medium">
                                  {formatWeight(
                                    trainingExercise.weights?.[idx + 1] || 0
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Program Completion Checkbox */}
            {/* {sessionId && onSessionStatusChange && (
              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sessionStatus === 'completed'}
                    onChange={(e) => {
                      const newStatus = e.target.checked
                        ? 'completed'
                        : 'in_progress';
                      onSessionStatusChange(newStatus);
                    }}
                    className="w-3 h-3 cursor-pointer accent-green-600 rounded"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Program is Completed
                  </span>
                </label>
              </div>
            )} */}
          </div>
        );
      })}

      {/* Modals */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={selectedVideoUrl}
        title={selectedVideoTitle}
      />

      <AddNotePopup
        isOpen={isNotePopupOpen}
        onClose={() => {
          setIsNotePopupOpen(false);
          setSelectedExerciseForNote(null);
        }}
        onSaveNote={(note) => {
          if (selectedExerciseForNote) {
            onExerciseUpdate(selectedExerciseForNote.id, { notes: note });
          }
        }}
        initialNote={selectedExerciseForNote?.notes || ''}
      />

      <ChangeExercisePopup
        isOpen={isChangeExercisePopupOpen}
        onClose={() => {
          setIsChangeExercisePopupOpen(false);
          setSelectedExerciseForChange(null);
        }}
        onChangeExercise={(newExerciseId) =>
          selectedExerciseForChange &&
          handleChangeExercise(selectedExerciseForChange.id, newExerciseId)
        }
        currentExerciseName={selectedExerciseForChange?.name || ''}
      />
    </div>
  );
}
