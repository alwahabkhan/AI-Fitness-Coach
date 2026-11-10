import {
  LogOut,
  User as UserIcon,
  Dumbbell,
  Utensils,
  Database,
  Upload,
  Settings,
  Users,
  Shield,
  Calendar,
  Menu,
  X,
  TrendingUp,
  UsersRound
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { UserWithoutPassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface LayoutProps {
  children: React.ReactNode;
  user?: UserWithoutPassword | null;
}

export function Layout({ children, user }: LayoutProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const adminNavItems = [
    { href: '/admin', label: 'Dashboard', icon: Shield },
    { href: '/admin/user', label: 'User Management', icon: Users },
    { href: '/admin/exercises', label: 'Exercises', icon: Dumbbell },
    { href: '/admin/program-builder', label: 'Program Builder', icon: Calendar },
    { href: '/admin/progress', label: 'Progress', icon: TrendingUp },
    { href: '/admin/prompt-inspector', label: 'Prompt Inspector', icon: Settings },
    { href: '/admin/db-assistant', label: 'DB Assistant', icon: Database }
  ];

  const trainerNavItems = [
    { href: '/trainer', label: 'Dashboard', icon: UserIcon },
    { href: '/trainer/program-builder', label: 'Program Builder', icon: Calendar },
    { label: 'User Management', href: '/trainer/user', icon: UsersRound },
    { href: '/trainer/workout/import', label: 'Import Workout', icon: Upload },
    { href: '/trainer/workouts', label: 'Workouts', icon: Dumbbell },
    { href: '/trainer/progress', label: 'Progress', icon: TrendingUp },
    {
      href: '/trainer/prompt-inspector',
      label: 'Prompt Inspector',
      icon: Settings
    },
  ];

  const traineeNavItems = [
    { href: '/trainee', label: 'Dashboard', icon: Dumbbell },
    { href: '/trainee/program-builder', label: 'Program Builder', icon: Calendar },
    { href: '/trainee/progress', label: 'Progress', icon: TrendingUp },
    {
      href: '/trainee/nutrition-coach/welcome',
      label: 'Nutrition Coach',
      icon: Utensils
    }
  ];

  const navItems = 
    user?.role === 'admin' ? adminNavItems :
    user?.role === 'trainer' ? trainerNavItems : 
    traineeNavItems;

  if (!user) {
    return <div className="min-h-screen bg-gray-50 text-black">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Desktop Navigation */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Dumbbell className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                <span className="ml-2 text-lg sm:text-xl font-bold text-gray-900">
                  AI Fitness Coach
                </span>
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden lg:ml-16 lg:flex lg:space-x-12">
                {navItems.map((item) => {
                  const isActive = router.pathname === item.href;
                    return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex items-center my-2 rounded-b-md px-1 pt-1 border-b-2 font-normal 
                      ${
                        isActive ? `border-blue-500 text-gray-900` : `border-transparent text-gray-700 hover:border-gray-300`
                      }
                      // isActive
                      //   ? 'border-blue-500 text-gray-900'
                      //   : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-700'
                      `}
                      style={{
                      // fontFamily: 'Albert Sans',
                      fontSize: '15px',
                      lineHeight: '20px',
                      letterSpacing: '-0.15px'
                      }}
                    >
                      {/* <item.icon className="mr-2 h-4 w-4" /> */}
                      {item.label}
                    </Link>
                    );
                })}
              </div>
            </div>

            {/* Desktop User Menu */}
            <div className="hidden sm:flex sm:items-center sm:space-x-4">
              <NotificationBell />
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 truncate max-w-32">
                  {user.name}
                </span>
                <span className="hidden md:inline text-xs text-gray-500 capitalize">
                  ({user.role})
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-1"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            
            {/* Mobile user menu */}
            <div className="border-t border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">{user.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                  </div>
                </div>
                <NotificationBell />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex flex-grow justify-center max-w-full mx-auto py-2 sm:py-6 px-0.5 sm:px-2 lg:px-6 min-h-[calc(100vh-64px)]">
        {children}
      </main>
    </div>
  );
}