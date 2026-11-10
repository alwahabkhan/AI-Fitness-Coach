import React from 'react';
import { ChevronDown, ChevronUp, Bug, Clock, Cpu, Wrench } from 'lucide-react';
import type { MessageDebugInfo } from '@/database/derived.types';
import { formatTime } from '@/lib/utils';

interface DebugWidgetProps {
  debugInfo: MessageDebugInfo;
  toggleDebug: () => void;
  isExpanded: boolean;
}

export function DebugWidget({
  debugInfo,
  toggleDebug,
  isExpanded
}: DebugWidgetProps) {
  const hasDebugInfo =
    debugInfo &&
    (debugInfo.processingTime ||
      debugInfo.tokensUsed ||
      debugInfo.modelUsed ||
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
          {(debugInfo.processingTime ||
            debugInfo.tokensUsed ||
            debugInfo.modelUsed) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                Processing Stats
              </h4>
              <div className="space-y-1 text-xs text-gray-600">
                {debugInfo.processingTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>Processing Time: {debugInfo.processingTime}ms</span>
                  </div>
                )}
                {debugInfo.tokensUsed && (
                  <div className="flex items-center gap-2">
                    <span>Tokens Used: {debugInfo.tokensUsed}</span>
                  </div>
                )}
                {debugInfo.modelUsed && (
                  <div className="flex items-center gap-2">
                    <span>Model: {debugInfo.modelUsed}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tool Usage */}
          {debugInfo.toolUsage && debugInfo.toolUsage.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                Tool Usage ({debugInfo.toolUsage.length})
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

                    {tool.parameters &&
                      Object.keys(tool.parameters).length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-gray-600">
                            Parameters:
                          </span>
                          <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(tool.parameters, null, 2)}
                          </div>
                        </div>
                      )}

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
