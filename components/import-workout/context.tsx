import { createContext, useContext, useState, ReactNode } from 'react';
import Papa from 'papaparse';
import { z } from 'zod';

interface ExerciseData {
  group: number;
  youtubeLink: string;
  name: string;
  sets: number;
  rest: number;
  weights: number | string;
  reps: number;
}

interface WorkoutDay {
  day: number;
  exercises: ExerciseData[];
}

interface ImportedWorkout {
  name: string;
  workoutDays: WorkoutDay[];
}

// Structured error types
interface CSVParseError {
  type: 'csv_parse_error';
  message: string;
  details: string[];
}

interface CSVValidationError {
  type: 'csv_validation_error';
  message: string;
  details: string[];
}

interface CSVStructureError {
  type: 'csv_structure_error';
  message: string;
}

interface CSVProcessingError {
  type: 'csv_processing_error';
  message: string;
  originalError?: unknown;
}

interface CSVHeaderValidationError {
  type: 'csv_header_validation_error';
  message: string;
  details: string[];
}

type CSVImportError =
  | CSVParseError
  | CSVValidationError
  | CSVStructureError
  | CSVProcessingError
  | CSVHeaderValidationError;

interface WorkoutImportContextType {
  selectedUserId: string;
  setSelectedUserId: (userId: string) => void;
  csvFile: File | null;
  setCsvFile: (file: File | null) => void;
  importedWorkout: ImportedWorkout | null;
  isImporting: boolean;
  importError: { errors: string[] };
  currentDay: number;
  setCurrentDay: (day: number) => void;
  parseCSV: (file: File) => void;
  removeFile: () => void;
  handleImport: () => Promise<void>;
  updateWorkoutName: (name: string) => void;
}

const WorkoutImportContext = createContext<
  WorkoutImportContextType | undefined
>(undefined);

