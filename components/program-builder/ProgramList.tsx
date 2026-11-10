import { useState } from 'react';
import { 
  Edit, 
  Trash2, 
  User, 
  Dumbbell,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Program, ProgramWithDetails } from '@/database/program-builder.types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/Table';
import { FilterBar } from './ui/FilterBar';

interface ProgramListProps {
  programs: ProgramWithDetails[];
  onCreateProgram: () => void;
  onEditProgram: (program: Program) => void;
  onViewSessions: (program: Program) => void;
  onDeleteProgram: (programId: string) => void;
  userRole: string;
  isLoading?: boolean;
}

export default function ProgramList({
  programs,
  onCreateProgram,
  onEditProgram,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onViewSessions,
  onDeleteProgram,
  userRole,
  isLoading = false
}: ProgramListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [deletingProgram, setDeletingProgram] = useState<string | null>(null);

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch = 
      program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (program.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && program.is_active) ||
      (statusFilter === 'inactive' && !program.is_active);

    return matchesSearch && matchesStatus;
  });

  const handleDeleteProgram = async (programId: string) => {
    try {
      setDeletingProgram(programId);
      await onDeleteProgram(programId);
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Error deleting program:', error);
      // Error is handled by parent component
    } finally {
      setDeletingProgram(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all';

  const DeleteConfirmModal = ({ programId }: { programId: string }) => {
    const program = programs.find(p => p.id === programId);
    const isDeleting = deletingProgram === programId;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Delete Program</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete &quot;{program?.name}&quot;? This action cannot be undone and will remove all training days and exercises.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(null)}
                className="flex-1"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteProgram(programId)}
                className="flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (filteredPrograms.length === 0 && programs.length === 0 && !isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Dumbbell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No programs yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first workout program to get started
          </p>
          {
            (userRole === "admin" || userRole === "trainer") && (
              <Button onClick={onCreateProgram} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Program
              </Button>
            )
          }
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex flex-col gap-4 md:flex-row items-start md:items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl lg:text-3xl">
            <Dumbbell className="h-5 w-5" />
            Programs ({filteredPrograms.length})
          </CardTitle>
          {
            (userRole === "admin" || userRole === "trainer") && (
              <Button 
                onClick={onCreateProgram} 
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
                New Program
              </Button>
            )
          }
        </div>
      </CardHeader>

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading programs...</p>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No programs match your current filters.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program Name</TableHead>
                <TableHead>Trainee</TableHead>
                <TableHead>Created</TableHead>
                {userRole === 'admin' && <TableHead>Created By</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrograms.map((program) => (
                <TableRow key={program.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">
                        {program.name}
                      </div>
                      {program.description && (
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {program.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        {program.trainee?.name || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {formatDate(program.created_at!)}
                    </span>
                  </TableCell>
                  {userRole === 'admin' && (
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {program.trainer?.name || 'Unknown'}
                        </span>
                      </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit Program Structure */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditProgram(program)}
                        className="h-8 w-8 p-0"
                        disabled={isLoading}
                        title="Edit Program Structure"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {/* View Sessions */}
                      {/* <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewSessions(program)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        disabled={isLoading}
                        title="View Training Sessions"
                      >
                        <Activity className="h-4 w-4" />
                      </Button> */}
                      
                      {userRole === 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeleteModal(program.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isLoading || deletingProgram === program.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && <DeleteConfirmModal programId={showDeleteModal} />}
    </Card>
  );
}