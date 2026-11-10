import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Edit3 } from 'lucide-react';

interface EditableCellProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
}

export function EditableCell({ 
  value, 
  onSave, 
  type = 'text', 
  placeholder,
  className = ''
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(type === 'number' ? Number(e.target.value) : e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 w-20"
          placeholder={placeholder}
          autoFocus
        />
        <button
          onClick={handleSave}
          className="p-1 text-green-600 hover:text-green-700"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-red-600 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`flex items-center gap-2 text-left hover:bg-gray-100 rounded px-2 py-1 ${className}`}
    >
      <span>{value}</span>
      <Edit3 className="h-3 w-3 opacity-50" />
    </button>
  );
}