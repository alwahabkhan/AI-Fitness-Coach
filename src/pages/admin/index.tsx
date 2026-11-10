import { GetServerSideProps } from 'next';
import { Layout } from '@/components/layout/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Database,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';

interface AdminDashboardProps {
  user: UserWithoutPassword;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const dashboardCards = [
    {
      title: 'User Management',
      description: 'Create and manage all user accounts across the platform',
      icon: Users,
      href: '/admin/user',
      color: 'text-orange-600 bg-orange-100'
    },
    {
      title: 'DB Assistant',
      description: 'Query database and analyze platform-wide data and insights',
      icon: Database,
      href: '/admin/db-assistant',
      color: 'text-green-600 bg-green-100'
    }
  ];

  return (
    <Layout user={user}>
      <div className="px-4 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Manage users and analyze platform data across the entire system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardCards.map((card, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{card.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-gray-600 mb-4">
                  {card.description}
                </CardDescription>
                <Link href={card.href}>
                  <Button className="w-full">Access {card.title}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = getCurrentUserFromContext(context);

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
};