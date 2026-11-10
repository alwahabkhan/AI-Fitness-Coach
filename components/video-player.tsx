'use client';

import { memo, useRef } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  className?: string;
}

const VideoPlayer = memo(function VideoPlayer({
  videoUrl,
  className
}: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  const videoId = getYouTubeVideoId(videoUrl);
  const timestamp = extractYouTubeTimestamp(videoUrl);
  
  let embedUrl = '';
  if (videoId) {
    const baseUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&modestbranding=1`;
    // Add start parameter if timestamp exists
    if (timestamp !== null && timestamp > 0) {
      embedUrl = `${baseUrl}&start=${timestamp}`;
    } else {
      embedUrl = baseUrl;
    }
  }

  return (
    <div
      className={`aspect-video bg-gray-900 rounded-lg overflow-hidden ${className}`}
    >
      {embedUrl ? (
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title="Exercise Video"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white">
          <p>Video not available</p>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
