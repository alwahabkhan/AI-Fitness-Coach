import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Clock,
  Dumbbell,
  TrendingUp,
  Home,
  Sparkles
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getServerSideProps(context: any) {
  const user = getCurrentUserFromContext(context);

  if (!user || user.role !== 'trainee') {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  const { id } = context.params;
  return { props: { workoutId: id, user } };
}

interface WorkoutSummary {
  workoutName: string;
  duration: number;
  exercisesCompleted: number;
  totalVolume: number;
  exercises: {
    name: string;
    setsCompleted: number;
    totalSets: number;
    bestSet: {
      weight: number;
      reps: number;
    };
  }[];
  summaryMessage: string;
}

export default function WorkoutFinishPage({
  workoutId
}: {
  workoutId: string;
  user: UserWithoutPassword;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkoutSummary = async () => {
      try {
        // Get the most recent workout session for this workout
        const response = await fetch(`/api/workout/${workoutId}/summary`);
        if (!response.ok) {
          throw new Error('Failed to load workout summary');
        }

        const data = await response.json();
        setSummary(data);
      } catch (err) {
        console.error('Error loading workout summary:', err);
        setError('Failed to load workout summary');
      } finally {
        setLoading(false);
      }
    };

    loadWorkoutSummary();
  }, [workoutId]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleStartNewWorkout = () => {
    router.push(`/trainee/workout/${workoutId}/execute`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workout summary...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <CheckCircle className="h-16 w-16 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Error Loading Summary
            </h1>
            <p className="text-gray-600 mb-6">
              {error || 'Could not load workout summary'}
            </p>
            <Button onClick={handleGoHome} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Workout Complete!
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Great job completing {summary.workoutName}
          </p>
        </div>

        {/* Minimalistic Summary Message */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg px-6 py-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <Sparkles className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-gray-700 italic leading-relaxed">
                  {summary.summaryMessage}
                </p>
                <p className="text-xs text-gray-500 mt-2">— Your AI Coach</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Duration
            </h3>
            <p className="text-3xl font-bold text-blue-600">
              {summary.duration} min
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
              <Dumbbell className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Exercises
            </h3>
            <p className="text-3xl font-bold text-purple-600">
              {summary.exercisesCompleted}
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Total Volume
            </h3>
            <p className="text-3xl font-bold text-orange-600">
              {summary.totalVolume.toLocaleString()} lbs
            </p>
          </Card>
        </div>

        {/* Exercise Breakdown */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Exercise Breakdown
          </h2>
          <div className="space-y-4">
            {summary.exercises.map((exercise, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {exercise.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {exercise.setsCompleted} of {exercise.totalSets} sets
                    completed
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    Best: {exercise.bestSet.weight}lbs × {exercise.bestSet.reps}
                  </p>
                  <div className="w-24 bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(exercise.setsCompleted / exercise.totalSets) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
          <Button onClick={handleGoHome} variant="outline" className="flex-1">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
          <Button
            onClick={handleStartNewWorkout}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <Dumbbell className="h-4 w-4 mr-2" />
            Start Again
          </Button>
        </div>
      </div>
    </div>
  );
}
