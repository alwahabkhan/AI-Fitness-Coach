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
  Play,
  MessageSquare,
  Calendar,
  Trophy,
  Target,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { getCurrentUserFromContext } from '@/lib/session';
import { UserWithoutPassword } from '@/lib/auth';
import {
  getTraineeDashboardStats,
  getTraineeRecentActivity,
  type TraineeDashboardStats,
  type TraineeRecentActivity
} from '@/lib/dashboard-stats';
import { formatTime } from '@/lib/utils';
import { workoutService } from '@/lib/workout';

interface TraineeDashboardProps {
  user: UserWithoutPassword;
  stats: TraineeDashboardStats;
  recentActivity: TraineeRecentActivity[];
  workouts: Workout[];
}



// ✅ simple, local accordion (no 3rd-party)
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';

/* ----------------------------- helpers ----------------------------- */

interface Workout {
  id: string;
  name: string;
  description: string;
  duration: string;
  exerciseCount: number;
  lastCompleted: string;
  allNames: string;
}

const parseWorkoutName = (name: string) => {
  // "Koce Workout 1 - Day 2" -> base="Koce Workout 1", day=2
  const m = name.match(/^(.*)\s-\sDay\s+(\d+)$/i);
  return m
    ? { base: m[1].trim(), day: Number(m[2]) }
    : { base: name.trim(), day: Number.POSITIVE_INFINITY };
};

const groupWorkouts = (workouts: Workout[]) => {
  const map = new Map<string, (Workout & { __day: number })[]>();

  for (const w of workouts) {
    const { base, day } = parseWorkoutName(w.name);
    const arr = map.get(base) ?? [];
    arr.push({ ...w, __day: day });
    map.set(base, arr);
  }

  // sort each group by day
  for (const [k, arr] of map) {
    arr.sort((a, b) => a.__day - b.__day);
    map.set(k, arr);
  }

  // sort groups by the number inside "Workout X" (optional)
  const groups = Array.from(map.entries()).sort((a, b) => {
    const ax = Number(a[0].match(/Workout\s+(\d+)/i)?.[1] ?? 1);
    const bx = Number(b[0].match(/Workout\s+(\d+)/i)?.[1] ?? 1);
    return ax - bx;
  });

  return groups as Array<[string, (Workout & { __day: number })[]]>;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* --------------------------- page component -------------------------- */



export default function TraineeDashboard({
  user,
  stats,
  recentActivity,
  workouts
}: TraineeDashboardProps) {
  const statsData = [
    {
      label: 'Workouts Completed',
      value: stats.workoutsCompleted.toString(),
      icon: Trophy
    },
    { 
      label: 'This Week',
      value: stats.sessionsThisWeek.toString(),
      icon: Calendar
     },
    {
      label: 'Streak',
      value: `${stats.currentStreak} days`,
      icon: Target
     },
    {
      label: 'Total Workouts',
      value: stats.totalWorkouts.toString(),
      icon: TrendingUp
     }
  ];

  const groups = groupWorkouts(workouts);

  return (
    <Layout user={user}>
      <div className="px-4 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            Ready to crush your fitness goals today?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statsData.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <stat.icon className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-600">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-white">Nutrition Coach</CardTitle>
              <CardDescription className="text-blue-100">
                Get personalized nutrition advice and meal planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/trainee/nutrition-coach/welcome">
                <Button variant="secondary" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Start Coaching Session
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader>
              <CardTitle className="text-white">Quick Workout</CardTitle>
              <CardDescription className="text-green-100">
                Jump into your most recent workout routine
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/trainee/workout/1/execute">
                <Button variant="secondary" className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Start Workout
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Available Workouts (Accordion by group) */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Workouts</h2>
          </div>

          {workouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                No workouts found. Ask your trainer to create some workouts for you!
              </p>
            </div>
          ) : (
            <Accordion type="single" defaultValue={[slugify(groups[0][0])]} className="space-y-4">
              {groups.map(([groupName, items]) => {
                const value = slugify(groupName);
                return (
                  <AccordionItem key={value} value={value} className="border rounded-lg">
                    <AccordionTrigger className="text-left px-4">
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xl font-semibold">{groupName}</span>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                          {items.length} {items.length === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-2">
                        {items.map((workout) => {
                          return (
                            <Card key={workout.id} className="hover:shadow-lg transition-shadow">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg">{workout.name}</CardTitle>
                                </div>
                                <CardDescription>{workout.description}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2 mb-4">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Estimated Duration:</span>
                                    <span className="font-medium">{workout.duration}</span>
                                  </div>

                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Exercise Count:</span>
                                    <span className="font-medium">{workout.exerciseCount}</span>
                                  </div>

                                  <div className="flex justify-between items-start text-sm">
                                    <span className="text-gray-600 mt-1">Exercises:</span>
                                    <div className="flex flex-wrap justify-end gap-2 max-w-[70%]">
                                      {workout.allNames.split(',').map((name, idx) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-800"
                                        >
                                          {name.trim()}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Last completed:</span>
                                    <span className="font-medium">{workout.lastCompleted}</span>
                                  </div>
                                </div>

                                {workout.lastCompleted === 'Never' ? (
                                  <Link href={`/trainee/workout/${workout.id}/execute`}>
                                    <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
                                      <Play className="h-4 w-4 mr-2" />
                                      Start Workout
                                    </Button>
                                  </Link>
                                ) : (
                                  <Link href={`/trainee/workout/${workout.id}/execute`}>
                                    <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                                      <Play className="h-4 w-4 mr-2" />
                                      Do it Again
                                    </Button>
                                  </Link>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest workout sessions and nutrition coaching activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3 text-sm">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          activity.type === 'workout_completed' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                      />
                      <span className="text-gray-600 flex-1">{activity.message}</span>
                      <span className="text-gray-400">{formatTime(activity.timestamp)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">No recent activity to display</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

/* ----------------------- getServerSideProps ----------------------- */

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

  try {
    const results = await Promise.allSettled([
      getTraineeDashboardStats(user.id),
      getTraineeRecentActivity(user.id),
      workoutService.getWorkoutsForUser(user.id)
    ]);

    const stats =
      results[0].status === 'fulfilled'
        ? results[0].value
        : {
          workoutsCompleted: 0,
          sessionsThisWeek: 0,
          currentStreak: 0,
          totalWorkouts: 0,
          totalDurationMinutes: 0
         };

    const recentActivity =      
      results[1].status === 'fulfilled' ? results[1].value : [];

    const workouts = results[2].status === 'fulfilled' ? results[2].value : [];

        if (results[0].status === 'rejected') {
      console.error(
        'Error fetching trainee dashboard stats:',
        results[0].reason
      );
    }
    if (results[1].status === 'rejected') {
      console.error(
        'Error fetching trainee recent activity:',
        results[1].reason
      );
    }
    if (results[2].status === 'rejected') {
      console.error('Error fetching trainee workouts:', results[2].reason);
    }

    return {
       props: {
        user,
        stats,
        recentActivity,
        workouts
       }
      };
  } catch (error) {
    console.error('Unexpected error in getServerSideProps:', error);
    return {
      props: {
        user,
        stats: {
          workoutsCompleted: 0,
          sessionsThisWeek: 0,
          currentStreak: 0,
          totalWorkouts: 0,
          totalDurationMinutes: 0
         },
        recentActivity: [],
        workouts: []
      }
    };
  }
};
