import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { useWorkoutImport } from './context';
import { UserWithoutPassword } from '@/lib/auth';

interface UserSelectionProps {
  trainees: (UserWithoutPassword & { role: 'trainee' })[];
}

export function UserSelection({ trainees }: UserSelectionProps) {
  const { selectedUserId, setSelectedUserId } = useWorkoutImport();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Trainee</CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          options={trainees?.map((trainee) => ({
            value: trainee.id,
            label: trainee.name
          }))}
          value={selectedUserId}
          onValueChange={setSelectedUserId}
          placeholder="Choose a trainee..."
          className="max-w-md"
        />
      </CardContent>
    </Card>
  );
}
