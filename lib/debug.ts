import { MessageDebugInfo } from '@/database/derived.types';
import type { DBDebugInfo } from '@/components/db-assistant/debug-widget';

export function isDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NUTRITION_DEBUG_ENABLED === 'true';
}

export function isDBDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DB_DEBUG_ENABLED === 'true';
}

export function hasDebugInfo(debugInfo: MessageDebugInfo | undefined): boolean {
  return !!(
    debugInfo &&
    (debugInfo.processingTime ||
      debugInfo.tokensUsed ||
      debugInfo.modelUsed ||
      (debugInfo.toolUsage && debugInfo.toolUsage.length > 0))
  );
}

export function hasDBDebugInfo(debugInfo: DBDebugInfo | undefined): boolean {
  return !!(
    debugInfo &&
    (debugInfo.processingTime ||
      (debugInfo.toolUsage && debugInfo.toolUsage.length > 0))
  );
}
