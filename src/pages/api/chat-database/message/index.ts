import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionFromRequest } from '@/lib/session';
import { databaseAssistantService } from '@/lib/chat-database';
import {
  runDatabaseAgent,
  DatabaseAgentContext
} from '@/lib/ai/db-assistant-agent';

const bodySchema = z.object({
  message: z.string().min(1, 'Message content is required'),
  threadId: z.string().optional(),
  userId: z.string().min(1, 'User ID is required')
});

async function handler(body: z.infer<typeof bodySchema>) {
  const { message, threadId } = body;
  const startTime = Date.now();

  let threadIdToUse = threadId;
  if (!threadIdToUse) {
    const newThread = await databaseAssistantService.createNewThread(
      body.userId
    );
    threadIdToUse = newThread.id;
  }

  await databaseAssistantService.saveUserMessage(
    threadIdToUse,
    message,
    body.userId
  );

  const history =
    await databaseAssistantService.getThreadHistory(threadIdToUse);

  const agentHistory = history.map((message) => {
    if (message.role === 'assistant') {
      return {
        role: message.role,
        status: 'completed' as const,
        content: [
          {
            type: 'output_text' as const,
            text: message.content
          }
        ]
      };
    }
    return {
      role: 'user' as const,
      content: message.content
    };
  });

  agentHistory.push({
    role: 'user',
    content: message
  });

  const agentContext: DatabaseAgentContext = {
    userId: body.userId
  };

  const agentResponse = await runDatabaseAgent(agentHistory, agentContext);

  const processingTime = Date.now() - startTime;

  const assistantResponse =
    agentResponse.finalOutput ||
    'I apologize, but I encountered an error processing your request.';

  const debugInfo = {
    processingTime,
    toolUsage: agentContext.toolUsage?.map((tool) => ({
      ...tool,
      timestamp: tool.timestamp
    }))
  };

  await databaseAssistantService.saveAssistantMessage(
    threadIdToUse,
    assistantResponse,
    debugInfo
  );

  await databaseAssistantService.updateThread(threadIdToUse, {
    updated_at: new Date().toISOString()
  });

  return {
    message: assistantResponse,
    threadId: threadIdToUse,
    debugInfo
  };
}

function createMessageHandler() {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const session = getSessionFromRequest(req);
    if (!session?.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = session.user;

    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied. Only admins can use the database assistant.'
      });
    }

    const { success, data, error } = bodySchema.safeParse({
      ...req.body,
      userId: user.id
    });

    if (!success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: error.flatten().fieldErrors
      });
    }

    try {
      const result = await handler(data);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Database assistant error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

export default createMessageHandler();
