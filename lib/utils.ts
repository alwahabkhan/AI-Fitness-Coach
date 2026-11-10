import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(weight: number): string {
  if (weight === 0 || isNaN(weight)) return 'BW';
  // Round to 2 decimal places and remove trailing zeros
  return Number(weight.toFixed(2)).toString();
}

export function formatDateServer(dateString: string | null | undefined) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC'
  });
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
}

export const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';

  // Return an absolute, deterministic formatted date/time (server-safe)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export function parseYouTubeUrl(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Extracts timestamp from YouTube URL and converts to seconds
 * Supports formats: ?t=32, &t=32, ?t=1m30s, &t=1h2m3s, etc.
 */
function extractYouTubeTimestamp(url: string): number | null {
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
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const videoId = parseYouTubeUrl(url);
  if (!videoId) return null;
  
  const timestamp = extractYouTubeTimestamp(url);
  const baseUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`;
  
  // Add start parameter if timestamp exists
  if (timestamp !== null && timestamp > 0) {
    return `${baseUrl}&start=${timestamp}`;
  }
  
  return baseUrl;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const formatWorkoutTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
