import { Upload, FileText, AlertCircle, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { useWorkoutImport } from './context';

export function CSVUpload() {
  const {
    selectedUserId,
    csvFile,
    setCsvFile,
    importError,
    parseCSV,
    removeFile
  } = useWorkoutImport();

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      accept: {
        'text/csv': ['.csv'],
        'application/csv': ['.csv']
      },
      maxFiles: 1,
      disabled: !selectedUserId,
      onDrop: (acceptedFiles, fileRejections) => {
        if (fileRejections.length > 0) {
          return;
        }

        if (acceptedFiles.length > 0) {
          const file = acceptedFiles[0];
          setCsvFile(file);
          parseCSV(file);
        }
      }
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Workout CSV</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${!selectedUserId && 'pointer-events-none bg-gray-50'}
            ${
              selectedUserId &&
              !csvFile &&
              (isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400')
            }
            ${isDragReject && 'border-red-400 bg-red-50'}
            ${csvFile && 'border-green-300 bg-green-50'}
          `}
        >
          <input {...getInputProps()} />

          {csvFile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-12 w-12 text-green-600" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="text-gray-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-lg font-medium text-green-800">
                {csvFile.name}
              </p>
              <p className="text-sm text-green-600">File ready for import</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload
                className={`mx-auto h-12 w-12 ${
                  selectedUserId
                    ? isDragActive
                      ? 'text-blue-500'
                      : 'text-gray-400'
                    : 'text-gray-300'
                }`}
              />
              <p
                className={`text-lg font-medium ${
                  selectedUserId ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {!selectedUserId
                  ? 'Select a trainee first'
                  : isDragActive
                    ? 'Drop the CSV file here'
                    : 'Drop your CSV file here'}
              </p>
              <p
                className={`text-sm ${
                  selectedUserId ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {selectedUserId && 'or click to browse files'}
              </p>
              {isDragReject && (
                <p className="text-sm text-red-600">
                  Only CSV files are accepted
                </p>
              )}
            </div>
          )}
        </div>

        {importError.errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-800">
                  CSV Import Errors:
                </p>
                <ul className="text-sm text-red-700 space-y-1">
                  {importError.errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-600">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
