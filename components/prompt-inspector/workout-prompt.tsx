import { useState, useEffect, useCallback } from 'react';
import { Dumbbell, FileText } from 'lucide-react';

import { WorkoutPromptBreakdown, WorkoutOption } from '@/lib/prompt-inspector';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import Editor from './editor';

interface WorkoutPromptProps {
  selectedUserId: string;
}

export default function WorkoutPrompt({ selectedUserId }: WorkoutPromptProps) {
  const [workoutBreakdown, setWorkoutBreakdown] =
    useState<WorkoutPromptBreakdown | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutOption[]>([]);
  const [loadingPrompt, setLoadingPrompt] = useState<boolean>(false);

  useEffect(() => {
    const fetchWorkouts = async () => {
      if (!selectedUserId) {
        setWorkouts([]);
        return;
      }

      try {
        const response = await fetch(
          `/api/trainer/prompt-inspector/workout?userId=${selectedUserId}`
        );

        if (!response.ok) {
          console.error('Error fetching workouts:', response.statusText);
          return;
        }

        const data = await response.json();
        setWorkouts(data.workouts);
      } catch (error) {
        console.error('Error fetching workouts:', error);
      }
    };

    fetchWorkouts();
  }, [selectedUserId]);

  const getWorkoutPromptBreakdown = useCallback(
    async ({
      userId,
      workoutId,
      init = false
    }: {
      userId: string;
      workoutId?: string;
      init?: boolean;
    }) => {
      try {
        if (init) {
          setLoadingPrompt(true);
        }
        const url = workoutId
          ? `/api/trainer/prompt-inspector/workout?userId=${userId}&workoutId=${workoutId}`
          : `/api/trainer/prompt-inspector/workout?userId=${userId}`;

        const response = await fetch(url);

        if (!response.ok) {
          console.error(
            'Error fetching workout prompt breakdown:',
            response.statusText
          );
          return null;
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching workout prompt breakdown:', error);
        return null;
      } finally {
        if (init) {
          setLoadingPrompt(false);
        }
      }
    },
    []
  );

  const handleSaveUserPrompt = async (value: string) => {
    if (!selectedUserId) return;

    const response = await fetch('/api/trainer/prompt-inspector/workout', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: selectedUserId,
        content: value
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save workout prompt');
    }

    const breakdown = await getWorkoutPromptBreakdown({
      userId: selectedUserId
    });
    if (breakdown) {
      setWorkoutBreakdown(breakdown);
    }
  };

  const handleSaveUserContext = async (value: string) => {
    if (!selectedUserId) return;

    const response = await fetch('/api/trainer/prompt-inspector/user', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: selectedUserId,
        agentContext: value
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save user context');
    }

    const breakdown = await getWorkoutPromptBreakdown({
      userId: selectedUserId
    });
    if (breakdown) {
      setWorkoutBreakdown({
        ...breakdown,
        userContext: breakdown.userContext,
        finalPrompt: breakdown.finalPrompt
      });
    }
  };

  // Load initial workout breakdown when user changes
  useEffect(() => {
    if (selectedUserId) {
      const loadInitialBreakdown = async () => {
        const breakdown = await getWorkoutPromptBreakdown({
          userId: selectedUserId,
          init: true
        });
        if (breakdown) {
          setWorkoutBreakdown(breakdown);
        }
      };
      loadInitialBreakdown();
    } else {
      setWorkoutBreakdown(null);
    }
  }, [selectedUserId, getWorkoutPromptBreakdown]);

  if (!selectedUserId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Dumbbell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Select a trainee to view their workout coach prompts</p>
      </div>
    );
  }

  if (loadingPrompt) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Building workout prompt...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!workoutBreakdown) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Error loading workout prompt</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Dumbbell className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Workout Coach Prompt</h2>
      </div>

      {/* Global Prompt Section */}
      <Editor
        title="Global Prompt"
        value={workoutBreakdown.globalPrompt}
        type="readonly"
        minHeight="120px"
        maxHeight="300px"
      />

      {/* User-Specific Prompt Section */}
      <Editor
        title="User-Specific Prompt"
        subtitle={
          workoutBreakdown.userPrompt ? '(Overrides Global)' : '(Not Set)'
        }
        value={workoutBreakdown.userPrompt || ''}
        type="editable"
        minHeight="120px"
        maxHeight="300px"
        onSave={handleSaveUserPrompt}
      />

      {/* User Context Section */}
      <Editor
        title="User Context"
        value={workoutBreakdown.userContext || ''}
        type="editable"
        minHeight="80px"
        maxHeight="200px"
        onSave={handleSaveUserContext}
      />

      {/* Workout Selection and Context */}
      <WorkoutSelector
        key={selectedUserId}
        selectedUserId={selectedUserId}
        workouts={workouts}
        onFinalPromptUpdate={(finalPrompt) => {
          setWorkoutBreakdown((prev) =>
            prev ? { ...prev, finalPrompt } : null
          );
        }}
      />

      <Editor
        title="Final Prompt (What the AI Sees)"
        value={workoutBreakdown.finalPrompt}
        type="readonly"
        minHeight="200px"
        maxHeight="600px"
      />

      <WorkoutInstructions />
    </div>
  );
}

