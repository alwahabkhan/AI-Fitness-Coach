// components/program-builder/ui/new/popups/ProgramSettingsModal.tsx
import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { UserWithoutPassword } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface ProgramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; trainee_id: string }) => void;
  trainees: UserWithoutPassword[];
  initialData?: {
    name: string;
    description: string;
    trainee_id: string;
  };
}

export default function ProgramSettingsModal({
  isOpen,
  onClose,
  onSave,
  trainees,
  initialData
}: ProgramSettingsModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trainee_id: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          name: '',
          description: '',
          trainee_id: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Program name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Program name must be at least 2 characters';
    }
    
    if (!formData.trainee_id) {
      newErrors.trainee_id = 'Please select a trainee';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave({
        name: formData.name.trim(),
        description: formData.description.trim(),
        trainee_id: formData.trainee_id
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-lg p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-black cursor-pointer"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-normal mb-6 text-center">
          {initialData ? 'Edit Program' : 'Create Program'}
        </h2>

        <div className="space-y-4">
          {/* Program Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Program Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter program name"
              className={cn(
                "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                errors.name ? "border-red-500" : "border-gray-300"
              )}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Trainee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Trainee *
            </label>
            <select
              value={formData.trainee_id}
              onChange={(e) => handleInputChange('trainee_id', e.target.value)}
              className={cn(
                "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                errors.trainee_id ? "border-red-500" : "border-gray-300"
              )}
            >
              <option value="">Select a trainee...</option>
              {trainees.map((trainee) => (
                <option key={trainee.id} value={trainee.id}>
                  {trainee.name} ({trainee.email})
                </option>
              ))}
            </select>
            {errors.trainee_id && (
              <p className="text-red-500 text-sm mt-1">{errors.trainee_id}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the program goals, duration, difficulty level..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {initialData ? 'Save Changes' : 'Create Program'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}