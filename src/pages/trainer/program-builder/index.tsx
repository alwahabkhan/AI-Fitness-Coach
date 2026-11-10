import { GetServerSideProps } from 'next';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import ProgramBuilderCore from '@/components/program-builder/ProgramBuilderCore';

interface TrainerProgramBuilderProps {
  user: UserWithoutPassword;
}

export default function TrainerProgramBuilder({ user }: TrainerProgramBuilderProps) {
  return <ProgramBuilderCore user={user} />;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    const user = await getCurrentUserFromContext(context);

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
          destination: '/login',
          permanent: false
        }
      };
    }

    return {
      props: {
        user
      }
    };
  } catch (error) {
    console.error('Error in trainer program builder page:', error);
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }
};