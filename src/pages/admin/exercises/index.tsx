import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { 
  Dumbbell, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  X,
  Play
} from 'lucide-react';

import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ExerciseModal from '@/components/admin/exercise-modal';

import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import { 
  CentralizedExercise,
  MainMuscleType,
  createCentralizedExerciseService 
} from '@/lib/centralized_exercise';
import { createAdminSupabase } from '@/lib/supabase';
import VideoModal from '@/components/admin/video-modal';

interface ExerciseManagementProps {
  user: UserWithoutPassword;
  initialExercises: CentralizedExercise[];
  totalCount: number;
}

// Map muscle group categories to MainMuscleType values
const MUSCLE_GROUP_MAP: Record<string, MainMuscleType[]> = {
  'Back': ['Back1', 'Back2', 'Low back'],
  'Lats': ['Lats1', 'Lats2'],
  'Chest': ['Chest1', 'Chest2'],
  'Legs': ['Quads1', 'Quads2', 'Tibialis', 'Hams1', 'Hams2'],
  'Glutes': ['Glutes1', 'Glutes2'],
  'Shoulders': ['Shoulders1', 'Shoulders2'],
  'Arms': ['Biceps', 'Triceps', 'Forearm']
};

const MUSCLE_GROUPS = Object.keys(MUSCLE_GROUP_MAP);

export default function ExerciseManagement({
  user: currentUser,
  initialExercises,
  totalCount: initialTotalCount
}: ExerciseManagementProps) {
  const [exercises, setExercises] = useState<CentralizedExercise[]>(initialExercises);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('all');
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<CentralizedExercise | null>(null);
  const [videoModalExercise, setVideoModalExercise] = useState<CentralizedExercise | null>(null);  // Add this line

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch = 
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exercise.short_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exercise.prompt_exercise_description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMuscleGroup = selectedMuscleGroup === 'all' || 
      (exercise.main_muscle && MUSCLE_GROUP_MAP[selectedMuscleGroup]?.includes(exercise.main_muscle));

    return matchesSearch && matchesMuscleGroup;
  });

  const fetchExercises = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/exercises');
      
      if (!response.ok) {
        throw new Error('Failed to fetch exercises');
      }
      
      const { exercises, totalCount } = await response.json();
      setExercises(exercises);
      setTotalCount(totalCount);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExercise = async (exerciseData: Partial<CentralizedExercise>) => {
    try {
      const response = await fetch('/api/admin/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exerciseData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create exercise');
      }
      
      await fetchExercises();
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating exercise:', error);
      throw error;
    }
  };

  const handleUpdateExercise = async (id: string, exerciseData: Partial<CentralizedExercise>) => {
    try {
      const response = await fetch(`/api/admin/exercises/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exerciseData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update exercise');
      }
      
      await fetchExercises();
      setEditingExercise(null);
    } catch (error) {
      console.error('Error updating exercise:', error);
      alert('Failed to update exercise. Please try again.');
    }
  };

  const handleDeleteExercise = async (exercise: CentralizedExercise) => {
    if (!confirm(`Are you sure you want to delete "${exercise.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/exercises/${exercise.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete exercise');
      }
      
      await fetchExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
      alert('Failed to delete exercise. Please try again.');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedMuscleGroup('all');
  };

  const hasActiveFilters = searchTerm !== '' || selectedMuscleGroup !== 'all';

  return (
    <Layout user={currentUser}>
      <div className="container flex-1 px-4 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Exercise Management</h1>
              <p className="text-gray-600 mt-2">
                Manage exercises in the centralized database. Total: {totalCount} exercises
              </p>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 max-w-64 self-end"
            >
              <Plus className="h-4 w-4" />
              Create New Exercise
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search exercises by name, short name, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-64">
                <select
                  value={selectedMuscleGroup}
                  onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Muscle Groups</option>
                  {MUSCLE_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exercises Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Exercises ({filteredExercises.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading exercises...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Exercise Name
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Muscle Group
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Ratios
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExercises.map((exercise) => (
                      <tr
                        key={exercise.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              {exercise.name}
                            </div>
                            {exercise.short_name && (
                              <div className="text-sm text-gray-500">
                                {exercise.short_name}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {exercise.main_muscle && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {exercise.main_muscle}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {(exercise.ratios && Object.keys(exercise.ratios).length > 0) ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(
                                typeof exercise.ratios === 'string' 
                                  ? JSON.parse(exercise.ratios) 
                                  : exercise.ratios
                              )
                              // eslint-disable-next-line @typescript-eslint/no-unused-vars
                              .filter(([_, value]) => value !== undefined && value !== null && value !== '')
                              .slice(0, 3) // Show only first 3 ratios
                              .map(([muscle, ratio]) => (
                                <span 
                                  key={muscle}
                                  className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded"
                                  title={`${muscle}: ${ratio}`}
                                >
                                  {muscle}: {typeof ratio === 'number' ? ratio.toFixed(1) : String(ratio)}
                                </span>
                              ))}
                              {Object.keys(
                                typeof exercise.ratios === 'string' 
                                  ? JSON.parse(exercise.ratios) 
                                  : exercise.ratios
                              ).length > 3 && (
                                <span className="text-xs text-gray-400">
                                  +{Object.keys(
                                    typeof exercise.ratios === 'string' 
                                      ? JSON.parse(exercise.ratios) 
                                      : exercise.ratios
                                  ).length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No ratios</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {exercise.video_url && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setVideoModalExercise(exercise)}
                                title="View Exercise Video"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingExercise(exercise)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteExercise(exercise)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredExercises.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {hasActiveFilters 
                      ? 'No exercises match the current filters.' 
                      : 'No exercises found.'
                    }
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Modal */}
        {videoModalExercise && (
          <VideoModal
            isOpen={true}
            onClose={() => setVideoModalExercise(null)}
            videoUrl={videoModalExercise.video_url!}
            exerciseName={videoModalExercise.name}
          />
        )}

        {/* Create Exercise Modal */}
        <ExerciseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateExercise}
          title="Create New Exercise"
        />

        {/* Edit Exercise Modal */}
        {editingExercise && (
          <ExerciseModal
            isOpen={true}
            onClose={() => setEditingExercise(null)}
            onSubmit={(data) => handleUpdateExercise(editingExercise.id, data)}
            title="Edit Exercise"
            initialData={editingExercise}
          />
        )}
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

  if (user.role !== 'admin') {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  try {
    const supabase = createAdminSupabase();
    const exerciseService = createCentralizedExerciseService(supabase);
    
    const result = await exerciseService.getAll({
      sort: { field: 'name', direction: 'asc' }
    });

    return {
      props: {
        user,
        initialExercises: result.data || [],
        totalCount: result.count || 0
      }
    };
  } catch (error) {
    console.error('Error loading exercises:', error);
    return {
      props: {
        user,
        initialExercises: [],
        totalCount: 0
      }
    };
  }
};