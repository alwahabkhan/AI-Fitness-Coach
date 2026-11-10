import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWorkoutImport } from './context';

export function WorkoutNameInput() {
  const { importedWorkout, updateWorkoutName } = useWorkoutImport();
  const [tempName, setTempName] = useState(importedWorkout?.name || '');

  // Update temp name when importedWorkout changes
  useEffect(() => {
    setTempName(importedWorkout?.name || '');
  }, [importedWorkout?.name]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempName(e.target.value);
  };

  const handleSave = () => {
    if (importedWorkout && tempName.trim()) {
      updateWorkoutName(tempName.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workout Name</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              value={tempName}
              onChange={handleNameChange}
              placeholder="Enter workout name..."
              disabled={!importedWorkout}
              className="max-w-md"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={!importedWorkout || importedWorkout.name === tempName}
            size="sm"
          >
            Save
          </Button>
        </div>
        {!importedWorkout && (
          <p className="text-sm text-gray-500 mt-2">
            Upload a CSV file to enable workout name editing
          </p>
        )}
      </CardContent>
    </Card>
  );
}
