import { getCurrentUserFromContext } from '@/lib/session';
import WorkoutExecuteWrapperOutspeed from '@/components/workout-execute-wrapper-2';

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

export default function WorkoutExecutePage({ id }: { id: string }) {
  console.log('WorkoutExecutePage', id);
  return <WorkoutExecuteWrapperOutspeed trainingDayId={id} />;
}
