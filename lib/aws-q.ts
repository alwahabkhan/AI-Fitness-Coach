import {
  QBusinessClient,
  ChatSyncCommand,
  ChatSyncCommandInput
} from '@aws-sdk/client-qbusiness';
import { getAwsConfig } from './env';

const awsConfig = getAwsConfig();

const client = new QBusinessClient({
  region: awsConfig.region,
  credentials: {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey
  }
});

export class AmazonQService {
  private config: AmazonQConfig;

  constructor(config: AmazonQConfig) {
    this.config = config;
  }

  async sendMessage(message: AmazonQMessage): Promise<AmazonQResponse> {
    try {
      const input: ChatSyncCommandInput = {
        applicationId: this.config.applicationId,
        userId: this.config.userId,
        userMessage: message.userMessage,
        chatMode: this.config.chatMode || 'RETRIEVAL_MODE'
      };

      // Add optional fields if provided
      if (this.config.userGroups && this.config.userGroups.length > 0) {
        input.userGroups = this.config.userGroups;
      }

      if (message.conversationId) {
        input.conversationId = message.conversationId;
      }

      if (message.parentMessageId) {
        input.parentMessageId = message.parentMessageId;
      }

      // Right now is not working because the Amazon Q Business API is built with anonymous authentication/ no auth
      input.userId = null!;
      input.userGroups = null!;

      const command = new ChatSyncCommand(input);
      const response = await client.send(command);

      return {
        conversationId: response.conversationId!,
        systemMessage: response.systemMessage,
        systemMessageId: response.systemMessageId,
        userMessageId: response.userMessageId!,
        sourceAttributions: response.sourceAttributions?.map((s) => ({
          citationNumber: s.citationNumber,
          snippet: s.snippet,
          title: s.title,
          url: s.url
        }))
      };
    } catch (error) {
      console.error('Error sending message to Amazon Q:', error);
      throw new Error(
        `Failed to send message to Amazon Q: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async startConversation(userMessage: string): Promise<AmazonQResponse> {
    return this.sendMessage({ userMessage });
  }

  async continueConversation(
    conversationId: string,
    userMessage: string,
    parentMessageId?: string
  ): Promise<AmazonQResponse> {
    return this.sendMessage({
      userMessage,
      conversationId,
      parentMessageId
    });
  }
}

const createAmazonQService = (config: AmazonQConfig): AmazonQService => {
  return new AmazonQService(config);
};

export const createNutritionCoachAmazonQ = (userId: string): AmazonQService => {
  return createAmazonQService({
    applicationId: awsConfig.amazonQApplicationId,
    userId,
    userGroups: ['nutrition_coach'],
    chatMode: 'RETRIEVAL_MODE'
  });
};

export interface AmazonQConfig {
  applicationId: string;
  userId: string;
  userGroups?: string[];
  chatMode?: 'RETRIEVAL_MODE' | 'CREATOR_MODE' | 'PLUGIN_MODE';
}

export interface AmazonQMessage {
  userMessage: string;
  conversationId?: string;
  parentMessageId?: string;
}

export interface AmazonQMessageStream {
  inputStream: string;
  conversationId?: string;
  parentMessageId?: string;
}

export interface AmazonQResponse {
  conversationId: string;
  systemMessage?: string;
  systemMessageId?: string;
  userMessageId: string;
  sourceAttributions?: Array<{
    title?: string;
    snippet?: string;
    url?: string;
    citationNumber?: number;
  }>;
  failedAttachments?: Array<{
    name: string;
    status: 'FAILED' | 'SUCCESS';
    error?: {
      errorMessage: string;
      errorCode: string;
    };
  }>;
}