export function WorkoutImportProvider({ children }: { children: ReactNode }) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importedWorkout, setImportedWorkout] =
    useState<ImportedWorkout | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<{ errors: string[] }>({
    errors: []
  });
  const [currentDay, setCurrentDay] = useState(1);

  const removeFile = () => {
    setCsvFile(null);
    setImportedWorkout(null);
    setImportError({ errors: [] });
    setCurrentDay(1);
  };

  const handleCSVError = (error: CSVImportError) => {
    removeFile();

    debugger;
    // Pattern match on error types for specific handling if needed
    switch (error.type) {
      case 'csv_parse_error':
        console.error('CSV Parse Error:', error.details);
        break;
      case 'csv_validation_error':
        console.error('CSV Validation Error:', error.details);
        break;
      case 'csv_structure_error':
        console.error('CSV Structure Error:', error.message);
        break;
      case 'csv_processing_error':
        console.error('CSV Processing Error:', error.originalError);
        break;
      case 'csv_header_validation_error':
        console.error('CSV Header Validation Error:', error.details);
        break;
    }

    // Create error messages array with main message and details
    const errorMessages: string[] = [error.message];

    // Add details for errors that have them
    if ('details' in error && error.details.length > 0) {
      errorMessages.push(...error.details);
    }

    setImportError({ errors: errorMessages });
  };

  const parseCSV = async (file: File) => {
    setImportError({ errors: [] });

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors && results.errors.length > 0) {
            const error: CSVParseError = {
              type: 'csv_parse_error',
              message: `CSV parsing errors: ${results.errors
                .map((e) => e.message)
                .join(', ')}`,
              details: results.errors.map((e) => e.message)
            };
            throw error;
          }

          const rows = results.data as string[][];

          if (rows.length < 2) {
            const error: CSVStructureError = {
              type: 'csv_structure_error',
              message:
                'CSV file must contain at least a header row and one data row.'
            };
            throw error;
          }

          const headerRows = rows[0];

          const validationErrors = validateWithZod(headerRows);
          if (validationErrors.length > 0) {
            const error: CSVHeaderValidationError = {
              type: 'csv_header_validation_error',
              message: 'CSV header validation failed',
              details: validationErrors
            };
            throw error;
          }
          const workoutDays: WorkoutDay[] = [];

          // Calculate how many workout days we have based on the CSV structure
          // After column 7, we have triplets: (day) time weights, (day) time reps, (day) time date
          const availableColumns = headerRows.length - 7; // Subtract first 7 columns
          const maxDays =
            availableColumns >= 2
              ? Math.max(1, Math.floor(availableColumns / 3))
              : 1;

          for (let day = 1; day <= maxDays; day++) {
            const dayExercises: ExerciseData[] = [];

            // Parse each exercise row for this day
            for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
              const values = rows[rowIndex];
              if (values.length < 9) continue; // Skip invalid rows

              // Calculate column indices for this day
              // For day 1: weightsCol = 7, repsCol = 8
              // For day 2: weightsCol = 10, repsCol = 11
              // For day 3: weightsCol = 13, repsCol = 14
              const weightsCol = 7 + (day - 1) * 3; // 7, 10, 13, 16, etc.
              const repsCol = weightsCol + 1; // 8, 11, 14, 17, etc.

              // Ensure we don't go beyond available columns
              if (weightsCol >= values.length || repsCol >= values.length) {
                console.warn(
                  `Skipping day ${day} - insufficient columns for exercise at row ${rowIndex}`
                );
                continue;
              }

              const exercise: ExerciseData = {
                group: parseInt(values[0]),
                youtubeLink: values[1],
                name: values[2],
                sets: parseInt(values[3]),
                rest: parseInt(values[4]),
                weights: values[weightsCol].toLowerCase().includes('bw')
                  ? 'BW'
                  : parseFloat(values[weightsCol]),
                reps: parseInt(values[repsCol])
              };

              dayExercises.push(exercise);
            }

            if (dayExercises.length > 0) {
              workoutDays.push({
                day,
                exercises: dayExercises
              });
            }
          }

          if (workoutDays.length === 0) {
            const error: CSVValidationError = {
              type: 'csv_validation_error',
              message: 'No valid workout days found in the CSV file.',
              details: []
            };
            throw error;
          }

          setImportedWorkout({
            name: file.name.replace('.csv', ''),
            workoutDays
          });
        } catch (err) {
          console.error('CSV processing error:', err);
          if (err && typeof err === 'object' && 'type' in err) {
            handleCSVError(err as CSVImportError);
            return;
          }
          const error: CSVProcessingError = {
            type: 'csv_processing_error',
            message: 'Error processing CSV data. Please check the format.',
            originalError: err
          };
          handleCSVError(error);
        }
      },
      error: (error) => {
        console.error('PapaParse error:', error);
        const csvError: CSVParseError = {
          type: 'csv_parse_error',
          message:
            "Failed to parse CSV file. Please ensure it's a valid CSV format.",
          details: [error.message || 'Unknown parsing error']
        };
        handleCSVError(csvError);
      }
    });
  };

  const updateWorkoutName = (name: string) => {
    if (importedWorkout) {
      setImportedWorkout({
        ...importedWorkout,
        name: name.trim() || importedWorkout.name
      });
    }
  };

  const handleImport = async () => {
    if (!importedWorkout || !selectedUserId) return;

    setIsImporting(true);
    try {
      const response = await fetch('/api/workout/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workout: importedWorkout,
          userId: selectedUserId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import workout');
      }

      const result = await response.json();

      removeFile();
      setSelectedUserId('');

      alert(
        `Workout imported successfully! Created ${result.createdWorkouts.length} workout day(s).`
      );
    } catch (err) {
      console.error('Import error:', err);
      setImportError({
        errors: [
          err instanceof Error
            ? err.message
            : 'Failed to import workout. Please try again.'
        ]
      });
    } finally {
      setIsImporting(false);
    }
  };

  const value: WorkoutImportContextType = {
    selectedUserId,
    setSelectedUserId,
    csvFile,
    setCsvFile,
    importedWorkout,
    isImporting,
    importError,
    currentDay,
    setCurrentDay,
    parseCSV,
    removeFile,
    handleImport,
    updateWorkoutName
  };

  return (
    <WorkoutImportContext.Provider value={value}>
      {children}
    </WorkoutImportContext.Provider>
  );
}

export function useWorkoutImport() {
  const context = useContext(WorkoutImportContext);
  if (context === undefined) {
    throw new Error(
      'useWorkoutImport must be used within a WorkoutImportProvider'
    );
  }
  return context;
}

