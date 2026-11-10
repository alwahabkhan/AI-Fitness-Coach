import { GetServerSideProps } from 'next';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import ProgramBuilderCore from '@/components/program-builder/ProgramBuilderCore';

interface AdminProgramBuilderProps {
  user: UserWithoutPassword;
}

export default function AdminProgramBuilder({ user }: AdminProgramBuilderProps) {
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

    if (user.role !== 'admin') {
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
    console.error('Error in admin program builder page:', error);
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }
};