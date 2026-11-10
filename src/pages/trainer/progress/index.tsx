import { GetServerSideProps } from 'next';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import { ProgramWithDetails } from '@/database/program-builder.types';
import { TrainingSession } from '@/database/derived.types';
import ProgressPage from '@/components/progress/ProgressPage';

interface TrainerProgressPageProps {
  user: UserWithoutPassword;
  programs: ProgramWithDetails[];
  allSessions: TrainingSession[];
  trainees: UserWithoutPassword[];
}

export default function TrainerProgressPage({ user, programs, allSessions, trainees }: TrainerProgressPageProps) {
  return <ProgressPage user={user} programs={programs} allSessions={allSessions} trainees={trainees} />;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = getCurrentUserFromContext(context);

  if (!user || user.role !== 'trainer') {
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

  // Fetch trainees assigned to this trainer
  const traineesResponse = await fetch(
    `${baseUrl}/api/program/trainees`,
    { headers }
  );

  let trainees: UserWithoutPassword[] = [];
  if (traineesResponse.ok) {
    trainees = await traineesResponse.json();
  }

  // Fetch all programs created by this trainer
  const programsResponse = await fetch(
    `${baseUrl}/api/program`,
    { headers }
  );

  let programs: ProgramWithDetails[] = [];
  if (programsResponse.ok) {
    programs = await programsResponse.json();
  }

  // Fetch all completed sessions for programs created by this trainer
  // Get all program IDs first
  const programIds = programs.map(p => p.id);
  
  let allSessions: TrainingSession[] = [];
  if (programIds.length > 0) {
    // Fetch sessions for all programs in parallel
    const sessionPromises = programIds.map(programId =>
      fetch(`${baseUrl}/api/training-session/program/${programId}`, { headers })
        .then(res => res.ok ? res.json() : [])
        .catch(() => [])
    );
    
    const sessionArrays = await Promise.all(sessionPromises);
    allSessions = sessionArrays.flat().filter((s: TrainingSession) => s.status === 'completed');
  }

  return {
    props: {
      user,
      programs,
      allSessions,
      trainees
    }
  };
};

