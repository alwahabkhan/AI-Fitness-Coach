// import { z } from 'zod';
import { useState, useEffect, useCallback } from 'react';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

import { ChevronDown, ChevronRight, Info } from 'lucide-react';

import { Layout } from '@/components/layout/layout';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import {
  type UserOption,
  type WorkoutOption,
  type NutritionPromptBreakdown,
  type WorkoutPromptBreakdown,
  promptInspectorService
} from '@/lib/prompt-inspector';

interface PromptInspectorProps {
  user: UserWithoutPassword;
  users: UserOption[];
}

export default function PromptInspector({ user, users }: PromptInspectorProps) {
  const router = useRouter();
  const traineeId = router.query.traineeId as string;

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('program');

  // Collapse states
  const [userPromptOpen, setUserPromptOpen] = useState(true);
  const [userContextOpen, setUserContextOpen] = useState(true);
  const [programContextOpen, setProgramContextOpen] = useState(false);
  const [exerciseContextsOpen, setExerciseContextsOpen] = useState(false);
  const [finalPromptOpen, setFinalPromptOpen] = useState(true);

  // Tooltip states
  const [headerTooltipOpen, setHeaderTooltipOpen] = useState(false);
  const [globalPromptTooltipOpen, setGlobalPromptTooltipOpen] = useState(false);
  const [userContextTooltipOpen, setUserContextTooltipOpen] = useState(false);
  const [programContextTooltipOpen, setProgramContextTooltipOpen] =
    useState(false);
  const [exerciseContextsTooltipOpen, setExerciseContextsTooltipOpen] =
    useState(false);
  const [finalPromptTooltipOpen, setFinalPromptTooltipOpen] = useState(false);

  // Data states
  const [globalPrompt, setGlobalPrompt] = useState<string>('');
  const [nutritionBreakdown, setNutritionBreakdown] =
    useState<NutritionPromptBreakdown | null>(null);
  const [workoutBreakdown, setWorkoutBreakdown] =
    useState<WorkoutPromptBreakdown | null>(null);
  const [programs, setPrograms] = useState<WorkoutOption[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Edit states
  const [editingGlobalPrompt, setEditingGlobalPrompt] = useState<string>('');
  const [editingUserPrompt, setEditingUserPrompt] = useState<string>('');
  const [editingUserContext, setEditingUserContext] = useState<string>('');
  const [editingProgramContext, setEditingProgramContext] =
    useState<string>('');
  const [editingExercises, setEditingExercises] = useState<
    Record<string, string>
  >({});

  // Loading states for save buttons
  const [isSavingGlobalPrompt, setIsSavingGlobalPrompt] = useState(false);
  const [isSavingUserPrompt, setIsSavingUserPrompt] = useState(false);
  const [isSavingUserContext, setIsSavingUserContext] = useState(false);
  const [isSavingProgramContext, setIsSavingProgramContext] = useState(false);
  const [savingExerciseIds, setSavingExerciseIds] = useState<Set<string>>(
    new Set()
  );

  // Original global prompt for reset functionality
  const [originalGlobalPrompt, setOriginalGlobalPrompt] = useState<string>('');

  // User context edit mode
  const [isEditingUserContext, setIsEditingUserContext] = useState(false);
  const [isProgramContextEditing, setIsProgramContextEditing] = useState(false);
  const [editingExerciseIds, setEditingExerciseIds] = useState<Set<string>>(
    new Set()
  );

  // Load global prompt on mount (independent of user selection)
  useEffect(() => {
    const loadGlobalPrompt = async () => {
      try {
        const type = activeTab === 'nutrition' ? 'nutrition' : 'workout';
        const response = await fetch(
          `/api/trainer/prompt-inspector/global?type=${type}`
        );
        if (response.ok) {
          const data = await response.json();
          const promptContent = data.content || '';
          setGlobalPrompt(promptContent);
          setEditingGlobalPrompt(promptContent);
          setOriginalGlobalPrompt(promptContent);
        }
      } catch (error) {
        console.error('Error loading global prompt:', error);
      }
    };

    loadGlobalPrompt();
  }, [activeTab]);

  // Load nutrition breakdown
  const getNutritionBreakdown = useCallback(async (userId: string) => {
    try {
      const response = await fetch(
        `/api/trainer/prompt-inspector/nutrition?userId=${userId}`
      );
      if (!response.ok) return;
      const breakdown = await response.json();
      setNutritionBreakdown(breakdown);
      setEditingGlobalPrompt(breakdown.globalPrompt || '');
      setEditingUserPrompt(breakdown.userPrompt || '');
      setEditingUserContext(breakdown.userContext || '');
    } catch (error) {
      console.error('Error fetching nutrition breakdown:', error);
    }
  }, []);

  // Load workout breakdown
  const getWorkoutBreakdown = useCallback(
    async (userId: string, programId?: string) => {
      try {
        const url = programId
          ? `/api/trainer/prompt-inspector/workout?userId=${userId}&workoutId=${programId}`
          : `/api/trainer/prompt-inspector/workout?userId=${userId}`;

        const response = await fetch(url);
        if (!response.ok) return;
        const breakdown = await response.json();
        setWorkoutBreakdown(breakdown);
        setEditingGlobalPrompt(breakdown.globalPrompt || '');
        setEditingUserPrompt(breakdown.userPrompt || '');
        setEditingUserContext(breakdown.userContext || '');
        setEditingProgramContext(breakdown.workoutContext || '');

        // Initialize exercise editing states
        const exerciseEdits: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        breakdown.exercises?.forEach((ex: any) => {
          exerciseEdits[ex.id] = ex.agent_context || '';
        });
        setEditingExercises(exerciseEdits);
      } catch (error) {
        console.error('Error fetching workout breakdown:', error);
      }
    },
    []
  );

  // Load programs
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!traineeId) {
        setPrograms([]);
        return;
      }

      try {
        const response = await fetch(`/api/program?traineeId=${traineeId}`);
        if (!response.ok) return;
        const data = await response.json();
        // Transform programs data to match dropdown format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const programOptions = data.map((program: any) => ({
          value: program.id,
          label: program.name
        }));
        setPrograms(programOptions);
      } catch (error) {
        console.error('Error fetching programs:', error);
      }
    };

    fetchPrograms();
  }, [traineeId]);
  // Load data when trainee or tab changes
  useEffect(() => {
    if (traineeId) {
      setLoading(true);
      if (activeTab === 'nutrition') {
        getNutritionBreakdown(traineeId).finally(() => setLoading(false));
      } else {
        getWorkoutBreakdown(traineeId, selectedProgramId || undefined).finally(
          () => setLoading(false)
        );
      }
    }
  }, [
    traineeId,
    activeTab,
    selectedProgramId,
    getNutritionBreakdown,
    getWorkoutBreakdown
  ]);

  // Save handlers
  const handleSaveGlobalPrompt = async () => {
    setIsSavingGlobalPrompt(true);
    try {
      const type = activeTab === 'nutrition' ? 'nutrition' : 'workout';
      const response = await fetch(
        `/api/trainer/prompt-inspector/global?type=${type}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editingGlobalPrompt })
        }
      );

      if (response.ok) {
        setGlobalPrompt(editingGlobalPrompt);
        setOriginalGlobalPrompt(editingGlobalPrompt);
        // Reload the breakdown to reflect the new global prompt
        if (traineeId) {
          if (activeTab === 'nutrition') {
            await getNutritionBreakdown(traineeId);
          } else {
            await getWorkoutBreakdown(
              traineeId,
              selectedProgramId || undefined
            );
          }
        }
      } else {
        const error = await response.json();
        console.error('Error saving global prompt:', error);
        alert(
          'Failed to save global prompt: ' + (error.error || 'Unknown error')
        );
      }
    } catch (error) {
      console.error('Error saving global prompt:', error);
      alert('Failed to save global prompt');
    } finally {
      setIsSavingGlobalPrompt(false);
    }
  };

  const handleSaveUserPrompt = async () => {
    if (!traineeId) return;

    setIsSavingUserPrompt(true);
    try {
      const endpoint =
        activeTab === 'nutrition'
          ? '/api/trainer/prompt-inspector/nutrition'
          : '/api/trainer/prompt-inspector/workout';

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: traineeId,
          content: editingUserPrompt
        })
      });

      if (response.ok) {
        if (activeTab === 'nutrition') {
          await getNutritionBreakdown(traineeId);
        } else {
          await getWorkoutBreakdown(traineeId, selectedProgramId || undefined);
        }
      }
    } catch (error) {
      console.error('Error saving user prompt:', error);
    } finally {
      setIsSavingUserPrompt(false);
    }
  };

  const handleSaveUserContext = async () => {
    if (!traineeId) return;

    setIsSavingUserContext(true);
    try {
      const response = await fetch('/api/trainer/prompt-inspector/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: traineeId,
          agentContext: editingUserContext
        })
      });

      if (response.ok) {
        setIsEditingUserContext(false);
        if (activeTab === 'nutrition') {
          await getNutritionBreakdown(traineeId);
        } else {
          await getWorkoutBreakdown(traineeId, selectedProgramId || undefined);
        }
      }
    } catch (error) {
      console.error('Error saving user context:', error);
    } finally {
      setIsSavingUserContext(false);
    }
  };

  const handleSaveProgramContext = async () => {
    if (!selectedProgramId) return;

    setIsSavingProgramContext(true);
    try {
      const response = await fetch('/api/trainer/prompt-inspector/workout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutId: selectedProgramId,
          content: editingProgramContext
        })
      });

      if (response.ok) {
        setIsProgramContextEditing(false);
        await getWorkoutBreakdown(traineeId, selectedProgramId);
      }
    } catch (error) {
      console.error('Error saving program context:', error);
    } finally {
      setIsSavingProgramContext(false);
    }
  };

  const handleSaveExerciseContext = async (exerciseId: string) => {
    setSavingExerciseIds((prev) => new Set(prev).add(exerciseId));
    try {
      const response = await fetch('/api/trainer/prompt-inspector/exercise', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId,
          content: editingExercises[exerciseId]
        })
      });

      if (response.ok) {
        setEditingExerciseIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(exerciseId);
          return newSet;
        });
        await getWorkoutBreakdown(traineeId, selectedProgramId);
      }
    } catch (error) {
      console.error('Error saving exercise context:', error);
    } finally {
      setSavingExerciseIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(exerciseId);
        return newSet;
      });
    }
  };

  const currentBreakdown =
    activeTab === 'nutrition' ? nutritionBreakdown : workoutBreakdown;

  return (
    <Layout user={user}>
      <div className="max-w-[1024px] flex-1 px-4 sm:px-0 overflow-hidden">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-gray-900 mr-2">
              Prompt Inspector
            </h1>

            <div
              className="relative group cursor-pointer"
              onClick={() => setHeaderTooltipOpen(!headerTooltipOpen)}
              onBlur={() => setHeaderTooltipOpen(false)}
              tabIndex={0}
            >
              <Info className="h-4 w-4 text-gray-400" />

              <div
                className={`absolute w-72 top-8 z-12 left-[-220px] 
                sm:left-1/2 sm:-translate-x-1/2 
                bg-[#e9f2ff] text-gray-900 rounded-2xl shadow-md border border-[#d6e3ff] py-3 px-4 transition-opacity duration-300 pointer-events-none 
                ${headerTooltipOpen ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}
              >
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="text-blue-600 font-semibold bg-gray-200 h-6 w-10 rounded-full flex items-center justify-center">
                      1
                    </span>
                    <div>
                      <p className="font-semibold">Global Prompts</p>
                      <p className="text-gray-700">
                        Base system prompts that define the core behavior of
                        each AI coach.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="text-blue-600 font-semibold bg-gray-200 h-6 w-14 rounded-full flex items-center justify-center">
                      2
                    </span>
                    <div>
                      <p className="font-semibold">User Context</p>
                      <p className="text-gray-700">
                        Individual client information and preferences are added
                        to personalize the experience.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="text-blue-600 font-semibold bg-gray-200 rounded-full h-6 w-14 flex items-center justify-center">
                      3
                    </span>
                    <div>
                      <p className="font-semibold">Program Context</p>
                      <p className="text-gray-700">
                        For program coaches, specific program and exercise
                        information is included for precise guidance.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          <p className="text-gray-600 mt-2">
            Configure AI coaching prompts for your trainees&apos; programs
          </p>
        </div>

        <div className="w-full space-y-6">
          <div className="p-4 sm:p-6 max-w-5xl mx-auto text-sm text-gray-800 w-[98%] sm:w-full">
            {/* Top Right Tabs */}
            <div className="flex justify-end">
              <div className="flex justify-end mb-4 gap-2 bg-gray-200 p-1 rounded-md">
                <button
                  onClick={() => setActiveTab('program')}
                  className={`px-3 py-1.5 border rounded-md text-gray-700 transition 
                    ${
                      activeTab === 'program'
                        ? 'bg-white border-gray-300 shadow-sm'
                        : 'bg-gray-200 border-gray-200 hover:bg-gray-300'
                    }`}
                >
                  Program Coach
                </button>

                <button
                  onClick={() => setActiveTab('nutrition')}
                  className={`px-3 py-1.5 border rounded-md text-gray-700 transition 
                    ${
                      activeTab === 'nutrition'
                        ? 'bg-white border-gray-300 shadow-sm'
                        : 'bg-gray-200 border-gray-200 hover:bg-gray-300'
                    }`}
                >
                  Nutrition Coach
                </button>
              </div>
            </div>

            {/* Global Module Prompt */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <h2 className="font-medium text-gray-900">
                    Global Module (Chat) Prompt
                  </h2>
                  <div
                    className="relative group cursor-pointer"
                    onClick={() =>
                      setGlobalPromptTooltipOpen(!globalPromptTooltipOpen)
                    }
                    onBlur={() => setGlobalPromptTooltipOpen(false)}
                    tabIndex={0}
                  >
                    <Info className="h-4 w-4 text-gray-400" />
                    <span
                      className={`absolute w-54 -top-14 left-1/2 mb-12 -translate-x-1/2 bg-blue-600 text-white text-xs rounded-xl py-2 px-3 transition duration-300 pointer-events-none after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-t-blue-600 after:border-x-transparent after:border-b-transparent
                      ${globalPromptTooltipOpen ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}
                    >
                      This prompt is applied to all module-based chat
                      interactions.
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-500 mb-3 text-xs">
                This prompt is applied to all module-based chat interactions
                across all programs and trainees.
              </p>

              <textarea
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }
                }}
                value={editingGlobalPrompt}
                onChange={(e) => setEditingGlobalPrompt(e.target.value)}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = el.scrollHeight + 'px';
                }}
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
                placeholder="Enter global prompt..."
              />

              <div className="flex items-center justify-between gap-2 flex-wrap mt-3">
                <div>
                  <button
                    onClick={() => setEditingGlobalPrompt(originalGlobalPrompt)}
                    className="border flex border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-100"
                  >
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 19 19"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2.29297 9.17495C2.29297 10.536 2.69656 11.8664 3.45271 12.9981C4.20886 14.1298 5.2836 15.0118 6.54103 15.5326C7.79846 16.0535 9.1821 16.1897 10.517 15.9242C11.8519 15.6587 13.078 15.0033 14.0404 14.0409C15.0028 13.0785 15.6582 11.8523 15.9237 10.5175C16.1893 9.18258 16.053 7.79895 15.5321 6.54152C15.0113 5.28409 14.1293 4.20935 12.9976 3.4532C11.866 2.69705 10.5355 2.29346 9.17446 2.29346C7.25067 2.30069 5.40414 3.05136 4.02099 4.38849L2.29297 6.11651"
                        stroke="#0A0A0A"
                        strokeWidth="1.52922"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2.29297 2.29346V6.11651H6.11602"
                        stroke="#0A0A0A"
                        strokeWidth="1.52922"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="ml-1">Reset to Original</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingGlobalPrompt(globalPrompt)}
                    className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-100"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSaveGlobalPrompt}
                    disabled={isSavingGlobalPrompt}
                    className="flex justify-center items-center bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingGlobalPrompt ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1" />
                        <span className="ml-1">Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          width="19"
                          height="19"
                          viewBox="0 0 19 19"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.6212 2.29346C12.0246 2.2992 12.4093 2.4641 12.6917 2.75222L15.5972 5.65774C15.8853 5.94008 16.0502 6.32484 16.056 6.7282V14.5272C16.056 14.9328 15.8948 15.3218 15.6081 15.6085C15.3213 15.8953 14.9323 16.0564 14.5267 16.0564H3.82219C3.41661 16.0564 3.02765 15.8953 2.74087 15.6085C2.45408 15.3218 2.29297 14.9328 2.29297 14.5272V3.82268C2.29297 3.4171 2.45408 3.02814 2.74087 2.74136C3.02765 2.45457 3.41661 2.29346 3.82219 2.29346H11.6212Z"
                            stroke="white"
                            strokeWidth="1.52922"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12.9977 16.0568V10.7046C12.9977 10.5018 12.9171 10.3073 12.7737 10.1639C12.6303 10.0205 12.4358 9.93994 12.2331 9.93994H6.11617C5.91339 9.93994 5.7189 10.0205 5.57551 10.1639C5.43212 10.3073 5.35156 10.5018 5.35156 10.7046V16.0568"
                            stroke="white"
                            strokeWidth="1.52922"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5.35156 2.29346V5.3519C5.35156 5.55469 5.43212 5.74917 5.57551 5.89256C5.7189 6.03595 5.91339 6.11651 6.11617 6.11651H11.4684"
                            stroke="white"
                            strokeWidth="1.52922"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="ml-1">Save Global Prompts</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Select Configuration */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11.1135 4.75328C11.1768 4.0872 11.4862 3.46865 11.9811 3.01847C12.4761 2.5683 13.1212 2.31885 13.7903 2.31885C14.4594 2.31885 15.1044 2.5683 15.5994 3.01847C16.0944 3.46865 16.4038 4.0872 16.4671 4.75328C16.5051 5.18356 16.6463 5.59834 16.8786 5.96251C17.1109 6.32668 17.4275 6.62952 17.8017 6.84539C18.1758 7.06127 18.5965 7.18383 19.028 7.2027C19.4596 7.22156 19.8893 7.13618 20.2809 6.95378C20.8889 6.67774 21.5778 6.6378 22.2137 6.84173C22.8495 7.04565 23.3867 7.47886 23.7207 8.05703C24.0547 8.63519 24.1617 9.31696 24.0208 9.96964C23.8798 10.6223 23.5011 11.1992 22.9583 11.5881C22.6048 11.8361 22.3162 12.1656 22.117 12.5487C21.9178 12.9318 21.8138 13.3573 21.8138 13.7891C21.8138 14.221 21.9178 14.6464 22.117 15.0295C22.3162 15.4127 22.6048 15.7422 22.9583 15.9902C23.5011 16.379 23.8798 16.9559 24.0208 17.6086C24.1617 18.2613 24.0547 18.9431 23.7207 19.5212C23.3867 20.0994 22.8495 20.5326 22.2137 20.7365C21.5778 20.9405 20.8889 20.9005 20.2809 20.6245C19.8893 20.4421 19.4596 20.3567 19.028 20.3756C18.5965 20.3944 18.1758 20.517 17.8017 20.7329C17.4275 20.9487 17.1109 21.2516 16.8786 21.6158C16.6463 21.9799 16.5051 22.3947 16.4671 22.825C16.4038 23.4911 16.0944 24.1096 15.5994 24.5598C15.1044 25.01 14.4594 25.2594 13.7903 25.2594C13.1212 25.2594 12.4761 25.01 11.9811 24.5598C11.4862 24.1096 11.1768 23.4911 11.1135 22.825C11.0755 22.3946 10.9343 21.9796 10.7019 21.6153C10.4696 21.251 10.1528 20.9481 9.7785 20.7322C9.40419 20.5163 8.98337 20.3938 8.55167 20.375C8.11997 20.3563 7.69011 20.4418 7.2985 20.6245C6.6905 20.9005 6.00155 20.9405 5.36573 20.7365C4.72991 20.5326 4.19271 20.0994 3.85868 19.5212C3.52465 18.9431 3.4177 18.2613 3.55863 17.6086C3.69956 16.9559 4.07829 16.379 4.62112 15.9902C4.9746 15.7422 5.26315 15.4127 5.46235 15.0295C5.66156 14.6464 5.76556 14.221 5.76556 13.7891C5.76556 13.3573 5.66156 12.9318 5.46235 12.5487C5.26315 12.1656 4.9746 11.8361 4.62112 11.5881C4.07905 11.199 3.70099 10.6224 3.5604 9.97012C3.41981 9.31788 3.52674 8.63667 3.8604 8.05887C4.19407 7.48108 4.73064 7.04798 5.36583 6.84374C6.00102 6.63951 6.68946 6.67873 7.29735 6.95378C7.68891 7.13618 8.11865 7.22156 8.5502 7.2027C8.98175 7.18383 9.4024 7.06127 9.77655 6.84539C10.1507 6.62952 10.4673 6.32668 10.6996 5.96251C10.932 5.59834 11.0731 5.18356 11.1112 4.75328"
                    stroke="#364153"
                    strokeWidth="2.29818"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.7891 17.2363C15.6929 17.2363 17.2363 15.6929 17.2363 13.7891C17.2363 11.8852 15.6929 10.3418 13.7891 10.3418C11.8852 10.3418 10.3418 11.8852 10.3418 13.7891C10.3418 15.6929 11.8852 17.2363 13.7891 17.2363Z"
                    stroke="#364153"
                    strokeWidth="2.29818"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-gray-900 font-medium">
                  Select Configuration
                </span>
              </div>

              <label className="block text-gray-700 mb-1 text-sm">
                Trainee
              </label>
              <select
                value={traineeId || ''}
                onChange={(e) =>
                  router.push(
                    `/admin/prompt-inspector?traineeId=${e.target.value}`
                  )
                }
                className="border border-gray-300 rounded-md p-2 text-sm w-60 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-200"
              >
                <option value="">Select a trainee...</option>
                {users.map((user) => (
                  <option key={user.value} value={user.value}>
                    {user.label}
                  </option>
                ))}
              </select>
            </div>

            {traineeId && (
              <>
                {/* User Specific Prompt */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                  <div className="flex items-center justify-between w-full text-gray-900 font-medium flex-wrap">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setUserPromptOpen(!userPromptOpen)}
                    >
                      {userPromptOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <span>User-Specific Prompt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setEditingUserPrompt(
                            currentBreakdown?.userPrompt || ''
                          )
                        }
                        className="text-sm text-gray-700 border-1 border-gray-200 rounded-md p-1 hover:underline"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveUserPrompt}
                        disabled={isSavingUserPrompt}
                        className="flex bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingUserPrompt ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            <span className="ml-1">Saving...</span>
                          </>
                        ) : (
                          <>
                            <svg
                              width="19"
                              height="19"
                              viewBox="0 0 19 19"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M11.6212 2.29346C12.0246 2.2992 12.4093 2.4641 12.6917 2.75222L15.5972 5.65774C15.8853 5.94008 16.0502 6.32484 16.056 6.7282V14.5272C16.056 14.9328 15.8948 15.3218 15.6081 15.6085C15.3213 15.8953 14.9323 16.0564 14.5267 16.0564H3.82219C3.41661 16.0564 3.02765 15.8953 2.74087 15.6085C2.45408 15.3218 2.29297 14.9328 2.29297 14.5272V3.82268C2.29297 3.4171 2.45408 3.02814 2.74087 2.74136C3.02765 2.45457 3.41661 2.29346 3.82219 2.29346H11.6212Z"
                                stroke="white"
                                strokeWidth="1.52922"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M12.9977 16.0568V10.7046C12.9977 10.5018 12.9171 10.3073 12.7737 10.1639C12.6303 10.0205 12.4358 9.93994 12.2331 9.93994H6.11617C5.91339 9.93994 5.7189 10.0205 5.57551 10.1639C5.43212 10.3073 5.35156 10.5018 5.35156 10.7046V16.0568"
                                stroke="white"
                                strokeWidth="1.52922"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M5.35156 2.29346V5.3519C5.35156 5.55469 5.43212 5.74917 5.57551 5.89256C5.7189 6.03595 5.91339 6.11651 6.11617 6.11651H11.4684"
                                stroke="white"
                                strokeWidth="1.52922"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <span className="ml-1">Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {userPromptOpen && (
                    <div className="bg-gray-200 p-2 mt-1 rounded-md">
                      <textarea
                        value={editingUserPrompt}
                        onChange={(e) => setEditingUserPrompt(e.target.value)}
                        onInput={(e) => {
                          const el = e.currentTarget;
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                        }}
                        className="w-full border bg-white border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden mt-2"
                        placeholder="Add user-specific prompt..."
                      />
                    </div>
                  )}
                </div>

                {/* User Context */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
                  <div className="flex items-center justify-between w-full text-gray-900 font-medium">
                    <div
                      className="flex items-center gap-1 cursor-pointer"
                      onClick={() => setUserContextOpen(!userContextOpen)}
                    >
                      {userContextOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <span>User-Context</span>
                      <div
                        className="relative group cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserContextTooltipOpen(!userContextTooltipOpen);
                        }}
                        onBlur={() => setUserContextTooltipOpen(false)}
                        tabIndex={0}
                      >
                        <Info className="h-4 w-4 text-gray-400" />
                        <span
                          className={`absolute w-[70vw] max-w-sm -top-18 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs rounded-xl py-2 px-3 transition duration-300 pointer-events-none after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-t-blue-600 after:border-x-transparent after:border-b-transparent
                          ${userContextTooltipOpen ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}
                        >
                          Individual client information and preferences are
                          added to personalise the program experience.
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setIsEditingUserContext(!isEditingUserContext)
                      }
                      className="flex items-center gap-1 text-gray-700 text-sm hover:underline"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g clipPath="url(#clip0_273_11133)">
                          <path
                            d="M14.1166 4.54126C14.4691 4.18888 14.6671 3.71091 14.6672 3.2125C14.6673 2.71409 14.4693 2.23607 14.1169 1.8836C13.7646 1.53112 13.2866 1.33307 12.7882 1.33301C12.2898 1.33295 11.8117 1.53088 11.4593 1.88326L2.56194 10.7826C2.40715 10.9369 2.29268 11.127 2.22861 11.3359L1.34794 14.2373C1.33071 14.2949 1.32941 14.3562 1.34417 14.4145C1.35894 14.4728 1.38922 14.5261 1.4318 14.5686C1.47439 14.6111 1.52769 14.6413 1.58605 14.656C1.6444 14.6707 1.70565 14.6693 1.76327 14.6519L4.66527 13.7719C4.87405 13.7084 5.06406 13.5947 5.21861 13.4406L14.1166 4.54126Z"
                            stroke="#0A0A0A"
                            strokeWidth="1.33333"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_273_11133">
                            <rect width="16" height="16" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>
                      <span>Edit</span>
                    </button>
                  </div>

                  {userContextOpen && (
                    <>
                      {isEditingUserContext ? (
                        <div className="mt-3">
                          <textarea
                            value={editingUserContext}
                            onChange={(e) =>
                              setEditingUserContext(e.target.value)
                            }
                            onInput={(e) => {
                              const el = e.currentTarget;
                              el.style.height = 'auto';
                              el.style.height = el.scrollHeight + 'px';
                            }}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
                            placeholder="Add user context..."
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            <button
                              onClick={() => {
                                setIsEditingUserContext(false);
                                setEditingUserContext(
                                  currentBreakdown?.userContext || ''
                                );
                              }}
                              className="text-sm text-gray-700 px-3 py-1 rounded-md hover:underline"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveUserContext}
                              disabled={isSavingUserContext}
                              className="flex bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSavingUserContext ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1" />
                                  Saving...
                                </>
                              ) : (
                                'Save'
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-600 text-sm mt-2">
                          {currentBreakdown?.userContext ||
                            'No user context set.'}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Program-specific sections */}
                {activeTab === 'program' && (
                  <>
                    {/* Select Program */}
                    <div className="mb-6">
                      <label className="block text-gray-700 mb-1 text-sm">
                        Select Program
                      </label>
                      <select
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        className="border border-gray-300 rounded-md p-2 text-sm w-60 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-200"
                      >
                        <option value="">Select a program...</option>
                        {programs.map((program) => (
                          <option key={program.value} value={program.value}>
                            {program.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedProgramId && (
                      <>
                        <p className="text-gray-500 mb-3 text-xs">
                          This prompt includes global settings, user context,
                          program context, and exercise contexts
                        </p>

                        {/* Program Context */}
                        {/* dropdown fixed */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                          <div className="flex items-center justify-between w-full text-gray-900 font-medium">
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={(e) => {
                                // Prevent event bubbling
                                e.stopPropagation();
                                setProgramContextOpen(!programContextOpen);
                              }}
                            >
                              {programContextOpen ? (
                                <ChevronDown
                                  className="w-4 h-4 text-gray-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProgramContextOpen(false);
                                  }}
                                />
                              ) : (
                                <ChevronRight
                                  className="w-4 h-4 text-gray-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProgramContextOpen(true);
                                  }}
                                />
                              )}
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProgramContextOpen(!programContextOpen);
                                }}
                              >
                                Program Context
                              </span>
                              <div
                                className="relative group cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProgramContextTooltipOpen(
                                    !programContextTooltipOpen
                                  );
                                }}
                                onBlur={() =>
                                  setProgramContextTooltipOpen(false)
                                }
                                tabIndex={0}
                              >
                                <Info className="h-4 w-4 text-gray-400" />
                                <span
                                  className={`absolute w-[70vw] max-w-sm -top-18 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs rounded-xl py-2 px-3 transition duration-300 pointer-events-none after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-t-blue-600 after:border-x-transparent after:border-b-transparent
          ${programContextTooltipOpen ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}
                                >
                                  Specific program information and exercise
                                  details are included for precise guidance
                                  during the session.
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsProgramContextEditing(
                                  !isProgramContextEditing
                                );
                              }}
                              className="flex items-center gap-1 text-gray-700 text-sm hover:underline"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <g clipPath="url(#clip0_273_11133)">
                                  <path
                                    d="M14.1166 4.54126C14.4691 4.18888 14.6671 3.71091 14.6672 3.2125C14.6673 2.71409 14.4693 2.23607 14.1169 1.8836C13.7646 1.53112 13.2866 1.33307 12.7882 1.33301C12.2898 1.33295 11.8117 1.53088 11.4593 1.88326L2.56194 10.7826C2.40715 10.9369 2.29268 11.127 2.22861 11.3359L1.34794 14.2373C1.33071 14.2949 1.32941 14.3562 1.34417 14.4145C1.35894 14.4728 1.38922 14.5261 1.4318 14.5686C1.47439 14.6111 1.52769 14.6413 1.58605 14.656C1.6444 14.6707 1.70565 14.6693 1.76327 14.6519L4.66527 13.7719C4.87405 13.7084 5.06406 13.5947 5.21861 13.4406L14.1166 4.54126Z"
                                    stroke="#0A0A0A"
                                    strokeWidth="1.33333"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </g>
                                <defs>
                                  <clipPath id="clip0_273_11133">
                                    <rect width="16" height="16" fill="white" />
                                  </clipPath>
                                </defs>
                              </svg>
                              <span>Edit</span>
                            </button>
                          </div>

                          {/* Conditionally show content when expanded */}
                          {programContextOpen && (
                            <div className="mt-3">
                              {isProgramContextEditing ? (
                                <div>
                                  <textarea
                                    value={editingProgramContext}
                                    onChange={(e) =>
                                      setEditingProgramContext(e.target.value)
                                    }
                                    onInput={(e) => {
                                      const el = e.currentTarget;
                                      el.style.height = 'auto';
                                      el.style.height = el.scrollHeight + 'px';
                                    }}
                                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
                                    placeholder="Add program context..."
                                  />
                                  <div className="flex gap-2 mt-2 justify-end">
                                    <button
                                      onClick={() => {
                                        setIsProgramContextEditing(false);
                                        setEditingProgramContext(
                                          workoutBreakdown?.workoutContext || ''
                                        );
                                      }}
                                      className="text-sm text-gray-700 px-3 py-1 rounded-md hover:underline"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={handleSaveProgramContext}
                                      disabled={isSavingProgramContext}
                                      className="flex bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isSavingProgramContext ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1" />
                                          Saving...
                                        </>
                                      ) : (
                                        'Save'
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-gray-600 text-sm">
                                  {workoutBreakdown?.workoutContext ||
                                    'No program context set.'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Exercise Contexts */}
                        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                          <div className="flex items-center justify-between w-full text-gray-900 font-medium">
                            <div
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() =>
                                setExerciseContextsOpen(!exerciseContextsOpen)
                              }
                            >
                              {exerciseContextsOpen ? (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              )}
                              <span>Exercise Contexts</span>
                              <div
                                className="relative group cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExerciseContextsTooltipOpen(
                                    !exerciseContextsTooltipOpen
                                  );
                                }}
                                onBlur={() =>
                                  setExerciseContextsTooltipOpen(false)
                                }
                                tabIndex={0}
                              >
                                <Info className="h-4 w-4 text-gray-400" />
                                <span
                                  className={`absolute w-[70vw] max-w-sm -top-18 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs rounded-xl py-2 px-3 transition duration-300 pointer-events-none after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-t-blue-600 after:border-x-transparent after:border-b-transparent
                                  ${exerciseContextsTooltipOpen ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}
                                >
                                  Individual exercise-specific instructions and
                                  modifications are added for each exercise in
                                  the program.
                                </span>
                              </div>
                            </div>
                          </div>

                          {exerciseContextsOpen && (
                            <div className="space-y-4 mt-4">
                              {workoutBreakdown?.exercises?.map((exercise) => (
                                <div key={exercise.id}>
                                  <div className="flex justify-between items-center mb-1">
                                    <span>{exercise.name}</span>
                                    <button
                                      onClick={() => {
                                        setEditingExerciseIds((prev) => {
                                          const newSet = new Set(prev);
                                          if (newSet.has(exercise.id)) {
                                            newSet.delete(exercise.id);
                                          } else {
                                            newSet.add(exercise.id);
                                          }
                                          return newSet;
                                        });
                                      }}
                                      className="flex text-sm text-gray-700 hover:underline"
                                    >
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                      >
                                        <g clipPath="url(#clip0_273_11133)">
                                          <path
                                            d="M14.1166 4.54126C14.4691 4.18888 14.6671 3.71091 14.6672 3.2125C14.6673 2.71409 14.4693 2.23607 14.1169 1.8836C13.7646 1.53112 13.2866 1.33307 12.7882 1.33301C12.2898 1.33295 11.8117 1.53088 11.4593 1.88326L2.56194 10.7826C2.40715 10.9369 2.29268 11.127 2.22861 11.3359L1.34794 14.2373C1.33071 14.2949 1.32941 14.3562 1.34417 14.4145C1.35894 14.4728 1.38922 14.5261 1.4318 14.5686C1.47439 14.6111 1.52769 14.6413 1.58605 14.656C1.6444 14.6707 1.70565 14.6693 1.76327 14.6519L4.66527 13.7719C4.87405 13.7084 5.06406 13.5947 5.21861 13.4406L14.1166 4.54126Z"
                                            stroke="#0A0A0A"
                                            strokeWidth="1.33333"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </g>
                                        <defs>
                                          <clipPath id="clip0_273_11133">
                                            <rect
                                              width="16"
                                              height="16"
                                              fill="white"
                                            />
                                          </clipPath>
                                        </defs>
                                      </svg>
                                      <span className="ml-1">Edit</span>
                                    </button>
                                  </div>
                                  {editingExerciseIds.has(exercise.id) ? (
                                    <>
                                      <textarea
                                        value={
                                          editingExercises[exercise.id] || ''
                                        }
                                        onChange={(e) =>
                                          setEditingExercises((prev) => ({
                                            ...prev,
                                            [exercise.id]: e.target.value
                                          }))
                                        }
                                        onInput={(e) => {
                                          const el = e.currentTarget;
                                          el.style.height = 'auto';
                                          el.style.height =
                                            el.scrollHeight + 'px';
                                        }}
                                        placeholder="Add exercise context..."
                                        className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
                                      />
                                      <div className="flex gap-2 mt-2 justify-end">
                                        <button
                                          onClick={() => {
                                            setEditingExerciseIds((prev) => {
                                              const newSet = new Set(prev);
                                              newSet.delete(exercise.id);
                                              return newSet;
                                            });
                                            setEditingExercises((prev) => ({
                                              ...prev,
                                              [exercise.id]:
                                                exercise.agent_context || ''
                                            }));
                                          }}
                                          className="text-sm text-gray-700 px-3 py-1 rounded-md hover:underline"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleSaveExerciseContext(
                                              exercise.id
                                            )
                                          }
                                          disabled={savingExerciseIds.has(
                                            exercise.id
                                          )}
                                          className="flex bg-blue-600 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {savingExerciseIds.has(
                                            exercise.id
                                          ) ? (
                                            <>
                                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-1" />
                                              Saving...
                                            </>
                                          ) : (
                                            'Save'
                                          )}
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-gray-600 text-sm">
                                      {exercise.agent_context ||
                                        'No context set.'}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Final Prompt */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
                  <div className="flex items-center justify-between w-full text-gray-900 font-medium">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setFinalPromptOpen(!finalPromptOpen)}
                    >
                      {finalPromptOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <div>
                        <span>Final Prompt </span>
                        <br />
                        <span className="text-xs">(What the AI Sees)</span>
                      </div>
                      <div
                        className="relative group cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFinalPromptTooltipOpen(!finalPromptTooltipOpen);
                        }}
                        onBlur={() => setFinalPromptTooltipOpen(false)}
                        tabIndex={0}
                      >
                        <Info className="h-4 w-4 text-gray-400 -translate-y-1/2" />
                        <span
                          className={`absolute w-[70vw] max-w-sm -top-12 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs rounded-xl py-2 px-3 transition duration-300 pointer-events-none after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-t-blue-600 after:border-x-transparent after:border-b-transparent
                          ${finalPromptTooltipOpen ? 'opacity-100 visible' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}
                        >
                          Combined final prompt seen by the AI.
                        </span>
                      </div>
                    </div>
                  </div>
                  {finalPromptOpen && (
                    <textarea
                      readOnly
                      value={currentBreakdown?.finalPrompt || ''}
                      className="w-full border border-gray-300 rounded-md p-3 text-sm font-mono leading-relaxed mt-3 h-72 overflow-y-auto focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                    />
                  )}
                </div>
              </>
            )}

            {loading && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
                  <p className="text-gray-700 font-medium">
                    Loading prompt data...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = getCurrentUserFromContext(context);

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  let users: UserOption[] = [];

  try {
    users = await promptInspectorService.getTrainees(user);
  } catch (error) {
    console.error('Error fetching users in getServerSideProps:', error);
  }

  return {
    props: {
      user,
      users
    }
  };
};
