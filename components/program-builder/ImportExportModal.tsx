/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileText,
  AlertCircle,
  CheckCircle,
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserWithoutPassword } from '@/lib/auth';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'import' | 'export';
  programs?: Array<{ id: string; name: string; trainee_id: string }>;
  trainees?: UserWithoutPassword[];
  onImportSuccess: () => void;
}

interface ImportStatus {
  type: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  details?: string;
}

interface ProgramData {
  name: string;
  description?: string;
  trainee_id: string;
  training_days: Array<{
    name: string;
    day_order: number;
    exercises: Array<{
      exercise_name: string;
      sets: number;
      reps: number;
    }>;
  }>;
}

export default function ImportExportModal({
  isOpen,
  onClose,
  mode,
  programs = [],
  trainees = [],
  onImportSuccess
}: ImportExportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [importStatus, setImportStatus] = useState<ImportStatus>({ type: 'idle' });
  const [parsedData, setParsedData] = useState<ProgramData | null>(null);
  const [selectedTraineeId, setSelectedTraineeId] = useState('');

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      setImportStatus({
        type: 'error',
        message: 'Invalid file type',
        details: 'Please select a JSON file'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Basic validation
        if (!data.name || !data.training_days || !Array.isArray(data.training_days)) {
          throw new Error('Invalid program format');
        }

        setParsedData(data);
        setSelectedTraineeId(data.trainee_id || '');
        setImportStatus({
          type: 'success',
          message: 'File parsed successfully',
          details: `Found ${data.training_days.length} training days with ${data.training_days.reduce((total: number, day: any) => total + (day.exercises?.length || 0), 0)} total exercises`
        });
      } catch (error) {
        setImportStatus({
          type: 'error',
          message: 'Failed to parse file',
          details: error instanceof Error ? error.message : 'Invalid JSON format'
        });
        setParsedData(null);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsedData || !selectedTraineeId) return;

    setImportStatus({ type: 'loading', message: 'Importing program...' });

    try {
      const importData = {
        ...parsedData,
        trainee_id: selectedTraineeId
      };

      const response = await fetch('/api/program/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Import failed');
      }

      const result = await response.json();
      setImportStatus({
        type: 'success',
        message: 'Program imported successfully!',
        details: `Created program ID: ${result.program_id}`
      });

      // Reset form and notify parent
      setTimeout(() => {
        onImportSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      setImportStatus({
        type: 'error',
        message: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleExport = async () => {
    if (!selectedProgramId) return;

    try {
      const response = await fetch(`/api/program/${selectedProgramId}/export`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="([^"]+)"/)?.[1] || 'program_export.json';
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export program');
    }
  };

  const getStatusIcon = () => {
    switch (importStatus.type) {
      case 'loading':
        return <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (importStatus.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'loading':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const resetImport = () => {
    setParsedData(null);
    setSelectedTraineeId('');
    setImportStatus({ type: 'idle' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="flex items-center gap-2">
            {mode === 'import' ? (
              <>
                <Upload className="h-5 w-5" />
                Import Program
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Export Program
              </>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          {mode === 'import' ? (
            <div className="space-y-6">
              {/* File Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Program File
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Choose JSON File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {parsedData && (
                    <Button onClick={resetImport} variant="ghost" size="sm">
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Message */}
              {importStatus.type !== 'idle' && (
                <div className={`p-3 border rounded-md flex items-start gap-2 ${getStatusColor()}`}>
                  {getStatusIcon()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{importStatus.message}</p>
                    {importStatus.details && (
                      <p className="text-xs mt-1 opacity-80">{importStatus.details}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Program Preview */}
              {parsedData && (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <h4 className="font-medium text-gray-900 mb-2">Program Preview</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Name:</strong> {parsedData.name}</p>
                      {parsedData.description && (
                        <p><strong>Description:</strong> {parsedData.description}</p>
                      )}
                      <p><strong>Training Days:</strong> {parsedData.training_days.length}</p>
                      <p><strong>Total Exercises:</strong> {parsedData.training_days.reduce((total, day) => total + (day.exercises?.length || 0), 0)}</p>
                    </div>
                  </div>

                  {/* Trainee Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Assign to Trainee *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={selectedTraineeId}
                        onChange={(e) => setSelectedTraineeId(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select trainee...</option>
                        {trainees.map((trainee) => (
                          <option key={trainee.id} value={trainee.id}>
                            {trainee.name} ({trainee.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!parsedData || !selectedTraineeId || importStatus.type === 'loading'}
                >
                  {importStatus.type === 'loading' ? 'Importing...' : 'Import Program'}
                </Button>
              </div>
            </div>
          ) : (
            /* Export Mode */
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Program to Export
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a program...</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The exported JSON file will include all program details, 
                  training days, and exercises. You can import this file later to recreate the program.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={!selectedProgramId}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Program
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}