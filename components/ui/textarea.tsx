import * as React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  syntaxHighlight?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, syntaxHighlight = false, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const overlayRef = React.useRef<HTMLDivElement>(null);
    const [highlightedContent, setHighlightedContent] = React.useState('');

    // Simple markdown syntax highlighting
    const highlightMarkdown = (text: string) => {
      if (!syntaxHighlight) return text;

      let highlighted = text;

      // Headers
      highlighted = highlighted.replace(
        /^(#{1,6})\s(.+)$/gm,
        '<span class="text-blue-600 font-semibold">$1</span> <span class="text-blue-800 font-semibold">$2</span>'
      );

      // Bold text
      highlighted = highlighted.replace(
        /\*\*(.+?)\*\*/g,
        '<span class="text-gray-900 font-bold">**$1**</span>'
      );

      // Italic text
      highlighted = highlighted.replace(
        /\*(.+?)\*/g,
        '<span class="text-gray-700 italic">*$1*</span>'
      );

      // Code blocks
      highlighted = highlighted.replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        '<span class="text-green-600">```$1</span>\n<span class="text-green-700 bg-green-50">$2</span><span class="text-green-600">```</span>'
      );

      // Inline code
      highlighted = highlighted.replace(
        /`([^`]+)`/g,
        '<span class="text-green-600 bg-green-50 px-1 rounded">`$1`</span>'
      );

      // Lists
      highlighted = highlighted.replace(
        /^(\s*[-*+])\s(.+)$/gm,
        '<span class="text-gray-600">$1</span> <span class="text-gray-900">$2</span>'
      );

      // Numbered lists
      highlighted = highlighted.replace(
        /^(\s*\d+\.)\s(.+)$/gm,
        '<span class="text-gray-600">$1</span> <span class="text-gray-900">$2</span>'
      );

      return highlighted;
    };

    React.useEffect(() => {
      if (syntaxHighlight && props.value) {
        setHighlightedContent(highlightMarkdown(String(props.value)));
      }
    }, [props.value, syntaxHighlight]);

    // Sync scroll position between textarea and overlay
    const handleScroll = React.useCallback(() => {
      if (textareaRef.current && overlayRef.current) {
        overlayRef.current.scrollTop = textareaRef.current.scrollTop;
        overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    }, []);

    return (
      <div className="relative">
        {syntaxHighlight && highlightedContent && (
          <div
            ref={overlayRef}
            className={cn(
              'absolute inset-0 whitespace-pre-wrap break-words pointer-events-none p-3 text-sm leading-6 font-mono overflow-auto',
              'border border-gray-300 rounded-md bg-transparent'
            )}
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
            }}
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        )}
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-auto',
            syntaxHighlight &&
              'font-mono leading-6 relative z-10 bg-transparent',
            className
          )}
          style={
            syntaxHighlight
              ? {
                  fontFamily:
                    'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  color: 'transparent',
                  caretColor: 'black'
                }
              : undefined
          }
          onScroll={syntaxHighlight ? handleScroll : undefined}
          ref={ref || textareaRef}
          {...props}
        />
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
