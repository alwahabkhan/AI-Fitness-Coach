import { z } from 'zod';
import { Agent, AgentInputItem, run, tool } from '@openai/agents';
import { getOpenAIConfig, isDevelopment } from '../env';
import { executeSQLQuery, formatQueryResults } from '../sql-executor';
import { SCHEMA_SUMMARY } from './database-schema';

export type DatabaseAgentContext = {
  userId: string;
  prompt?: {
    custom?: string;
  };
  toolUsage?: Array<{
    toolName: string;
    parameters: Record<string, unknown>;
    timestamp: string;
    response?: string;
    error?: string;
    query?: string;
    rowCount?: number;
    data?: unknown[];
    executionTime?: number;
  }>;
};

export type HistoryInput = AgentInputItem[];

const system_prompt = (prompt?: string) => {
  const default_prompt =
    prompt ??
    `You are a Database Assistant for the AI Fitness Coach application. You help users query the database to get insights about fitness training, user activity, workout completion rates, and performance analytics.

      Your primary responsibilities:
      1. Generate accurate SQL SELECT queries based on user questions
      2. Execute queries safely (only SELECT statements allowed)
      3. Format and present results in a user-friendly way
      4. Provide insights and analysis based on the data
      5. Handle errors gracefully and suggest alternatives

      Database Schema:
      ${SCHEMA_SUMMARY}

      Key Tables and Their Purpose:
      - user: Stores trainer and trainee information
      - workout: Workout plans created by users
      - exercise: Individual exercises within workouts
      - workout_session: Actual training sessions with performance data
      - message_thread: Chat conversation threads
      - message: Individual messages in conversations
      - prompt: AI agent prompts (global and user-specific)

      Common Query Patterns:
      1. User counts and demographics: Count users by role, active users
      2. Activity analysis: Recent sessions, completion rates, engagement
      3. Performance tracking: Exercise progress, weight increases, session duration
      4. Workout analytics: Most popular exercises, completion rates by workout
      5. Time-based analysis: Daily, weekly, monthly trends

      IMPORTANT RULES:
      - Only generate SELECT queries for security
      - Always validate queries before execution
      - Provide clear explanations of results
      - Format data in readable tables
      - Handle edge cases (no data, errors) gracefully
      - Suggest follow-up questions when appropriate

      Example queries you should be able to handle:

      1. "How many users are in the database?"
         Expected SQL: SELECT role, COUNT(*) as count FROM "user" GROUP BY role ORDER BY role;

      2. "Which users were active this week?"
         Expected SQL: SELECT u.name, u.role, COUNT(ws.id) as sessions_this_week, MAX(ws.start_time) as last_activity FROM "user" u LEFT JOIN workout w ON u.id = w.user_id LEFT JOIN workout_session ws ON w.id = ws.workout_id AND ws.start_time >= CURRENT_DATE - INTERVAL '7 days' WHERE u.role = 'trainee' GROUP BY u.id, u.name, u.role HAVING COUNT(ws.id) > 0 ORDER BY sessions_this_week DESC;

      3. "Show me workout completion rates by trainee"
         Expected SQL: SELECT u.name, COUNT(ws.id) as total_sessions, COUNT(CASE WHEN ws.end_time IS NOT NULL THEN 1 END) as completed_sessions, ROUND(COUNT(CASE WHEN ws.end_time IS NOT NULL THEN 1 END) * 100.0 / COUNT(ws.id), 2) as completion_rate FROM "user" u LEFT JOIN workout w ON u.id = w.user_id LEFT JOIN workout_session ws ON w.id = ws.workout_id WHERE u.role = 'trainee' GROUP BY u.id, u.name HAVING COUNT(ws.id) > 0 ORDER BY completion_rate DESC;

      4. "What are the most popular exercises?"
         Expected SQL: SELECT e.name as exercise_name, COUNT(*) as total_instances, COUNT(DISTINCT w.id) as workouts_using_exercise, COUNT(DISTINCT w.user_id) as unique_users FROM exercise e LEFT JOIN workout w ON e.workout_id = w.id GROUP BY e.id, e.name ORDER BY total_instances DESC;

      5. "How long do sessions typically last?"
         Expected SQL: SELECT COUNT(*) as total_sessions, ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60), 2) as avg_duration_minutes, ROUND(MIN(EXTRACT(EPOCH FROM (end_time - start_time))/60), 2) as min_duration_minutes, ROUND(MAX(EXTRACT(EPOCH FROM (end_time - start_time))/60), 2) as max_duration_minutes FROM workout_session WHERE end_time IS NOT NULL AND start_time IS NOT NULL;
      `;

  const tools_description = `
  You have the following tools at your disposal:
  - execute_sql_query: 
  - Execute a SQL SELECT query against the database
  - Input: sql_query: string (the SQL query to execute)
  - Output: Query results or error message
  `;

  return `
  ${default_prompt}
  ${tools_description}
  `;
};

