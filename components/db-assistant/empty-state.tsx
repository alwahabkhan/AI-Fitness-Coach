import React from 'react';
import { Database, BarChart3, User as UserIcon } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Database className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Database Assistant
        </h3>
        <p className="text-gray-600 mb-6 max-w-md">
          Select a conversation or start a new one to query your database and
          get insights about trainee progress, workout completion rates, and
          more.
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Query workout completion rates</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <UserIcon className="h-4 w-4" />
            <span>Analyze trainee performance</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Database className="h-4 w-4" />
            <span>Generate custom reports</span>
          </div>
        </div>
      </div>
    </div>
  );
}
