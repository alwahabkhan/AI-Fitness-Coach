import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}

export default function VideoModal({ isOpen, onClose, videoUrl, title = "Video" }: VideoModalProps) {
  if (!isOpen) return null;

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Extract timestamp from YouTube URL and convert to seconds
  const extractYouTubeTimestamp = (url: string): number | null => {
    // Match t= parameter with various formats
    const timestampRegex = /[?&]t=(\d+[hms]?)+/i;
    const match = url.match(timestampRegex);
    
    if (!match) return null;
    
    const timeString = match[1];
    
    // If it's just a number, it's seconds
    if (/^\d+$/.test(timeString)) {
      return parseInt(timeString, 10);
    }
    
    // Parse formats like "1m30s", "1h2m3s", etc.
    let totalSeconds = 0;
    
    // Extract hours
    const hoursMatch = timeString.match(/(\d+)h/i);
    if (hoursMatch) {
      totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
    }
    
    // Extract minutes
    const minutesMatch = timeString.match(/(\d+)m/i);
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1], 10) * 60;
    }
    
    // Extract seconds
    const secondsMatch = timeString.match(/(\d+)s/i);
    if (secondsMatch) {
      totalSeconds += parseInt(secondsMatch[1], 10);
    }
    
    // If no units found but we have a match, try parsing as plain number
    if (totalSeconds === 0 && /^\d+$/.test(timeString)) {
      return parseInt(timeString, 10);
    }
    
    return totalSeconds > 0 ? totalSeconds : null;
  };

  // Convert YouTube URL to embed format with timestamp support
  const getEmbedUrl = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) {
      // Fallback to old method if regex doesn't match
      const fallbackId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://www.youtube.com/embed/${fallbackId}`;
    }
    
    const timestamp = extractYouTubeTimestamp(url);
    const baseUrl = `https://www.youtube.com/embed/${videoId}`;
    
    // Add start parameter if timestamp exists
    if (timestamp !== null && timestamp > 0) {
      return `${baseUrl}?start=${timestamp}`;
    }
    
    return baseUrl;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle>{title}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="aspect-video">
            <iframe
              src={getEmbedUrl(videoUrl)}
              title={title}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}