const parameters = z.object({
  sql_query: z
    .string()
    .describe(
      'A valid SQL SELECT query to execute against the database. Must be a SELECT statement only for security reasons.'
    )
});
type ToolParameters = typeof parameters;

const execute_sql_query = tool<
  ToolParameters,
  NonNullable<DatabaseAgentContext>
>({
  name: 'execute_sql_query',
  description: `Execute a SQL SELECT query against the AI Fitness Coach database.
     This tool validates the query for security (only SELECT statements allowed) and returns formatted results.
     Use this to get data about users, workouts, exercises, sessions, and other database entities.
     The tool will return either formatted data or an error message if the query fails.`,
  parameters,
  async execute({ sql_query }, runContext) {
    const { context = {} as DatabaseAgentContext } = runContext || {};
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const result = await executeSQLQuery(sql_query);
      const executionTime = Date.now() - startTime;

      // Todo create tool usage object and update in different states to make it more readable
      if (!result.success) {
        const toolUsage = {
          toolName: 'execute_sql_query',
          parameters: { sql_query },
          timestamp,
          response: `❌ **Query Error:** ${result.error}`,
          error: result.error,
          query: sql_query,
          executionTime
        };

        // Add to context for debug tracking
        if (!context.toolUsage) {
          context.toolUsage = [];
        }
        context.toolUsage.push(toolUsage);

        return {
          response: `❌ **Query Error:** ${result.error}\n\nPlease check your query and try again. Only SELECT statements are allowed.`,
          query: sql_query
        };
      }

      if (!result.data || result.data.length === 0) {
        const toolUsage = {
          toolName: 'execute_sql_query',
          parameters: { sql_query },
          timestamp,
          response: `✅ **Query executed successfully**\n\nQuery: \`${sql_query}\`\n\n**Result:** No data found (0 rows returned)\n\nExecution time: ${result.executionTime}ms`,
          query: sql_query,
          rowCount: 0,
          executionTime
        };

        // Add to context for debug tracking
        if (!context.toolUsage) {
          context.toolUsage = [];
        }
        context.toolUsage.push(toolUsage);

        return {
          response: `✅ **Query executed successfully**\n\nQuery: \`${sql_query}\`\n\n**Result:** No data found (0 rows returned)\n\nExecution time: ${result.executionTime}ms`,
          query: sql_query,
          rowCount: 0
        };
      }

      const formattedResults = formatQueryResults(
        result.data,
        result.rowCount || 0
      );

      const toolUsage = {
        toolName: 'execute_sql_query',
        parameters: { sql_query },
        timestamp,
        response: `✅ **Query executed successfully**\n\nQuery: \`${sql_query}\`\n\n${formattedResults}\n\nExecution time: ${result.executionTime}ms`,
        query: sql_query,
        rowCount: result.rowCount,
        data: result.data,
        executionTime
      };

      // Add to context for debug tracking
      if (!context.toolUsage) {
        context.toolUsage = [];
      }
      context.toolUsage.push(toolUsage);

      return {
        response: `✅ **Query executed successfully**\n\nQuery: \`${sql_query}\`\n\n${formattedResults}\n\nExecution time: ${result.executionTime}ms`,
        query: sql_query,
        rowCount: result.rowCount,
        data: result.data
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Error executing SQL query:', error);

      const toolUsage = {
        toolName: 'execute_sql_query',
        parameters: { sql_query },
        timestamp,
        response: `❌ **Unexpected Error:** ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        query: sql_query,
        executionTime
      };

      // Add to context for debug tracking
      if (!context.toolUsage) {
        context.toolUsage = [];
      }
      context.toolUsage.push(toolUsage);

      return {
        response: `❌ **Unexpected Error:** ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\nPlease try again or rephrase your question.`,
        query: sql_query
      };
    }
  }
});

const openAIConfig = getOpenAIConfig();

const databaseAgent = new Agent<DatabaseAgentContext>({
  name: 'Database Assistant',
  model: openAIConfig.model,
  instructions: ({ context }) => {
    return system_prompt(context.prompt?.custom);
  },
  tools: [execute_sql_query]
});

if (isDevelopment()) {
  databaseAgent.on('agent_start', ({ context }, agent) => {
    console.log(
      `Agent: ${agent.name} is invoked with context: ${JSON.stringify(context)}}`
    );
  });

  databaseAgent.on('agent_tool_start', ({ context }, tool) => {
    console.log(
      `Tool: ${tool.name} is invoked with context: ${JSON.stringify(context)}}`
    );
  });
}

export const runDatabaseAgent = async (
  history: AgentInputItem[],
  agentContext: DatabaseAgentContext
) => {
  const response = await run(databaseAgent, history, {
    context: agentContext
  });
  return response;
};
