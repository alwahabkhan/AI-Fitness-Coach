import { z } from 'zod';
import { Agent, AgentInputItem, run, tool } from '@openai/agents';
import { getOpenAIConfig, isDevelopment } from '../env';
import { createNutritionCoachAmazonQ } from '../aws-q';
import type { CitationsMeta, ToolUsage } from '@/database/derived.types';

export type NutritionAgentContext = {
  userId: string;
  prompt: {
    custom?: string;
    user_info?: string;
  };
  citations?: CitationsMeta;
  toolUsage?: ToolUsage[];
};

export type HistoryInput = AgentInputItem[];

const system_prompt = (prompt?: string, user_info?: string) => {
  const default_prompt =
    prompt ??
    'You are a nutrition coach. You are responsible for helping users with their nutrition goals.';

  const tools_description = `
  You have the following tools at your disposal:
  - knowledgebase_search: 
  - Search the nutrition knowledge base using Amazon Q for Business RAG capabilities
  - Input: summary: string
  - Output: string
  `;

  const context_instructions = user_info
    ? `Context about the user: ${user_info}`
    : `IMPORTANT: No user context is currently available. When providing nutrition advice that requires personal information, you should ask the user to provide this information first. 

    Here are specific questions to ask based on the type of advice needed:
    
    For general nutrition advice:
    - "To give you personalized nutrition advice, I'd like to know about your fitness goals. Are you looking to lose weight, build muscle, improve endurance, or maintain your current physique?"
    - "What's your current activity level? Do you exercise regularly, and if so, what type of workouts do you do?"
    - "Do you have any dietary restrictions, food allergies, or preferences I should be aware of?"
    - "What's your typical daily schedule and meal timing preferences?"
    - "Are you currently tracking your food intake or following any specific diet plan?"
    
    For meal planning:
    - "What's your daily calorie target or macronutrient goals?"
    - "How many meals do you prefer to eat per day?"
    - "Do you have any time constraints for meal preparation?"
    - "What cooking equipment and kitchen setup do you have available?"
    
    For supplement advice:
    - "What's your current supplement routine, if any?"
    - "Do you have any medical conditions or take medications that might interact with supplements?"
    - "What's your budget for supplements?"
    
    For weight management:
    - "What's your current weight and height?"
    - "What's your target weight or body composition goal?"
    - "How much weight do you want to lose/gain and over what timeframe?"
    - "Have you tried any weight management approaches before?"
    
    Only provide general nutrition information until you have enough context to give personalized recommendations. Always explain why you need this information to provide better advice.`;

  return `
  ${default_prompt}
  ${tools_description}
  ${context_instructions}
  `;
};

const parameters = z.object({
  summary: z
    .string()
    .describe(
      'A summary of the user’s query and relevant conversation context, including fitness goals, dietary preferences, or lifestyle details, to ensure tailored nutrition advice.'
    )
});
type ToolParameters = typeof parameters;

const knowledgebase_search = tool<
  ToolParameters,
  NonNullable<NutritionAgentContext>
>({
  name: 'knowledgebase_search',
  description: `Search CorpFit's nutrition knowledge base using Amazon Q Business RAG capabilities.
     Retrieves evidence-based dietary advice from S3-synced studies to provide personalized nutrition recommendations for clients pursuing their dream physique.
     Processes user queries and conversation context to deliver clear, motivational responses with practical meal ideas, nutrient breakdowns, and tips for healthy eating habits, tailored to goals like muscle gain or fat loss.`,
  parameters,
  async execute({ summary }, runContext) {
    const { context = {} as NutritionAgentContext } = runContext || {};
    const toolUsage: ToolUsage = {
      toolName: 'knowledgebase_search',
      parameters: { summary },
      timestamp: new Date().toISOString()
    };

    try {
      const amazonQService = createNutritionCoachAmazonQ(context.userId);

      const response = await amazonQService.startConversation(summary);

      const citations =
        response.sourceAttributions?.map((s) => ({
          citation: s.snippet || '',
          source: s.title || ''
        })) || [];

      context.citations = citations;

      toolUsage.response =
        response.systemMessage ||
        "I'm here to help you with nutrition advice. How can I assist you today?";

      if (!context.toolUsage) {
        context.toolUsage = [];
      }
      context.toolUsage.push(toolUsage);

      return {
        response: toolUsage.response,
        messageId: response.userMessageId
      };
    } catch (error) {
      console.error('Error getting Amazon Q response:', error);

      toolUsage.error =
        error instanceof Error ? error.message : 'Unknown error';

      if (!context.toolUsage) {
        context.toolUsage = [];
      }
      context.toolUsage.push(toolUsage);

      return {
        response:
          "I'm sorry, something went wrong with my response. Please try again in a moment.",
        messageId: 'Default Message ID'
      };
    }
  }
});

const openAIConfig = getOpenAIConfig();

const nutriAgent = new Agent<NutritionAgentContext>({
  name: 'Nutrition Coach',
  model: openAIConfig.model,
  instructions: ({ context }) => {
    return system_prompt(context.prompt.custom, context.prompt.user_info);
  },
  tools: [knowledgebase_search]
});

if (isDevelopment()) {
  nutriAgent.on('agent_start', ({ context }, agent) => {
    console.log(
      `Agent: ${agent.name} is invoked with context: ${JSON.stringify(context)}}`
    );
  });

  nutriAgent.on('agent_tool_start', ({ context }, tool) => {
    console.log(
      `Tool: ${tool.name} is invoked with context: ${JSON.stringify(context)}}`
    );
  });
}
export const runNutriAgent = async (
  history: AgentInputItem[],
  agentContext: NutritionAgentContext
) => {
  const response = await run(nutriAgent, history, {
    context: agentContext
  });
  return response;
};
