import { GetServerSideProps } from 'next';
import { Layout } from '@/components/layout/layout';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import { EphemeralSessionProvider } from '@/hooks/use-ephemeral-session';
import WorkoutExecuteWrapper from '@/components/workout-execute-wrapper';

interface TrainingDayExecutePageProps {
  user: UserWithoutPassword;
  trainingDayId: string;
}

export default function TrainingDayExecutePage({ user, trainingDayId }: TrainingDayExecutePageProps) {
  return (
    <Layout user={user}>
      <EphemeralSessionProvider>
        <WorkoutExecuteWrapper trainingDayId={trainingDayId} user={user} />
      </EphemeralSessionProvider>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = getCurrentUserFromContext(context);

  if (!user || user.role !== 'trainee') {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const { id } = context.params as { id: string };

  return {
    props: { user, trainingDayId: id },
  };
};