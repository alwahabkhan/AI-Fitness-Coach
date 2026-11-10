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
  Upload,
  Settings,
  Users,
  Activity,
  BarChart3,
  Dumbbell
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import {
  getTrainerDashboardStats,
  getTrainerRecentActivity,
  type TrainerDashboardStats,
  type TrainerRecentActivity
} from '@/lib/dashboard-stats';
import { formatTime } from '@/lib/utils';

interface TrainerDashboardProps {
  user: UserWithoutPassword;
  stats: TrainerDashboardStats;
  recentActivity: TrainerRecentActivity[];
}

export default function TrainerDashboard({
  user,
  stats,
  recentActivity
}: TrainerDashboardProps) {
  const dashboardCards = [
    {
      title: 'Import Workout',
      description: 'Upload workout plans from CSV files for your trainees',
      icon: Upload,
      href: '/trainer/workout/import',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      title: 'View Workouts',
      description: 'Browse and preview all workouts for your trainees',
      icon: Dumbbell,
      href: '/trainer/workouts',
      color: 'text-indigo-600 bg-indigo-100'
    },
    {
      title: 'Prompt Inspector',
      description:
        'View and customize AI prompts for nutrition and workout coaches',
      icon: Settings,
      href: '/trainer/prompt-inspector',
      color: 'text-purple-600 bg-purple-100'
    }
  ];

  const statsData = [
    {
      label: 'Active Trainees',
      value: stats.activeTrainees.toString(),
      icon: Users
    },
    {
      label: 'Workouts Created',
      value: stats.workoutsCreated.toString(),
      icon: Activity
    },
    {
      label: 'Sessions This Week',
      value: stats.sessionsThisWeek.toString(),
      icon: BarChart3
    }
  ];

  return (
    <Layout user={user}>
      <div className="px-4 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your trainees and AI coaching experience from your dashboard.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statsData.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <stat.icon className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardCards.map((card) => (
            <Card
              key={card.title}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{card.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {card.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={card.href}>
                  <Button className="w-full">Get Started</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates from your trainees and AI coaching sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-3 text-sm"
                    >
                      <div
                        className={`h-2 w-2 rounded-full ${
                          activity.type === 'workout_completed'
                            ? 'bg-green-500'
                            : activity.type === 'nutrition_session'
                              ? 'bg-blue-500'
                              : 'bg-purple-500'
                        }`}
                      ></div>
                      <span className="text-gray-600 flex-1">
                        {activity.message}
                      </span>
                      <span className="text-gray-400">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">
                    No recent activity to display
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
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

  try {
    // Fetch dashboard stats and recent activity using Promise.allSettled
    // so that if one fails, the other can still succeed
    const results = await Promise.allSettled([
      getTrainerDashboardStats(),
      getTrainerRecentActivity()
    ]);

    // Extract results, using defaults if any promise was rejected
    const stats =
      results[0].status === 'fulfilled'
        ? results[0].value
        : {
            activeTrainees: 0,
            workoutsCreated: 0,
            sessionsThisWeek: 0
          };

    const recentActivity =
      results[1].status === 'fulfilled' ? results[1].value : [];

    // Log any errors for debugging
    if (results[0].status === 'rejected') {
      console.error('Error fetching dashboard stats:', results[0].reason);
    }
    if (results[1].status === 'rejected') {
      console.error('Error fetching recent activity:', results[1].reason);
    }

    return {
      props: {
        user,
        stats,
        recentActivity
      }
    };
  } catch (error) {
    console.error('Unexpected error in getServerSideProps:', error);
    // Return default data if there's an unexpected error
    return {
      props: {
        user,
        stats: {
          activeTrainees: 0,
          workoutsCreated: 0,
          sessionsThisWeek: 0
        },
        recentActivity: []
      }
    };
  }
};
