import { GetServerSideProps } from 'next';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import ProgramBuilderCore from '@/components/program-builder/ProgramBuilderCore';

interface TraineeProgramBuilderProps {
  user: UserWithoutPassword;
}

export default function TraineeProgramBuilder({ user }: TraineeProgramBuilderProps) {
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

    if (user.role !== 'trainee') {
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
    console.error('Error in trainee program builder page:', error);
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }
};