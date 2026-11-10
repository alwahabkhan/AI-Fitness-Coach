import { GetServerSideProps } from 'next';
import { getCurrentUserFromContext } from '@/lib/session';
import { Dumbbell } from 'lucide-react';

export default function HomePage() {
  // This component should rarely render since we redirect server-side
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-600 p-4 rounded-full animate-pulse">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          AI Fitness Coach
        </h1>
        <p className="text-gray-600">Loading your fitness dashboard...</p>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = getCurrentUserFromContext(context);

  if (!user) {
    // Redirect unauthenticated users to login
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  // Redirect authenticated users to their appropriate dashboard
  if (user.role === 'admin') {
    return {
      redirect: {
        destination: '/admin',
        permanent: false
      }
    };
  } else if (user.role === 'trainer') {
    return {
      redirect: {
        destination: '/trainer',
        permanent: false
      }
    };
  } else if (user.role === 'trainee') {
    return {
      redirect: {
        destination: '/trainee',
        permanent: false
      }
    };
  }

  // Fallback to login if role is unrecognized
  return {
    redirect: {
      destination: '/login',
      permanent: false
    }
  };
};
