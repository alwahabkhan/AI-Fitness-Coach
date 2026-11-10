import sql from './postgres';

export interface SQLResult {
  success: boolean;
  data?: Record<string, unknown>[];
  error?: string;
  rowCount?: number;
  executionTime?: number;
}

export interface SQLValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateSQLQuery(sql: string): SQLValidationResult {
  const trimmedSQL = sql.trim();

  if (!trimmedSQL.match(/^SELECT\s+/i)) {
    return {
      isValid: false,
      error: 'Only SELECT queries are allowed for security reasons.'
    };
  }

  const dangerousKeywords = [
    'DROP',
    'DELETE',
    'UPDATE',
    'INSERT',
    'CREATE',
    'ALTER',
    'TRUNCATE',
    'EXEC',
    'EXECUTE',
    'EXECUTE IMMEDIATE',
    'PREPARE',
    'DEALLOCATE'
  ];

  for (const keyword of dangerousKeywords) {
    if (trimmedSQL.toUpperCase().includes(keyword)) {
      return {
        isValid: false,
        error: `Query contains forbidden keyword: ${keyword}. Only SELECT queries are allowed.`
      };
    }
  }

  return { isValid: true };
}

export async function executeSQLQuery(sqlQuery: string): Promise<SQLResult> {
  const startTime = Date.now();

  try {
    const validation = validateSQLQuery(sqlQuery);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const data = await sql.unsafe(sqlQuery);

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      data: data as Record<string, unknown>[],
      rowCount: Array.isArray(data) ? data.length : 0,
      executionTime
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTime
    };
  }
}

export function formatQueryResults(
  data: Record<string, unknown>[],
  rowCount: number
): string {
  if (!data || data.length === 0) {
    return `**Query Results**\n\nQuery returned ${rowCount} rows.\n\n*No data found.*`;
  }

  const columns = Object.keys(data[0]);

  // Create markdown table
  let formatted = '**Query Results**\n\n';

  // Table header
  formatted += '| ' + columns.join(' | ') + ' |\n';
  formatted += '| ' + columns.map(() => '---').join(' | ') + ' |\n';

  // Table rows
  data.forEach((row) => {
    formatted +=
      '| ' + columns.map((col) => String(row[col] || '')).join(' | ') + ' |\n';
  });

  formatted += `\n**Total rows:** ${rowCount}`;

  return formatted;
}