interface WorkoutSelectorProps {
  selectedUserId: string;
  workouts: WorkoutOption[];
  onFinalPromptUpdate: (finalPrompt: string) => void;
}

function WorkoutSelector({
  workouts,
  selectedUserId,
  onFinalPromptUpdate
}: WorkoutSelectorProps) {
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>('');
  const [localWorkoutBreakdown, setLocalWorkoutBreakdown] =
    useState<WorkoutPromptBreakdown | null>(null);
  const [loadingWorkoutData, setLoadingWorkoutData] = useState<boolean>(false);

  const handleWorkoutSelection = async (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
    setLoadingWorkoutData(true);

    try {
      if (workoutId) {
        const response = await fetch(
          `/api/trainer/prompt-inspector/workout?userId=${selectedUserId}&workoutId=${workoutId}`
        );

        if (response.ok) {
          const data = await response.json();
          setLocalWorkoutBreakdown(data);
          onFinalPromptUpdate(data.finalPrompt);
        }
      }
    } catch (error) {
      console.error('Error selecting workout:', error);
    } finally {
      setLoadingWorkoutData(false);
    }
  };

  const handleSaveWorkoutContext = async (value: string) => {
    try {
      const response = await fetch('/api/trainer/prompt-inspector/workout', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workoutId: selectedWorkoutId,
          content: value
        })
      });
      if (response.ok) {
        const updatedData = await response.json();
        setLocalWorkoutBreakdown(updatedData);
        onFinalPromptUpdate(updatedData.finalPrompt);
      }
    } catch (error) {
      console.error('Error saving workout context:', error);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workout Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Workout
              </label>
              <Select
                options={workouts}
                value={selectedWorkoutId}
                onValueChange={handleWorkoutSelection}
                placeholder={'Choose a workout to view its prompt...'}
                className="max-w-md"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              This prompt includes global settings, user context, workout
              context, and exercise contexts
            </div>
          </div>
        </CardContent>
      </Card>

      <Editor
        title="Workout Context"
        value={localWorkoutBreakdown?.workoutContext || ''}
        type={selectedWorkoutId ? 'editable' : 'readonly'}
        minHeight="80px"
        maxHeight="200px"
        onSave={selectedWorkoutId ? handleSaveWorkoutContext : undefined}
      />

      {localWorkoutBreakdown?.exercises && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exercise Contexts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {localWorkoutBreakdown.exercises.map((exercise) => (
                <div key={exercise.id} className="p-4">
                  <Editor
                    className="border-none rounded-none border-gray-200 bg-white shadow-sm"
                    title={exercise.name}
                    value={exercise.agent_context || ''}
                    type="editable"
                    minHeight="60px"
                    maxHeight="150px"
                    onSave={async (value) => {
                      try {
                        const response = await fetch(
                          '/api/trainer/prompt-inspector/exercise',
                          {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              exerciseId: exercise.id,
                              content: value,
                              workoutId: selectedWorkoutId,
                              userId: selectedUserId
                            })
                          }
                        );

                        if (response.ok) {
                          const updatedData = await response.json();
                          setLocalWorkoutBreakdown(updatedData);
                          onFinalPromptUpdate(updatedData.finalPrompt);
                        }
                      } catch (error) {
                        console.error('Error saving exercise context:', error);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loadingWorkoutData && (
        <Card>
          <CardContent>
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">
                Loading workout data...
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function WorkoutInstructions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">How Workout Prompts Work</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
              1
            </div>
            <div>
              <p className="font-medium text-gray-900">Global Workout Prompt</p>
              <p>
                Base system prompt that defines the core behavior of the workout
                coach.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
              2
            </div>
            <div>
              <p className="font-medium text-gray-900">User Context</p>
              <p>
                Individual client information and preferences are added to
                personalize the workout experience.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
              3
            </div>
            <div>
              <p className="font-medium text-gray-900">Workout Context</p>
              <p>
                Specific workout information and exercise details are included
                for precise guidance during the session.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
              4
            </div>
            <div>
              <p className="font-medium text-gray-900">Exercise Contexts</p>
              <p>
                Individual exercise-specific instructions and modifications are
                added for each exercise in the workout.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
