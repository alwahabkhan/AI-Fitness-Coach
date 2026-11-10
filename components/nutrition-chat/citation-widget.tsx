import { CitationsMeta } from '@/database/derived.types';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export function CitationWidget({
  citations,
  toggleCitation,
  isExpanded
}: {
  citations: CitationsMeta;
  messageId: string;
  toggleCitation: () => void;
  isExpanded: boolean;
}) {
  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <button
        onClick={() => toggleCitation()}
        className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-800 transition-colors"
      >
        <span className="font-medium">
          {isExpanded ? 'Hide' : 'Show'} Sources ({citations.length})
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {citations.map((citation, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Todo: Add a link to the source */}
                    <ExternalLink className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-700">
                      {citation.source}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {citation.citation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
