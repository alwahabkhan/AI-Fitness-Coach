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
  return { props: { trainingDayId: id, user } };
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

export default function TrainingDayFinishPage({
  trainingDayId
}: {
  trainingDayId: string;
  user: UserWithoutPassword;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkoutSummary = async () => {
      try {
        const response = await fetch(`/api/training-day/${trainingDayId}/summary`);
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
  }, [trainingDayId]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleStartNewWorkout = () => {
    router.push(`/trainee/training-day/${trainingDayId}/execute`);
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">
            {error || 'Unable to load workout summary'}
          </p>
          <Button onClick={handleGoHome}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Workout Complete!
          </h1>
          <p className="text-lg text-gray-600">Great job on finishing strong</p>
        </div>

        {/* AI Summary Message */}
        {summary.summaryMessage && (
          <Card className="p-6 mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <div className="flex items-start gap-3">
              <Sparkles className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  AI Coach Summary
                </h3>
                <p className="text-gray-700">{summary.summaryMessage}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
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