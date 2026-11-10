import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Bug, User, Settings } from 'lucide-react';
import type { ThreadDebugInfo } from '@/database/derived.types';
import { isDebugEnabled } from '@/lib/debug';

interface ThreadDebugWidgetProps {
  threadId: string;
}

export function ThreadDebugWidget({ threadId }: ThreadDebugWidgetProps) {
  const [debugInfo, setDebugInfo] = useState<ThreadDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isThreadDebugExpanded, setThreadDebugExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleThreadDebug = () => {
    setThreadDebugExpanded((prev) => !prev);
  };

  useEffect(() => {
    const fetchThreadDebugInfo = async () => {
      if (!isDebugEnabled()) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/chat-nutrition/thread/${threadId}/debug`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            // No debug info available, which is fine
            setDebugInfo(null);
            return;
          }
          throw new Error('Failed to fetch thread debug info');
        }

        const data = await response.json();
        setDebugInfo(data.debugInfo);
      } catch (err) {
        console.error('Error fetching thread debug info:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreadDebugInfo();
  }, [threadId]);

  // Don't render anything if debug is not enabled or no debug info available
  if (!isDebugEnabled() || (!debugInfo && !isLoading && !error)) {
    return null;
  }

  const hasDebugInfo =
    debugInfo &&
    (debugInfo.systemPrompt ||
      debugInfo.customPrompt ||
      debugInfo.userInfo ||
      debugInfo.userId);

  return (
    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg overflow-y-scroll">
      <button
        onClick={toggleThreadDebug}
        className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 transition-colors"
        disabled={isLoading}
      >
        <Settings className="h-4 w-4" />
        <span className="font-medium">
          {isThreadDebugExpanded ? 'Hide' : 'Show'} Thread Configuration
        </span>
        {isLoading && <span className="text-xs">(Loading...)</span>}
        {isThreadDebugExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Error loading debug info: {error}
        </div>
      )}

      {isThreadDebugExpanded && hasDebugInfo && (
        <div className="mt-3 space-y-3 max-h-96 overflow-y-auto">
          {/* User Information */}
          {debugInfo.userId && (
            <div className="bg-white border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                <User className="h-4 w-4" />
                User Information
              </h4>
              <div className="text-sm text-blue-600">
                <span className="font-medium">User ID:</span> {debugInfo.userId}
              </div>
            </div>
          )}

          {/* Custom Prompt */}
          {debugInfo.customPrompt && (
            <div className="bg-white border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                <Bug className="h-4 w-4" />
                Custom Prompt
              </h4>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm font-mono whitespace-pre-wrap text-gray-700">
                {debugInfo.customPrompt}
              </div>
            </div>
          )}

          {/* System Prompt */}
          {debugInfo.systemPrompt &&
            debugInfo.systemPrompt !== debugInfo.customPrompt && (
              <div className="bg-white border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                  <Settings className="h-4 w-4" />
                  System Prompt
                </h4>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm font-mono whitespace-pre-wrap text-gray-700">
                  {debugInfo.systemPrompt}
                </div>
              </div>
            )}

          {/* User Context */}
          {debugInfo.userInfo && (
            <div className="bg-white border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                <User className="h-4 w-4" />
                User Context
              </h4>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm font-mono whitespace-pre-wrap text-gray-700">
                {debugInfo.userInfo}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
