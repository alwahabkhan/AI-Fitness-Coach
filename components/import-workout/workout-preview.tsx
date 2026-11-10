import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WorkoutPreview } from '@/components/workout-preview/workout-preview';
import { useWorkoutImport } from './context';

export function ImportedWorkoutPreview() {
  const { importedWorkout, isImporting, handleImport } = useWorkoutImport();

  if (!importedWorkout) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Workout Preview: {importedWorkout.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Review the details below and click &quot;Continue Importing&quot; to
            save.
          </p>

          <WorkoutPreview workout={importedWorkout} showPagination={true} />

          <div className="flex justify-end">
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="min-w-[150px]"
            >
              {isImporting ? 'Importing...' : 'Continue Importing'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
