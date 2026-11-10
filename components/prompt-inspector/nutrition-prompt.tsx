import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { NutritionPromptBreakdown } from '@/lib/prompt-inspector';

import { Utensils } from 'lucide-react';
import Editor from './editor';

interface NutritionPromptProps {
  selectedUserId: string;
}

export default function NutritionPrompt({
  selectedUserId
}: NutritionPromptProps) {
  const router = useRouter();

  const [nutritionBreakdown, setNutritionBreakdown] =
    useState<NutritionPromptBreakdown | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const getNutritionBreakdown = useCallback(
    async (userId: string) => {
      try {
        const response = await fetch(
          `/api/trainer/prompt-inspector/nutrition?userId=${userId}`
        );

        if (!response.ok) {
          console.error(
            'Error fetching nutrition breakdown:',
            response.statusText
          );
          return;
        }

        const breakdown = await response.json();
        setNutritionBreakdown(breakdown);
      } catch (error) {
        console.error('Error fetching nutrition breakdown:', error);
        router.replace(`/trainer/prompt-inspector?traineeId=${userId}`);
      }
    },
    [router]
  );

  const saveNutritionPrompt = async (userId: string, prompt: string) => {
    const response = await fetch('/api/trainer/prompt-inspector/nutrition', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        content: prompt
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save nutrition prompt');
    }
  };

  const handleSaveUserPrompt = async (value: string) => {
    if (!selectedUserId) return;
    await saveNutritionPrompt(selectedUserId, value);
    await getNutritionBreakdown(selectedUserId);
  };

  const handleSaveUserContext = async (value: string) => {
    if (!selectedUserId) return;

    const response = await fetch('/api/trainer/prompt-inspector/user', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: selectedUserId,
        agentContext: value
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save user context');
    }

    await getNutritionBreakdown(selectedUserId);
  };

  useEffect(() => {
    if (selectedUserId) {
      setLoading(true);
      getNutritionBreakdown(selectedUserId).finally(() => setLoading(false));
    }
  }, [selectedUserId, getNutritionBreakdown]);

  if (!selectedUserId) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Utensils className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>Select a trainee to view their nutrition coach prompt</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading nutrition prompt...</p>
      </div>
    );
  }

  if (!nutritionBreakdown) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Error loading nutrition prompt</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Utensils className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Nutrition Coach Prompt</h2>
      </div>

      {/* Global Prompt Section */}
      <Editor
        title="Global Prompt"
        value={nutritionBreakdown.globalPrompt}
        type="readonly"
        minHeight="120px"
        maxHeight="300px"
      />

      {/* User-Specific Prompt Section */}
      <Editor
        title="User-Specific Prompt"
        subtitle={
          nutritionBreakdown.userPrompt ? '(Overrides Global)' : '(Not Set)'
        }
        value={nutritionBreakdown.userPrompt || ''}
        type="editable"
        minHeight="120px"
        maxHeight="300px"
        onSave={handleSaveUserPrompt}
      />

      {/* User Context Section */}
      <Editor
        title="User Context"
        value={nutritionBreakdown.userContext || ''}
        type="editable"
        minHeight="80px"
        maxHeight="200px"
        onSave={handleSaveUserContext}
      />

      {/* Final Prompt Section */}
      <Editor
        title="Final Prompt (What the AI Sees)"
        value={nutritionBreakdown.finalPrompt}
        type="readonly"
        minHeight="150px"
        maxHeight="500px"
      />
    </div>
  );
}
