/* eslint-disable @typescript-eslint/no-explicit-any */
// components/program-builder/ui/new/ExercisesTable.tsx
import { ArrowDown, ArrowUp, ChevronUp, PlayCircle, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import VideoModal from './YouTubeVideoModal';
import EditNotes from '../icons/EditNotes';
import NotesIcon from '../icons/NotesIcon';
import { Exercise } from '../../PLACEHOLDER';
import { TrainingExerciseWithDetails } from '@/database/program-builder.types';
import AddNotePopup from './popups/AddNotePopup';
import ChangeExercisePopup from './popups/ChangeExercisePopup';
import { formatWeight } from '@/lib/utils';
import { ExercisesTableProps } from './ExercisesTable';
import RPlusPopup from './RPlusPopup';

// Helper to get letter badge for R+ option
const getRPlusLetter = (option: number): string => {
  const letters: Record<number, string> = { 1: 'A', 2: 'B', 3: 'C' };
  return letters[option] || 'A';
};

// Group colors for selection
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

export default function ExercisesTable({
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
  const [isChangeExercisePopupOpen, setIsChangeExercisePopupOpen] = useState(false);
  const [selectedExerciseForChange, setSelectedExerciseForChange] = useState<Exercise | null>(null);
  // Calculate if current session is "Up Next" or "Following"
  const completedSessions = availableSessions.filter(s => s > 0);
  const upNextSessionNumber = completedSessions.length > 0 ? Math.max(...completedSessions) + 1 : 1;
  const followingSessionNumber = upNextSessionNumber + 1;
  const isUpNext = currentSessionNumber === upNextSessionNumber;
  const isFollowing = currentSessionNumber === followingSessionNumber;
  const isEditable = isUpNext && !isCompleted && (userRole === 'trainer' || userRole === 'admin' || (userRole === 'trainee' && isTraineeEditMode));

  const [showRPlusPopup, setShowRPlusPopup] = useState<string | null>(null);

  // Create a map for easy lookup of training exercise data
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
      r_plus_option: trainingExercise.r_plus_option || 2,
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
      // Adjust arrays to match new sets count
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

  const updateSetValue = (
    setIndex: number,
    field: 'reps' | 'weights',
    value: number
  ) => {
    if (!editingData) return;

    const newArray = [...editingData[field]];
    newArray[setIndex] = value;
    setEditingData({ ...editingData, [field]: newArray });
  };

  const handleGroupColorChange = async (
    exerciseId: string,
    groupNumber: number
  ) => {
    await onExerciseUpdate(exerciseId, { group_number: groupNumber });
    setShowGroupColors(null);
  };

  const formatTime = (seconds: number) => {
    return seconds;
  };

  const handleChangeExercise = async (exerciseId: string, newExerciseId: string) => {
    onExerciseUpdate(exerciseId, { exercise_id: newExerciseId });
    setIsChangeExercisePopupOpen(false);
    setSelectedExerciseForChange(null);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-176 w-full table-auto border-separate text-left border-spacing-y-4 overflow-visible">
        <thead className="text-sm text-[#747474] ">
          <th className="w-[30%] font-normal">Exercise</th>
          <th className="w-[5%] font-normal">Sets</th>
          <th className="w-[5%] font-normal">Rest</th>
          <th className="w-[5%] font-normal">R+</th>
          <th className="w-[5%] font-normal">W+</th>
          <th className="w-[5%] font-normal">Reps</th>
          <th className="w-[5%] font-normal">Weight</th>
          <th className="w-[15%] font-normal">Actions</th>
          <th className="w-[20%] font-normal text-right">Progress</th>
        </thead>
        <tbody>
          {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          exercises.map((exercise, index) => {
            const isExpanded = expandedExercises.has(exercise.id);
            // const trainingExercise = trainingExerciseMap[exercise.id];
            const isEditing = editingExercise === exercise.id;

            return (
              <>
                <tr key={exercise.id}>
                  {/* Exercise Name/Group */}
                  <td
                    className="flex flex-col border-l-4 pl-2 py-3"
                    style={{ borderColor: exercise.groupColor }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-300"
                        style={{ backgroundColor: exercise.groupColor }}
                        onClick={() =>
                          setShowGroupColors(
                            showGroupColors === exercise.id ? null : exercise.id
                          )
                        }
                      ></div>
                      <span 
                        className="font-medium cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => {
                          setSelectedExerciseForChange(exercise);
                          setIsChangeExercisePopupOpen(true);
                        }}
                      >
                        {exercise.name}
                      </span>
                      <button
                        onClick={() => toggleExpanded(exercise.id)}
                        className="cursor-pointer"
                      >
                        <ChevronUp
                          size={16}
                          className={
                            isExpanded
                              ? 'transform rotate-180 transition-transform'
                              : 'transition-transform'
                          }
                        />
                      </button>
                    </div>
                    <span className="text-xs text-[#B5C1C0] ml-6">
                      Last Session: {exercise.lastSession?.split(' ').slice(0, 3).join(' ')}
                    </span>

                    {/* Group Color Picker */}
                    {showGroupColors === exercise.id && (
                      <div className="absolute z-10 mt-8 ml-6 p-2 bg-white border rounded-lg shadow-lg">
                        <div className="grid grid-cols-4 gap-2">
                          {GROUP_COLORS.map((color, colorIndex) => (
                            <div
                              key={colorIndex}
                              className="w-6 h-6 rounded-full cursor-pointer hover:ring-2 hover:ring-gray-300"
                              style={{ backgroundColor: color }}
                              onClick={() =>
                                handleGroupColorChange(
                                  exercise.id,
                                  colorIndex + 1
                                )
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Exercise Fields */}
                  <td className="font-medium">
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        value={editingData?.sets || 3}
                        onChange={(e) =>
                          updateEditingData(
                            'sets',
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-16 px-2 py-1 border rounded text-center border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#94A3B8] transition-all"
                      />
                    ) : isExpanded ? (
                      1
                    ) : (
                      exercise.sets
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={editingData?.rest_seconds ?? 60}
                        onChange={(e) =>
                          updateEditingData(
                            'rest_seconds',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-16 px-2 py-1 border rounded text-center border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#94A3B8] transition-all"
                      />
                    ) : (
                      formatTime(exercise.rest)
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editingData?.reps_progression || 0}
                        onChange={(e) =>
                          updateEditingData(
                            'reps_progression',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-16 px-2 py-1 border rounded text-center border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#94A3B8] transition-all"
                      />
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRPlusPopup(exercise.id);
                        }}
                        className="flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        <span>{exercise.repsProgression ?? 0}</span>
                        <div className="ml-0.5 flex items-center justify-center px-2 py-1 bg-gray-200 rounded text-xs font-medium cursor-pointer hover:bg-gray-300 transition-all">
                          <span>
                          {getRPlusLetter(trainingExerciseMap[exercise.id]?.r_plus_option || 2)}
                          </span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editingData?.weight_progression ?? 0}
                        onChange={(e) =>
                          updateEditingData(
                            'weight_progression',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-16 px-2 py-1 border rounded text-center border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#94A3B8] transition-all"
                      />
                    ) : (
                      exercise.weightProgression
                    )}
                  </td>
                  <td className="font-medium">
                    {Array.isArray(exercise.reps) ? exercise.reps[0] : exercise.reps}
                  </td>
                  <td className="font-medium">
                    {formatWeight(Array.isArray(exercise.weight) ? exercise.weight[0] : exercise.weight)}
                  </td>

                  {/* Action Buttons */}
                  <td className="space-x-2">
                    <div className="flex items-center gap-2">
                      {isEditable && (
                        <>
                          {/* Reorder buttons */}
                          <button
                            className="cursor-pointer transition-all hover:scale-95"
                            onClick={() => onExerciseReorder(exercise.id, 'up')}
                          >
                            <ArrowUp
                              size={18}
                              className={
                                exercise.id === exercises[0]?.id ? 'opacity-30' : ''
                              }
                            />
                          </button>
                          <button
                            className="cursor-pointer transition-all hover:scale-95"
                            onClick={() => onExerciseReorder(exercise.id, 'down')}
                          >
                            <ArrowDown
                              size={18}
                              className={
                                exercise.id === exercises[exercises.length - 1]?.id
                                  ? 'opacity-30'
                                  : ''
                              }
                            />
                          </button>

                          {/* Edit/Save button */}
                          {isEditing ? (
                            <div className="flex gap-1">
                              <button
                                className="cursor-pointer transition-all hover:scale-95"
                                onClick={() => saveChanges(exercise.id)}
                              >
                                <Save size={18} />
                              </button>
                              <button
                                className="cursor-pointer transition-all hover:scale-95"
                                onClick={cancelEditing}
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="cursor-pointer transition-all hover:scale-95"
                              onClick={() => startEditing(exercise)}
                            >
                              <EditNotes />
                            </button>
                          )}

                          <button
                            className="cursor-pointer transition-all hover:scale-95"
                            onClick={() => {
                              setSelectedExerciseForNote(exercise);
                              setIsNotePopupOpen(true);
                            }}
                          >
                            <NotesIcon />
                          </button>

                          {(userRole === 'trainer' || userRole === 'admin') && (
                            <button
                              className="cursor-pointer transition-all hover:scale-95 text-red-600 hover:text-red-700"
                              onClick={() => onExerciseDelete(exercise.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>

                  {/* Progress */}
                  <td className="flex py-3 items-center justify-end gap-2">
                    <div className="flex flex-col text-right">
                      <span className="font-medium">
                        {exercise.progress.current}
                      </span>
                      {exercise.progress.next && (
                        <span className="text-sm text-[#747474]">
                          {!isFollowing && 'Next: '}{exercise.progress.next}
                        </span>
                      )}
                    </div>
                    <PlayCircle
                      size={30}
                      className="opacity-50 cursor-pointer hover:opacity-100 transition-opacity"
                      onClick={() => handlePlayClick(exercise)}
                    />
                  </td>
                </tr>

                {/* Individual set breakdown when expanded */}
                {isExpanded && (
                  <>
                    {/* Show editable sets if editing */}
                    {isEditing && editingData
                      ? editingData.reps.map((reps, setIndex) => (
                          <tr
                            key={`${exercise.id}-edit-set-${setIndex}`}
                          >
                            <td></td>
                            <td>
                              <span className="opacity-60">{setIndex + 1}</span>
                            </td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={reps}
                                onChange={(e) =>
                                  updateSetValue(
                                    setIndex,
                                    'reps',
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-16 px-2 py-1 border rounded text-center border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#94A3B8] transition-all"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={editingData.weights[setIndex]}
                                onChange={(e) =>
                                  updateSetValue(
                                    setIndex,
                                    'weights',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-16 px-2 py-1 border rounded text-center border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#94A3B8] transition-all"
                              />
                            </td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))
                      : /* Show regular sets if not editing */
                        Array.isArray(exercise.reps) &&
                        Array.isArray(exercise.weight) &&
                        exercise.reps.length > 1 &&
                        exercise.reps.slice(1).map((reps, setIndex) => (
                          <tr key={`${exercise.id}-set-${setIndex + 2}`}>
                            <td></td>
                            <td>
                              <span className="opacity-40">{setIndex + 2}</span>
                            </td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td className="font-medium opacity-60">{reps}</td>
                            <td className="font-medium opacity-60">
                              {formatWeight(
                                Array.isArray(exercise.weight) ? (exercise.weight[setIndex + 1] || 0) : 0
                              )}
                            </td>
                            <td></td>
                            <td></td>
                          </tr>
                        ))}
                  </>
                )}
              </>
            );
          })}
        </tbody>
      </table>

      {/* Program Completion Checkbox
      {sessionId && onSessionStatusChange && (
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={sessionStatus === 'completed'}
              onChange={(e) => {
                const newStatus = e.target.checked ? 'completed' : 'in_progress';
                onSessionStatusChange(newStatus);
              }}
              className="w-4 h-4 cursor-pointer accent-blue-700 rounded"
            />
            <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
              Program is Completed
            </span>
          </label>
        </div>
      )} */}

      {/* R+ Popup */}
      <RPlusPopup
        isOpen={showRPlusPopup !== null}
        onClose={() => setShowRPlusPopup(null)}
        currentOption={
          showRPlusPopup 
            ? trainingExerciseMap[showRPlusPopup]?.r_plus_option || 2
            : 2
        }
        repsProgression={
          showRPlusPopup
            ? trainingExerciseMap[showRPlusPopup]?.reps_progression ?? 0
            : 0
        }
        onSelectOption={(option) => {
          if (showRPlusPopup) {
            onExerciseUpdate(showRPlusPopup, { r_plus_option: option });
          }
        }}
      />

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={selectedVideoUrl}
        title={selectedVideoTitle}
      />

      {/* Note Modal */}
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

      {/* Change Exercise Modal */}
      <ChangeExercisePopup
        isOpen={isChangeExercisePopupOpen}
        onClose={() => {
          setIsChangeExercisePopupOpen(false);
          setSelectedExerciseForChange(null);
        }}
        onChangeExercise={(newExerciseId) => 
          selectedExerciseForChange && handleChangeExercise(selectedExerciseForChange.id, newExerciseId)
        }
        currentExerciseName={selectedExerciseForChange?.name || ''}
      />
    </div>
  );
}