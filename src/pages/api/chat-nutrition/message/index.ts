import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';

import {
  NutritionAgentContext,
  runNutriAgent,
  HistoryInput
} from '@/lib/ai/nutrition-agent';
import { nutritionCoachService } from '@/lib/chat-nutrition';
import { getSessionFromRequest } from '@/lib/session';
import type {
  MessageDebugInfo,
  ThreadDebugInfo
} from '@/database/derived.types';

const bodySchema = z.object({
  threadId: z.string().min(1, 'Thread ID is required'),
  content: z.string().min(1, 'Message content is required'),
  userId: z.string().min(1, 'User ID is required'),
  userInfo: z.string().optional()
});

async function handler(body: z.infer<typeof bodySchema>) {
  const { threadId, content, userInfo, userId } = body;

  const startTime = Date.now();

  const [thread, messages] = await Promise.all([
    nutritionCoachService.getThreadById(userId, threadId),
    nutritionCoachService.getThreadHistory(threadId)
  ]);

  if (!thread) {
    throw new Error('Thread not found');
  }

  const history: HistoryInput = messages.map((message) => {
    if (message.role === 'assistant') {
      return {
        role: message.role,
        status: 'completed',
        content: [
          {
            type: 'output_text',
            text: message.content
          }
        ]
      };
    }
    return {
      role: 'user',
      content: message.content
    };
  });

  const system_prompt = await nutritionCoachService.getUserPrompt();

  const agentContext: NutritionAgentContext = {
    userId,
    prompt: {
      custom: system_prompt,
      user_info: userInfo
    }
  };

  const userMessage = await nutritionCoachService.saveUserMessage(
    threadId,
    content.trim(),
    userId
  );

  history.push({
    role: 'user',
    content: content.trim()
  });

  const response = await runNutriAgent(history, agentContext);

  const processingTime = Date.now() - startTime;

  const threadDebugInfo: ThreadDebugInfo = {
    systemPrompt: system_prompt,
    customPrompt: system_prompt,
    userInfo: userInfo,
    userId: userId
  };

  const threadMeta = thread.meta as { debug?: ThreadDebugInfo } | null;
  if (!threadMeta?.debug) {
    await nutritionCoachService.saveThreadDebugInfo(threadId, threadDebugInfo);
  }

  const messageDebugInfo: MessageDebugInfo = {
    processingTime,
    toolUsage: agentContext.toolUsage?.map((tool) => ({
      ...tool,
      timestamp: tool.timestamp
    }))
  };

  const aiMessage = await nutritionCoachService.saveAssistantMessage(
    threadId,
    response.finalOutput || 'Empty response from AI',
    agentContext.citations,
    messageDebugInfo
  );

  let title = null;
  if (!thread.title) {
    title = content.trim();
    await nutritionCoachService.updateThread(threadId, {
      title: title
    });
  }

  return {
    userMessage,
    aiMessage,
    threadTitle: title
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

    if (user.role !== 'trainee') {
      return res.status(403).json({ error: 'Forbidden - Trainees only' });
    }

    const { success, data, error } = bodySchema.safeParse({
      ...req.body,
      userId: user.id,
      userInfo: user.agent_context
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
      if (error instanceof Error && error.message === 'Thread not found') {
        return res.status(404).json({ error: 'Thread not found' });
      }
      console.error('Error in send message API:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default createMessageHandler();
