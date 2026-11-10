import { GetServerSideProps } from 'next';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import { ProgramWithDetails } from '@/database/program-builder.types';
import { TrainingSession } from '@/database/derived.types';
import ProgressPage from '@/components/progress/ProgressPage';

interface TraineeProgressPageProps {
  user: UserWithoutPassword;
  programs: ProgramWithDetails[];
  allSessions: TrainingSession[];
}

export default function TraineeProgressPage({ user, programs, allSessions }: TraineeProgressPageProps) {
  return <ProgressPage user={user} programs={programs} allSessions={allSessions} />;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = getCurrentUserFromContext(context);

  if (!user || user.role !== 'trainee') {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const headers = {
    cookie: context.req.headers.cookie || ''
  };

  // Fetch all programs for this trainee
  const programsResponse = await fetch(
    `${baseUrl}/api/program?traineeId=${user.id}`,
    { headers }
  );

  let programs: ProgramWithDetails[] = [];
  if (programsResponse.ok) {
    programs = await programsResponse.json();
  }

  // Fetch all completed sessions for cumulative stats
  const sessionsResponse = await fetch(
    `${baseUrl}/api/training-session?status=completed`,
    { headers }
  );

  let allSessions: TrainingSession[] = [];
  if (sessionsResponse.ok) {
    allSessions = await sessionsResponse.json();
  }

  return {
    props: {
      user,
      programs,
      allSessions
    }
  };
};
