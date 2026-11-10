import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useSessionDuration } from './session-duration-context';

interface SessionDurationDisplayProps {
  className?: string;
}

export function SessionDurationDisplay({ className = '' }: SessionDurationDisplayProps) {
  const { elapsedSeconds } = useSessionDuration();

  // Format time as MM:SS or HH:MM:SS
  const formattedTime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  if (elapsedSeconds === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center text-white px-4 py-2.5 rounded-lg shadow-md ${className}`}
      style={{ backgroundColor: '#036FE3' }}
    >
      <div className="flex items-center justify-center w-8 h-8 mr-3 bg-white rounded-full flex-shrink-0">
        <Clock className="w-4 h-4" style={{ color: '#036FE3' }} />
      </div>
      <div className="flex flex-col text-left min-w-0">
        <p className="text-xs font-normal opacity-90 leading-tight">Session Duration</p>
        <div className="font-bold text-base leading-tight mt-0.5">{formattedTime}</div>
      </div>
    </div>
  );
}

