import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VideoPlayer from '@/components/video-player';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  exerciseName: string;
}

export default function VideoModal({
  isOpen,
  onClose,
  videoUrl,
  exerciseName
}: VideoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {exerciseName} - Exercise Video
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4">
          <VideoPlayer videoUrl={videoUrl} />
        </div>
      </div>
    </div>
  );
}