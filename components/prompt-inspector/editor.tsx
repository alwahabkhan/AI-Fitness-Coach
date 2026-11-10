import { useState } from 'react';
import { Edit, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MonacoEditor from '@monaco-editor/react';

interface EditorProps {
  title: string;
  subtitle?: string;
  value: string;
  type: 'readonly' | 'editable';
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  onSave?: (value: string) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export default function Editor({
  title,
  subtitle,
  value,
  type,
  height,
  minHeight = '80px',
  maxHeight = '400px',
  onSave,
  onCancel,
  className = ''
}: EditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate dynamic height based on content
  const calculateHeight = (content: string): string => {
    if (height) return height; // Use fixed height if provided

    const lines = content.split('\n').length;
    const lineHeight = 20; // Approximate line height in pixels
    const padding = 40; // Extra padding for editor UI

    const calculatedHeight = Math.max(
      parseInt(minHeight),
      Math.min(parseInt(maxHeight), lines * lineHeight + padding)
    );

    return `${calculatedHeight}px`;
  };

  const displayValue = isEditing ? editingValue : value || '';
  const dynamicHeight = calculateHeight(displayValue);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditingValue(value);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(editingValue);
        setIsEditing(false);
      } catch (error) {
        console.error('Error saving:', error);
        // Keep editing mode on error so user can retry
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditingValue(value);
    setIsEditing(false);
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <span>{title}</span>
            {subtitle && (
              <span className="text-sm font-normal text-gray-500">
                {subtitle}
              </span>
            )}
          </div>
          {type === 'editable' && (
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSave}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm" disabled={isSaving}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={handleEditToggle} size="sm" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border border-gray-300 rounded-md overflow-hidden">
          <MonacoEditor
            height={dynamicHeight}
            language="markdown"
            value={displayValue}
            onChange={(value) => {
              if (isEditing) {
                setEditingValue(value || '');
              }
            }}
            options={{
              readOnly: !isEditing,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              folding: false,
              wordWrap: 'on',
              automaticLayout: true
            }}
            theme="vs"
          />
        </div>
      </CardContent>
    </Card>
  );
}
