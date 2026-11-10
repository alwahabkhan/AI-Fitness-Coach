import React from 'react';
import { ChevronDown, ChevronUp, Bug, Clock, Database } from 'lucide-react';
import { formatTime } from '@/lib/utils';

export type DBToolUsage = {
  toolName: string;
  parameters: Record<string, unknown>;
  timestamp: string;
  response?: string;
  error?: string;
  query?: string;
  rowCount?: number;
  data?: unknown[];
  executionTime?: number;
};

export type DBDebugInfo = {
  processingTime?: number;
  toolUsage?: DBToolUsage[];
};

interface DBDebugWidgetProps {
  debugInfo: DBDebugInfo;
  toggleDebug: () => void;
  isExpanded: boolean;
}

export function DBDebugWidget({
  debugInfo,
  toggleDebug,
  isExpanded
}: DBDebugWidgetProps) {
  const hasDebugInfo =
    debugInfo &&
    (debugInfo.processingTime ||
      (debugInfo.toolUsage && debugInfo.toolUsage.length > 0));

  if (!hasDebugInfo) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <button
        onClick={toggleDebug}
        className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
      >
        <Bug className="h-3 w-3" />
        <span className="font-medium">
          {isExpanded ? 'Hide' : 'Show'} Debug Info
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-3 max-h-96 overflow-y-auto">
          {/* Processing Stats */}
          {debugInfo.processingTime && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Processing Stats
              </h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Processing Time: {debugInfo.processingTime}ms</span>
                </div>
              </div>
            </div>
          )}

          {/* Database Operations */}
          {debugInfo.toolUsage && debugInfo.toolUsage.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <Database className="h-3 w-3" />
                Database Operations ({debugInfo.toolUsage.length})
              </h4>
              <div className="space-y-2">
                {debugInfo.toolUsage.map((tool, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded p-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">
                        {tool.toolName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(tool.timestamp)}
                      </span>
                    </div>

                    {/* SQL Query */}
                    {tool.query && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          SQL Query:
                        </span>
                        <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs font-mono whitespace-pre-wrap">
                          {tool.query}
                        </div>
                      </div>
                    )}

                    {/* Execution Stats */}
                    {(tool.executionTime || tool.rowCount !== undefined) && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          Execution Stats:
                        </span>
                        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                          {tool.executionTime && (
                            <div>Execution Time: {tool.executionTime}ms</div>
                          )}
                          {tool.rowCount !== undefined && (
                            <div>Rows Returned: {tool.rowCount}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Raw Data */}
                    {tool.data && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          Raw Data:
                        </span>
                        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {JSON.stringify(tool.data, null, 2)}
                        </div>
                      </div>
                    )}

                    {/* Response */}
                    {tool.response && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-600">
                          Response:
                        </span>
                        <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono whitespace-pre-wrap">
                          {tool.response}
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {tool.error && (
                      <div>
                        <span className="text-xs font-medium text-red-600">
                          Error:
                        </span>
                        <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-xs font-mono whitespace-pre-wrap text-red-700">
                          {tool.error}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
