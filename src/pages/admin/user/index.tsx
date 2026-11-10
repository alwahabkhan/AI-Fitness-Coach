import { GetServerSideProps } from 'next';
import { useEffect, useState } from 'react';
import { Users, UserPlus, Search, Edit, Trash2 } from 'lucide-react';
// ...
import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import AddUserForm from '@/components/user-management/add-user-form';

import { getCurrentUserFromContext } from '@/lib/session';
import { getUsersWithTrainerInfo, UserWithoutPassword } from '@/lib/auth';
import { formatDateServer } from '@/lib/utils';

interface UserManagementProps {
  user: UserWithoutPassword;
  users: Array<UserWithoutPassword & { assigned_trainer: { name: string; email: string } | null }>;
}

export default function UserManagement({
  user: currentUser,
  users: initialUsers
}: UserManagementProps) {
  const [users, setUsers] = useState<Array<UserWithoutPassword & { assigned_trainer: { name: string; email: string } | null }>>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<(UserWithoutPassword & { assigned_trainer: { name: string; email: string } | null }) | undefined>(undefined);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchSessionCounts = async () => {
      const traineeIds = users
        .filter(u => u.role === 'trainee')
        .map(u => u.id);

      if (traineeIds.length === 0) return;

      try {
        const response = await fetch('/api/admin/trainee-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ traineeIds })
        });

        if (response.ok) {
          const data = await response.json();
          setSessionCounts(data.sessionCounts);
        }
      } catch (error) {
        console.error('Error fetching session counts:', error);
      }
    };

    fetchSessionCounts();
  }, [users]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string, isSuperAdmin?: boolean) => {
    if (isSuperAdmin) {
      return 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 border border-orange-300';
    }
    switch (role) {
      case 'trainer':
        return 'bg-blue-100 text-blue-800';
      case 'trainee':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUserAdded = (formData: UserWithoutPassword & { assigned_trainer_id?: string | null }) => {
    if (editingUser) {
      // Update existing user - fetch trainer info if assigned
      let trainerInfo = null;
      if (formData.assigned_trainer_id) {
        const trainer = users.find(u => u.id === formData.assigned_trainer_id && u.role === 'trainer');
        if (trainer) {
          trainerInfo = { name: trainer.name, email: trainer.email };
        }
      }

      setUsers(users.map(user =>
        user.id === formData.id
          ? { ...formData, assigned_trainer: trainerInfo }
          : user
      ));
      setEditingUser(undefined);
    } else {
      // Add new user
      const userWithTrainerInfo = {
        ...formData,
        assigned_trainer: null
      };
      setUsers([userWithTrainerInfo, ...users]);
    }
  };

  const handleEditUser = (user: UserWithoutPassword & { assigned_trainer: { name: string; email: string } | null }) => {
    setEditingUser(user);
    setIsAddUserModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    const response = await fetch('/api/admin/user', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }

    const { user: deletedUser } = await response.json();

    setUsers(users.filter((user) => user.id !== deletedUser.id));
  };

  return (
    <Layout user={currentUser}>
      <div className="container flex-1 px-4 lg:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage users and their roles in the system.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Users
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {users.length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trainers</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {users.filter((u) => u.role === 'trainer').length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trainees</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {users.filter((u) => u.role === 'trainee').length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                  <Select
                    options={[
                      { value: 'all', label: 'All Roles' },
                      { value: 'trainer', label: 'Trainers' },
                      { value: 'trainee', label: 'Trainees' },
                      { value: 'admin', label: 'Admins' }
                    ]}
                    value={roleFilter}
                    onValueChange={setRoleFilter}
                    className="w-full md:w-32"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingUser(undefined);
                    setIsAddUserModalOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      User
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Assigned To
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Allowed Sessions
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Available Sessions
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Created
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Last Updated
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 opacity-70">
                        {user.role === 'trainee'
                          ? user.assigned_trainer
                            ? <div className="flex flex-col">
                              <span>{user.assigned_trainer.name}</span>
                              <span className='text-xs'>{user.assigned_trainer.email}</span>
                            </div>
                            : 'N/A'
                          : ''
                        }
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role, user.is_super_admin)} capitalize`}
                        >
                          {user.is_super_admin ? 'Super Admin' : user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {user.role === 'trainee'
                          ? (user.allowed_sessions ?? 'N/A')
                          : ''}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {user.role === 'trainee' && user.allowed_sessions !== null
                          ? Math.max(0, user.allowed_sessions - (sessionCounts[user.id] || 0))
                          : user.role === 'trainee'
                            ? 'N/A'
                            : ''}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDateServer(user.created_at ?? '')}
                        {/* {new Date(user.created_at ?? '').toLocaleDateString()} */}
                      </td>
                      {user.id !== currentUser.id ? (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {(currentUser.is_super_admin || (currentUser.role === 'admin' && user.role !== 'admin')) && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Are you sure you want to delete ${user.name}?`
                                    )
                                  ) {
                                    handleDeleteUser(user.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      ) : (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add User Modal */}
      <AddUserForm
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onUserAdded={handleUserAdded}
        editUser={editingUser}
        currentUser={currentUser}
      />
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

  const users = await getUsersWithTrainerInfo();

  return {
    props: {
      user,
      users
    }
  };
};