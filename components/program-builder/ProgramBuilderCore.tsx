import { useState, useEffect } from 'react';
import { Dumbbell, Users, Activity, Upload, Download } from 'lucide-react';
import { Layout } from '@/components/layout/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserWithoutPassword } from '@/lib/auth';
import { ProgramWithDetails, Program } from '@/database/program-builder.types';
import ProgramList from './ProgramList';
import ImportExportModal from './ImportExportModal';
import ProgramView from './ProgramView';
import CreateProgramPopup from './ui/new/popups/CreateProgramPopup';

interface ProgramBuilderCoreProps {
  user: UserWithoutPassword;
}

export default function ProgramBuilderCore({ user }: ProgramBuilderCoreProps) {
  const [programs, setPrograms] = useState<ProgramWithDetails[]>([]);
  const [trainees, setTrainees] = useState<UserWithoutPassword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('import');
  const [isCreateProgramPopupOpen, setIsCreateProgramPopupOpen] = useState(false);
  
  // View state
  const [currentView, setCurrentView] = useState<'dashboard' | 'program'>('dashboard');
  const [viewMode, setViewMode] = useState<'create' | 'edit' | 'sessions'>('create');
  const [editingProgram, setEditingProgram] = useState<ProgramWithDetails | null>(null);

  useEffect(() => {
    fetchPrograms();
    fetchTrainees();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewSessions = async (program: Program) => {
    try {
      setIsLoading(true);
      setError(null);
      const programDetails = await fetchProgramDetails(program.id);
      if (programDetails) {
        setEditingProgram(programDetails);
        setViewMode('sessions');
        setCurrentView('program');
      } else {
        setError('Failed to load program details');
      }
    } catch (error) {
      console.error('Error loading program:', error);
      setError('Failed to load program details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrograms = async (): Promise<ProgramWithDetails[]> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/program');
      if (!response.ok) {
        throw new Error(`Failed to fetch programs: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setPrograms(data);
      return data;
    } catch (error) {
      console.error('Error fetching programs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load programs');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrainees = async () => {
    // Trainees don't need to fetch the trainees list
    if (user.role === 'trainee') {
      setTrainees([]);
      return;
    }

    try {
      const response = await fetch('/api/program/trainees');
      if (!response.ok) {
        throw new Error(`Failed to fetch trainees: ${response.status} ${response.statusText}`);
      }
      const trainees = await response.json();
      setTrainees(trainees);
    } catch (err) {
      console.error('Error fetching trainees:', err);
      // Don't overwrite existing error from programs if it exists
      if (!error) {
        setError(err instanceof Error ? err.message : 'Failed to load trainees');
      }
    }
  };

  const fetchProgramDetails = async (programId: string): Promise<ProgramWithDetails | null> => {
    try {
      const response = await fetch(`/api/program/${programId}`);
      if (!response.ok) throw new Error('Failed to fetch program details');
      return await response.json();
    } catch (error) {
      console.error('Error fetching program details:', error);
      setError('Failed to load program details');
      return null;
    }
  };

  const handleCreateProgram = () => {
    setIsCreateProgramPopupOpen(true);
  };

  const handleProgramCreate = async (name: string) => {
    // Create a minimal program first, then open the edit view
    try {
      const response = await fetch('/api/program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          trainee_id: trainees[0]?.id || '', // Default to first trainee or empty
          description: ''
        })
      });

      if (response.ok) {
        const newProgram = await response.json();
        // Fetch full program details
        const detailsResponse = await fetch(`/api/program/${newProgram.id}`);
        if (detailsResponse.ok) {
          const programDetails = await detailsResponse.json();
          setEditingProgram(programDetails);
          setViewMode('edit');
          setCurrentView('program');
          setIsCreateProgramPopupOpen(false);
        }
      }
    } catch (error) {
      console.error('Error creating program:', error);
      setError('Failed to create program. Please try again.');
    }
  };

  const handleEditProgram = async (program: Program) => {
    try {
      setIsLoading(true);
      setError(null);
      const programDetails = await fetchProgramDetails(program.id);
      if (programDetails) {
        setEditingProgram(programDetails);
        setViewMode('edit');
        setCurrentView('program');
      } else {
        setError('Failed to load program details');
      }
    } catch (error) {
      console.error('Error loading program:', error);
      setError('Failed to load program details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToDashboard = async () => {
    setCurrentView('dashboard');
    setEditingProgram(null);
    setViewMode('create');
    setError(null);
    // Refresh programs list when coming back from program view
    await fetchPrograms();
  };

  const handleProgramDeleted = async (programId: string) => {
    try {
      const response = await fetch(`/api/program/${programId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete program');
      }

      // Remove from local state only after successful deletion
      setPrograms(programs.filter(p => p.id !== programId));
    } catch (error) {
      console.error('Error deleting program:', error);
      setError('Failed to delete program. Please try again.');
    }
  };

  const handleImportProgram = () => {
    setImportExportMode('import');
    setIsImportExportOpen(true);
  };

  const handleExportProgram = () => {
    setImportExportMode('export');
    setIsImportExportOpen(true);
  };

  const handleImportExportClose = () => {
    setIsImportExportOpen(false);
  };

  const handleImportSuccess = async () => {
    await fetchPrograms(); // Refresh programs list
    setIsImportExportOpen(false); // Close modal on success
  };

  const renderStats = () => {
    const totalPrograms = programs.length;
    const activePrograms = programs.filter(p => p.is_active).length;
    const totalTrainees = user.role === 'trainee' ? 1 : trainees.length;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-blue-600 rounded-lg">
                <Dumbbell className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-600 uppercase tracking-wide">Total Programs</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900">{totalPrograms}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-green-600 rounded-lg">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-green-600 uppercase tracking-wide">Active Programs</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-900">{activePrograms}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-purple-600 rounded-lg">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-purple-600 uppercase tracking-wide">Trainees</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-900">{totalTrainees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    if (currentView === 'program') {
      return (
        <ProgramView
          onBack={handleBackToDashboard}
          trainees={trainees}
          initialData={editingProgram}
          mode={viewMode}
          userRole={user.role}
        />
      );
    }

    // Dashboard view
    if (error) {
      return (
        <Card className="p-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={() => {
              setError(null);
              fetchPrograms();
              fetchTrainees();
            }}>
              Retry
            </Button>
          </div>
        </Card>
      );
    }

    if (isLoading) {
      return (
        <Card className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading programs...</p>
          </div>
        </Card>
      );
    }

    return (
      <ProgramList
        programs={programs}
        onCreateProgram={handleCreateProgram}
        onEditProgram={handleEditProgram}
        onViewSessions={handleViewSessions}
        onDeleteProgram={handleProgramDeleted}
        userRole={user.role}
        isLoading={isLoading}
      />
    );
  };

  return (
    <Layout user={user}>
      <div className="container min-h-screen bg-gray-50">
        {/* Header */}
        {true && (
          <div className="px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-3 sm:gap-4">
                    Program Builder
                  </h1>
                  <p className="text-base sm:text-lg text-gray-600 mt-2 sm:mt-3">
                    Create and manage comprehensive workout programs for your trainees
                  </p>
                </div>
                
                {/* Import/Export Actions */}
                {(user.role === 'admin' || user.role === 'trainer') && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={handleImportProgram}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Import Program
                  </Button>
                  <Button
                    onClick={handleExportProgram}
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={programs.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Export Program
                  </Button>
                </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - Only show on dashboard */}
        {true && renderStats()}

        {/* Breadcrumb Navigation - Show when in program view */}
        {currentView === 'program' && (
          <div className="px-4 sm:px-6 lg:px-8 mb-4">
            <nav className="flex items-center space-x-2 text-sm">
              <button
                onClick={handleBackToDashboard}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Program Builder
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">
                {viewMode === 'create' && 'Create Program'}
                {viewMode === 'edit' && `Edit: ${editingProgram?.name || 'Program'}`}
                {viewMode === 'sessions' && `Sessions: ${editingProgram?.name || 'Program'}`}
              </span>
            </nav>
          </div>
        )}


        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8">
          {renderContent()}
        </div>

        {/* Import/Export Modal */}
        <ImportExportModal
          isOpen={isImportExportOpen}
          onClose={handleImportExportClose}
          mode={importExportMode}
          programs={programs.map(p => ({ id: p.id, name: p.name, trainee_id: p.trainee_id }))}
          trainees={trainees}
          onImportSuccess={handleImportSuccess}
        />

        <CreateProgramPopup
          isOpen={isCreateProgramPopupOpen}
          onClose={() => setIsCreateProgramPopupOpen(false)}
          onCreateProgram={handleProgramCreate}
        />
      </div>
    </Layout>
  );
}