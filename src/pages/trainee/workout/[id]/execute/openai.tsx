import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import { EphemeralSessionProvider } from '@/hooks/use-ephemeral-session';
import WorkoutExecuteWrapper from '@/components/workout-execute-wrapper';

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
  return { props: { id, user } };
}

export default function WorkoutExecutePage({
  id,
  user
}: {
  id: string;
  user: UserWithoutPassword;
}) {
  console.log('WorkoutExecutePage', id);
  return (
    <EphemeralSessionProvider>
      <WorkoutExecuteWrapper trainingDayId={id} user={user} />
    </EphemeralSessionProvider>
  );
}
