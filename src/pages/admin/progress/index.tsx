import { GetServerSideProps } from 'next';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import { ProgramWithDetails } from '@/database/program-builder.types';
import { TrainingSession } from '@/database/derived.types';
import ProgressPage from '@/components/progress/ProgressPage';

interface AdminProgressPageProps {
  user: UserWithoutPassword;
  programs: ProgramWithDetails[];
  allSessions: TrainingSession[];
  trainees: UserWithoutPassword[];
}

export default function AdminProgressPage({ user, programs, allSessions, trainees }: AdminProgressPageProps) {
  return <ProgressPage user={user} programs={programs} allSessions={allSessions} trainees={trainees} />;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = getCurrentUserFromContext(context);

  if (!user || user.role !== 'admin') {
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

  // Fetch all trainees (admin can see all)
  const traineesResponse = await fetch(
    `${baseUrl}/api/program/trainees`,
    { headers }
  );

  let trainees: UserWithoutPassword[] = [];
  if (traineesResponse.ok) {
    trainees = await traineesResponse.json();
  }

  // Fetch all programs (admin can see all)
  const programsResponse = await fetch(
    `${baseUrl}/api/program`,
    { headers }
  );

  let programs: ProgramWithDetails[] = [];
  if (programsResponse.ok) {
    programs = await programsResponse.json();
  }

  // Fetch all completed sessions
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
      allSessions,
      trainees
    }
  };
};