function validateWithZod(headerRows: string[]) {
  const FIXED_HEADER_COLUMNS_LENGTH = 7;
  const availableColumns = headerRows.length - FIXED_HEADER_COLUMNS_LENGTH;

  if (availableColumns < 2) {
    return [
      'CSV must have at least 2 workout day columns (weights and reps for day 1)'
    ];
  }

  const maxDays = Math.max(1, Math.floor(availableColumns / 3));
  const errors: string[] = [];

  // Validate fixed columns with Zod
  const fixedSchema = z.object({
    exerciseGroup: z
      .string()
      .refine(
        (val) =>
          val.toLowerCase().includes('exercise group') ||
          val.toLowerCase().includes('group'),
        {
          message: "Column 1 should be 'Exercise Group'"
        }
      ),
    youtubeLink: z
      .string()
      .refine(
        (val) =>
          val.toLowerCase().includes('youtube') ||
          val.toLowerCase().includes('link'),
        {
          message: "Column 2 should be 'YouTube Link'"
        }
      ),
    exerciseName: z
      .string()
      .refine(
        (val) =>
          val.toLowerCase().includes('exercise') ||
          val.toLowerCase().includes('day 1'),
        {
          message: "Column 3 should be 'Day 1 Exercises'"
        }
      ),
    sets: z.string().refine((val) => val.toLowerCase().includes('sets'), {
      message: "Column 4 should be 'Sets'"
    }),
    rest: z.string().refine((val) => val.toLowerCase().includes('rest'), {
      message: "Column 5 should be 'Rest'"
    }),
    weightProgress: z
      .string()
      .refine(
        (val) =>
          val.toLowerCase().includes('w+') ||
          val.toLowerCase().includes('progress'),
        {
          message: "Column 6 should be 'W+ progress in weights'"
        }
      ),
    repProgress: z
      .string()
      .refine(
        (val) =>
          val.toLowerCase().includes('r+') ||
          val.toLowerCase().includes('progress'),
        {
          message: "Column 7 should be 'R+ progress in repetitions'"
        }
      )
  });

  const fixedResult = fixedSchema.safeParse({
    exerciseGroup: headerRows[0],
    youtubeLink: headerRows[1],
    exerciseName: headerRows[2],
    sets: headerRows[3],
    rest: headerRows[4],
    weightProgress: headerRows[5],
    repProgress: headerRows[6]
  });

  if (!fixedResult.success) {
    errors.push(...fixedResult.error.errors.map((err) => err.message));
  }

  // Validate workout day columns
  for (let day = 1; day <= maxDays; day++) {
    const baseColIndex = FIXED_HEADER_COLUMNS_LENGTH + (day - 1) * 3;

    // Validate weights column
    const weightsColIndex = baseColIndex;
    if (weightsColIndex < headerRows.length) {
      const weightsHeader = headerRows[weightsColIndex].toLowerCase();
      if (
        !weightsHeader.includes('weights') &&
        !weightsHeader.includes('weight')
      ) {
        errors.push(
          `Column ${weightsColIndex + 1} (Day ${day} weights) should contain "weights" but found "${headerRows[weightsColIndex]}"`
        );
      }
    } else {
      errors.push(
        `Column ${weightsColIndex + 1} is missing. Expected: Day ${day} weights`
      );
    }

    // Validate reps column
    const repsColIndex = baseColIndex + 1;
    if (repsColIndex < headerRows.length) {
      const repsHeader = headerRows[repsColIndex].toLowerCase();
      if (!repsHeader.includes('reps') && !repsHeader.includes('rep')) {
        errors.push(
          `Column ${repsColIndex + 1} (Day ${day} reps) should contain "reps" but found "${headerRows[repsColIndex]}"`
        );
      }
    } else {
      errors.push(
        `Column ${repsColIndex + 1} is missing. Expected: Day ${day} reps`
      );
    }

    // Validate date column
    const dateColIndex = baseColIndex + 2;
    if (dateColIndex < headerRows.length) {
      const dateHeader = headerRows[dateColIndex].toLowerCase();
      if (!dateHeader.includes('date') && !dateHeader.includes('time')) {
        errors.push(
          `Column ${dateColIndex + 1} (Day ${day} date) should contain "date" or "time" but found "${headerRows[dateColIndex]}"`
        );
      }
    } else {
      errors.push(
        `Column ${dateColIndex + 1} is missing. Expected: Day ${day} date`
      );
    }
  }

  return errors;
}
