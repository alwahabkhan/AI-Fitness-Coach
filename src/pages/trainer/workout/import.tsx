import { GetServerSideProps } from 'next';

import { Layout } from '@/components/layout/layout';

import { getCurrentUserFromContext } from '@/lib/session';
import { getTraineesForTrainer, UserWithoutPassword } from '@/lib/auth';
import { WorkoutImportProvider } from '@/components/import-workout/context';
import { UserSelection } from '@/components/import-workout/user-selection';
import { CSVUpload } from '@/components/import-workout/csv-upload';
import { WorkoutNameInput } from '@/components/import-workout/workout-name-input';
import { ImportedWorkoutPreview } from '@/components/import-workout/workout-preview';

interface WorkoutImportProps {
  user: UserWithoutPassword;
  trainees: (UserWithoutPassword & { role: 'trainee' })[];
}

function WorkoutImportContent({ user, trainees }: WorkoutImportProps) {
  return (
    <Layout user={user}>
      <div className="px-4 sm:px-0 flex flex-col grow items-center w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import Workout</h1>
          <p className="text-gray-600 mt-2">
            Upload a CSV file to create a new workout plan for your trainees.
          </p>
        </div>

        <div className="max-w-4xl space-y-6 flex-1 grow w-full">
          <UserSelection trainees={trainees} />
          <CSVUpload />
          <WorkoutNameInput />
          <ImportedWorkoutPreview />
        </div>
      </div>
    </Layout>
  );
}

export default function WorkoutImport(props: WorkoutImportProps) {
  return (
    <WorkoutImportProvider>
      <WorkoutImportContent {...props} />
    </WorkoutImportProvider>
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

  if (user.role !== 'trainer') {
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    };
  }

  const trainees = await getTraineesForTrainer(user.id);

  return {
    props: {
      user,
      trainees
    }
  };
};
