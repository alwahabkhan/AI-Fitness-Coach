import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WorkoutPreview } from '@/components/workout-preview/workout-preview';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import { Eye, EyeOff, Calendar, User } from 'lucide-react';

interface Exercise {
  id: string;
  workout_id: string;
  name: string;
  execution_meta: {
    sets: number;
    reps: number;
    weight: number;
    rest_seconds: number;
  };
  group: number;
  order: number;
  video_url: string | null;
  agent_context: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkoutWithExercises {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  exercises: Exercise[];
}

interface WorkoutsPageProps {
  user: UserWithoutPassword;
}

export default function WorkoutsPage({ user }: WorkoutsPageProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] =
    useState<WorkoutWithExercises | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trainer/workouts');

      if (!response.ok) {
        throw new Error('Failed to fetch workouts');
      }

      const data = await response.json();
      setWorkouts(data.workouts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workouts');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewWorkout = (workout: WorkoutWithExercises) => {
    setSelectedWorkout(workout);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setSelectedWorkout(null);
  };

  // Transform database workout to preview format
  const transformWorkoutForPreview = (workout: WorkoutWithExercises) => {
    // Group exercises by day (assuming each workout represents one day)
    const workoutDay = {
      day: 1,
      exercises: workout.exercises.map((exercise) => ({
        group: exercise.group,
        youtubeLink: exercise.video_url || '',
        name: exercise.name,
        sets: exercise.execution_meta.sets,
        rest: exercise.execution_meta.rest_seconds,
        weights: exercise.execution_meta.weight,
        reps: exercise.execution_meta.reps
      }))
    };

    return {
      name: workout.name,
      workoutDays: [workoutDay]
    };
  };

  if (loading) {
    return (
      <Layout user={user}>
        <div className="px-4 sm:px-0 flex flex-col grow items-center w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Workouts</h1>
            <p className="text-gray-600 mt-2">
              View and manage all workouts for your trainees.
            </p>
          </div>
          <div className="max-w-4xl w-full">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading workouts...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout user={user}>
        <div className="px-4 sm:px-0 flex flex-col grow items-center w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Workouts</h1>
            <p className="text-gray-600 mt-2">
              View and manage all workouts for your trainees.
            </p>
          </div>
          <div className="max-w-4xl w-full">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchWorkouts}>Try Again</Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user}>
      <div className="px-4 sm:px-0 flex flex-col grow items-center w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workouts</h1>
          <p className="text-gray-600 mt-2">
            View and manage all workouts for your trainees.
          </p>
        </div>

        <div className="max-w-6xl w-full">
          {workouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No workouts found.</p>
              <Button
                onClick={() =>
                  (window.location.href = '/trainer/workout/import')
                }
              >
                Import Your First Workout
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workouts.map((workout) => (
                <Card
                  key={workout.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{workout.name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>{workout.user.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(workout.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        {workout.exercises.length} exercises
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreviewWorkout(workout)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {showPreview && selectedWorkout && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Workout Preview</h2>
                  <Button variant="outline" size="sm" onClick={closePreview}>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
                <WorkoutPreview
                  workout={transformWorkoutForPreview(selectedWorkout)}
                  showPagination={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = await getCurrentUserFromContext(context);

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  if (user.role !== 'trainer') {
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    };
  }

  return {
    props: {
      user
    }
  };
};
