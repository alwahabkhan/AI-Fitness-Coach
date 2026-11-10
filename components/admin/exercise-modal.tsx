import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CentralizedExercise, MainMuscleType, MuscleRatios } from '@/lib/centralized_exercise';

// All available muscle types from the enum
const MAIN_MUSCLE_OPTIONS: MainMuscleType[] = [
  'Back1',
  'Back2',
  'Lats1', 
  'Lats2',
  'Low back',
  'Chest1',
  'Chest2',
  'Quads1',
  'Quads2',
  'Tibialis',
  'Hams1',
  'Hams2',
  'Glutes1',
  'Glutes2',
  'Shoulders1',
  'Shoulders2',
  'Biceps',
  'Triceps',
  'Forearm',
  'Calves',
  'Plantar fascia',
  'Core',
  'Mobility',
  'Traps',
  'Cardio',
  'Circuits',
  'Neck'
];

// All available muscle ratio keys
const MUSCLE_RATIO_OPTIONS: (keyof MuscleRatios)[] = [
  'Glutes',
  'Chest', 
  'Shoulders',
  'Triceps',
  'Back',
  'R. shoulders',
  'Quads',
  'Hamstrings',
  'Biceps',
  'Lats',
  'Abdominals',
  'Calves',
  'Cardio',
  'Forearms',
  'Lower back',
  'Traps',
  'Low traps',
  'Neck',
  'Adductors',
  'Abductors'
];

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<CentralizedExercise>) => Promise<void>;
  title: string;
  initialData?: CentralizedExercise;
}

export default function ExerciseModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialData
}: ExerciseModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    main_muscle: '' as MainMuscleType | '',
    prompt_exercise_description: '',
    video_url: ''
  });
  
  const [ratios, setRatios] = useState<MuscleRatios>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        short_name: initialData.short_name || '',
        main_muscle: initialData.main_muscle || '',
        prompt_exercise_description: initialData.prompt_exercise_description || '',
        video_url: initialData.video_url || ''
      });
      
      // Handle ratios - parse from JSON if exists
      try {
        const parsedRatios = initialData.ratios ? 
          (typeof initialData.ratios === 'string' ? 
            JSON.parse(initialData.ratios) : 
            initialData.ratios) : {};
        setRatios(parsedRatios || {});
      } catch (e) {
        console.error('Error parsing ratios:', e);
        setRatios({});
      }
    } else {
      setFormData({
        name: '',
        short_name: '',
        main_muscle: '',
        prompt_exercise_description: '',
        video_url: ''
      });
      setRatios({});
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Exercise name is required');
      }

      // Filter out empty ratios and ensure they're numbers with 1 decimal place
      const cleanedRatios: MuscleRatios = {};
      Object.entries(ratios).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const numValue = typeof value === 'string' ? parseFloat(value) : value;
          if (!isNaN(numValue) && numValue > 0) {
            cleanedRatios[key as keyof MuscleRatios] = Math.round(numValue * 10) / 10; // Ensure 1 decimal place
          }
        }
      });

      const submitData: Partial<CentralizedExercise> = {
        name: formData.name.trim(),
        short_name: formData.short_name.trim() || null,
        main_muscle: formData.main_muscle || null,
        prompt_exercise_description: formData.prompt_exercise_description.trim() || null,
        video_url: formData.video_url.trim() || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ratios: Object.keys(cleanedRatios).length > 0 ? (cleanedRatios as any) : null
      };

      await onSubmit(submitData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleRatioChange = (muscle: keyof MuscleRatios, value: string) => {
    setRatios(prev => ({
      ...prev,
      [muscle]: value === '' ? undefined : value
    }));
  };

  const addRatio = (muscle: keyof MuscleRatios) => {
    setRatios(prev => ({
      ...prev,
      [muscle]: '1.0'
    }));
  };

  const removeRatio = (muscle: keyof MuscleRatios) => {
    setRatios(prev => {
      const newRatios = { ...prev };
      delete newRatios[muscle];
      return newRatios;
    });
  };

  const availableMuscles = MUSCLE_RATIO_OPTIONS.filter(muscle => !(muscle in ratios));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Exercise Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exercise Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="e.g., Push Up, Bench Press"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Short Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short Name
              </label>
              <Input
                type="text"
                value={formData.short_name}
                onChange={handleChange('short_name')}
                placeholder="e.g., BP, PU (optional)"
                disabled={isSubmitting}
              />
            </div>

            {/* Main Muscle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Muscle Group
              </label>
              <select
                value={formData.main_muscle}
                onChange={handleChange('main_muscle')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                disabled={isSubmitting}
              >
                <option value="">Select muscle group (optional)</option>
                {MAIN_MUSCLE_OPTIONS.map((muscle) => (
                  <option key={muscle} value={muscle}>
                    {muscle}
                  </option>
                ))}
              </select>
            </div>

            {/* Video URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video URL
              </label>
              <Input
                type="url"
                value={formData.video_url}
                onChange={handleChange('video_url')}
                placeholder="https://youtube.com/... (optional)"
                disabled={isSubmitting}
              />
            </div>

            {/* Exercise Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exercise Description
              </label>
              <textarea
                value={formData.prompt_exercise_description}
                onChange={handleChange('prompt_exercise_description')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                placeholder="Description for AI coaching context (optional)"
                disabled={isSubmitting}
              />
            </div>

            {/* Muscle Ratios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Muscle Activation Ratios
              </label>
              <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                {/* Current Ratios */}
                <div className="space-y-2 mb-3">
                  {Object.entries(ratios).map(([muscle, value]) => (
                    <div key={muscle} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 w-24 flex-shrink-0">
                        {muscle}:
                      </span>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={value || ''}
                        onChange={(e) => handleRatioChange(muscle as keyof MuscleRatios, e.target.value)}
                        className="w-20 text-center"
                        placeholder="1.0"
                        disabled={isSubmitting}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeRatio(muscle as keyof MuscleRatios)}
                        disabled={isSubmitting}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add New Ratio */}
                {availableMuscles.length > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addRatio(e.target.value as keyof MuscleRatios);
                            e.target.value = ''; // Reset selection
                          }
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        disabled={isSubmitting}
                      >
                        <option value="">Add muscle ratio...</option>
                        {availableMuscles.map((muscle) => (
                          <option key={muscle} value={muscle}>
                            {muscle}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Ratios represent muscle activation coefficients (e.g., 0.5, 1.0, 2.0)
                    </p>
                  </div>
                )}

                {Object.keys(ratios).length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No muscle ratios defined. Select from dropdown above to add.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Exercise' : 'Create Exercise'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}