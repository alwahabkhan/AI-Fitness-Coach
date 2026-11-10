import { useState } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ExerciseData {
  group: number;
  youtubeLink: string;
  name: string;
  sets: number;
  rest: number;
  weights: number | string;
  reps: number;
}

interface WorkoutDay {
  day: number;
  exercises: ExerciseData[];
}

interface WorkoutPreviewProps {
  workout: {
    name: string;
    workoutDays: WorkoutDay[];
  };
  showPagination?: boolean;
  className?: string;
}

export function WorkoutPreview({
  workout,
  showPagination = true,
  className = ''
}: WorkoutPreviewProps) {
  const [currentDay, setCurrentDay] = useState(1);

  const currentDayData = workout.workoutDays.find(
    (day) => day.day === currentDay
  );
  const exercises = currentDayData?.exercises || [];

  const handlePreviousDay = () => {
    if (currentDay > 1) {
      setCurrentDay(currentDay - 1);
    }
  };

  const handleNextDay = () => {
    if (currentDay < workout.workoutDays.length) {
      setCurrentDay(currentDay + 1);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {workout.name}
          </CardTitle>

          {showPagination && workout.workoutDays.length > 1 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePreviousDay}
                disabled={currentDay === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Day {currentDay} of {workout.workoutDays.length}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleNextDay}
                disabled={currentDay === workout.workoutDays.length}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {exercises.length} exercises in day {currentDay}.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                    Day
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                    Group
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                    Exercise
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                    Sets
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                    Rest (s)
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                    Weight
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                    Reps
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                    Video
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {exercises.map((exercise, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">
                      Day {currentDay}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {exercise.group}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                      {exercise.name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {exercise.sets}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {exercise.rest}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {exercise.weights}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {exercise.reps}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {exercise.youtubeLink && (
                        <a
                          href={exercise.youtubeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
