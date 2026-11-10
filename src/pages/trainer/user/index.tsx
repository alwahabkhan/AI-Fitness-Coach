import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { Users, UserPlus, Search, Edit, Trash2 } from 'lucide-react';

import { Layout } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddUserForm from '@/components/user-management/add-user-form';

import { getCurrentUserFromContext } from '@/lib/session';
import { getTraineesForTrainer, UserWithoutPassword } from '@/lib/auth';
import { formatDateServer } from '@/lib/utils';

interface UserManagementProps {
  user: UserWithoutPassword;
  users: Array<UserWithoutPassword>;
}

export default function TrainerUserManagement({
  user: currentUser,
  users: initialUsers
}: UserManagementProps) {
  // Note: We map to the structure expected by components, but assigned_trainer is irrelevant here as it's always us
  const [users, setUsers] = useState<Array<UserWithoutPassword>>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithoutPassword | undefined>(undefined);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleUserAdded = (formData: UserWithoutPassword) => {
    if (editingUser) {
      setUsers(users.map(user => 
        user.id === formData.id ? formData : user
      ));
      setEditingUser(undefined);
    } else {
      setUsers([formData, ...users]);
    }
  };

  const handleEditUser = (user: UserWithoutPassword) => {
    setEditingUser(user);
    setIsAddUserModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    const response = await fetch('/api/trainer/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
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
          <h1 className="text-3xl font-bold text-gray-900">My Trainees</h1>
          <p className="text-gray-600 mt-2">
            Manage your assigned trainees.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Trainees
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {users.length}
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
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 w-full md:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search trainees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
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
                  Add Trainee
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Trainees ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDateServer(user.created_at ?? '')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
                                handleDeleteUser(user.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
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
        editUser={editingUser ? { ...editingUser, assigned_trainer: null } : undefined}
        currentUser={currentUser}
        apiEndpoint="/api/trainer/users"
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

  if (user.role !== 'trainer') {
    return {
      redirect: {
        destination: '/login',
        permanent: false
      }
    };
  }

  const users = await getTraineesForTrainer(user.id);

  return {
    props: {
      user,
      users
    }
  };
};