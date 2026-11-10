import { useEffect, useState } from 'react';
import { X, UserPlus, Eye, EyeOff } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { UserWithoutPassword } from '@/lib/auth';

interface AddUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: (user: UserWithoutPassword) => void;
  editUser?: UserWithoutPassword & { assigned_trainer: { name: string; email: string } | null };
  currentUser: UserWithoutPassword;
  apiEndpoint?: string; // Optional custom endpoint
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: 'trainer' | 'trainee';
  assigned_trainer_id: string;
  allowed_sessions: string;
}

export default function AddUserForm({
  isOpen,
  onClose,
  onUserAdded,
  editUser,
  currentUser,
  apiEndpoint = '/api/admin/user' // Default to admin endpoint
}: AddUserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'trainee',
    assigned_trainer_id: '',
    allowed_sessions: ''
  });

  const isEditMode = !!editUser;
  const isTrainer = currentUser.role === 'trainer';

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<UserFormData>>({});
  const [trainers, setTrainers] = useState<UserWithoutPassword[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Only fetch trainers if we are an admin
      if (currentUser.role === 'admin') {
        fetchTrainers();
      }

      if (editUser) {
        setFormData({
          name: editUser.name,
          email: editUser.email,
          password: '',
          role: editUser.role as 'trainer' | 'trainee',
          assigned_trainer_id: editUser.assigned_trainer_id || '',
          allowed_sessions: editUser.allowed_sessions?.toString() || ''
        });
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          role: isTrainer ? 'trainee' : 'trainee', // Default to trainee
          assigned_trainer_id: isTrainer ? currentUser.id : '', // Default to self if trainer
          allowed_sessions: ''
        });
      }
    }
  }, [isOpen, editUser, currentUser, isTrainer]);

  const fetchTrainers = async () => {
    try {
      const response = await fetch('/api/admin/trainers');
      if (response.ok) {
        const data = await response.json();
        setTrainers(data.trainers);
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<UserFormData> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!isEditMode && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Prepare data based on role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submitData: any = {
        name: formData.name,
        email: formData.email,
      };

      if (formData.password) submitData.password = formData.password;
      if (isEditMode && editUser) submitData.userId = editUser.id;

      // If Admin, include all fields
      if (!isTrainer) {
        submitData.role = formData.role;
        submitData.assigned_trainer_id = formData.role === 'trainee' && formData.assigned_trainer_id
          ? formData.assigned_trainer_id
          : null;
        submitData.allowed_sessions = formData.role === 'trainee' && formData.allowed_sessions
          ? parseInt(formData.allowed_sessions)
          : null;
      }
      // If Trainer, these are handled by the backend/context, but we can send safe defaults
      // for endpoints that might expect them, though the specific trainer API shouldn't need them.
      else {
        // For the trainer API, we usually just need name/email/pass.
        // But if using shared types, we keep it simple.
      }

      const response = await fetch(apiEndpoint, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} user`);
      }

      const { user } = await response.json();

      setFormData({
        name: '', email: '', password: '', role: 'trainee', assigned_trainer_id: '', allowed_sessions: ''
      });
      setErrors({});
      onUserAdded(user);
      onClose();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} user:`, error);
      alert(error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} user`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {isEditMode ? 'Edit User' : 'Add New User'}
            </CardTitle>
            <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {isEditMode ? '(leave empty to keep current)' : '*'}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password"
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>

            {/* Admin only fields */}
            {!isTrainer && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <Select
                    options={[
                      { value: 'trainee', label: 'Trainee' },
                      { value: 'trainer', label: 'Trainer' },
                      ...(currentUser.is_super_admin ? [{ value: 'admin', label: 'Admin' }] : [])
                    ]}
                    value={formData.role}
                    onValueChange={(value) => handleInputChange('role', value)}
                  />
                </div>

                {formData.role === 'trainee' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assign To (Optional)</label>
                      <Select
                        options={[
                          { value: '', label: 'No assignment' },
                          ...trainers.map(trainer => ({ value: trainer.id, label: trainer.name }))
                        ]}
                        value={formData.assigned_trainer_id}
                        onValueChange={(value) => handleInputChange('assigned_trainer_id', value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Sessions</label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Enter number of sessions"
                        value={formData.allowed_sessions}
                        onChange={(e) => handleInputChange('allowed_sessions', e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited sessions</p>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update User' : 'Create User')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}