'use client';
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useRef
} from 'react';
import {
  createRealtimeWorkoutCoachAgent,
  summarizeWorkoutData,
  WorkoutAgentContext
} from '@/lib/ai/workout-coach-agent';
import { WorkoutMachineContext } from '@/state-machine/workout';
import { RealtimeMessageItem, RealtimeSession } from '@openai/agents/realtime';
import { useAgentStateBridge } from './use-agent-state-bridge';

type MessageType = 'system' | 'user' | 'assistant' | 'error';

interface Message {
  type: MessageType;
  content: string;
  timestamp: number;
  id: number;
}

type AddMessage = (
  type: MessageType,
  content: string,
  timestamp?: number
) => void;

type ConnectionType = 'disconnected' | 'connected' | 'connecting' | 'error';

type RealTimeMessage = {
  type: 'message';
  role: 'user';
  content: {
    type: 'input_text';
    text: string;
  }[];
};

interface RealtimeChatContextValue {
  connectionState: ConnectionType;
  messages: Message[];
  isRecording: boolean;
  isMuted: boolean;
  currentTranscript: string;
  messageInput: string;
  initializeConnection: () => Promise<void>;
  stopConnection: () => void;
  toggleRecording: () => void;
  sendEvent: (event: RealTimeMessage) => void;
  toggleMute: () => void;
  setMessageInput: React.Dispatch<React.SetStateAction<string>>;
  addMessage: AddMessage;
  updateHistory: (event: RealtimeMessageItem) => void;
}

const RealtimeChatContext = createContext<RealtimeChatContextValue | undefined>(
  undefined
);

interface RealtimeChatProviderProps {
  ephemeralKey: {
    client_secret: {
      value: string;
    };
  };
  userId: string;
  agentContext: string;
  children: ReactNode;
}

export const RealtimeChatProvider = ({
  ephemeralKey,
  userId,
  agentContext,
  children
}: RealtimeChatProviderProps) => {
  // Get workout state and data from the state machine
  const workoutState = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutState
  );
  const workoutData = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutData
  );
  const messageThreadId = WorkoutMachineContext.useSelector(
    (state) => state.context.messageThreadId
  );
  const sessionId = WorkoutMachineContext.useSelector(
    (state) => state.context.sessionId
  );
  const programId = WorkoutMachineContext.useSelector(
    (state) => state.context.programId
  );
  const workoutId = WorkoutMachineContext.useSelector(
    (state) => state.context.workoutId
  );
  const workoutActor = WorkoutMachineContext.useActorRef();
  const [connectionState, setConnectionState] =
    useState<ConnectionType>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [messageInput, setMessageInput] = useState('');

  const sessionRef = useRef<RealtimeSession<WorkoutAgentContext> | null>(null);
  const ephemeralKeyRef = useRef(ephemeralKey);
  const isInitializingRef = useRef(false);
  
  // Ref to track processed message IDs for deduplication
  const processedItemIdsRef = useRef<Set<string>>(new Set());

  const { handleWorkoutPanelAction } = useAgentStateBridge(workoutActor.send);

  // Update the ref when ephemeralKey changes
  ephemeralKeyRef.current = ephemeralKey;

  const addMessage: AddMessage = useCallback(
    (type, content, timestamp = Date.now()) => {
      console.log(type + '   ' + content);
      if (content) {
        setMessages((prev) => [
          ...prev,
          { type, content, timestamp, id: Math.random() }
        ]);

        // Validate content before sending
        const trimmedContent = String(content).trim();
        if (trimmedContent.length === 0) {
          console.warn('Skipping empty message');
          return;
        }

        if (messageThreadId) {
          fetch('/api/workout-coach/message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              threadId: messageThreadId,
              content: trimmedContent,
              type
            })
          })
            .then(async (response) => {
              if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                console.error('Failed to save message:', error);
              }
            })
            .catch((error) => {
              console.error('Error saving message:', error);
            });
        }
      }
    },
    [messageThreadId]
  );

  const sendEvent = useCallback((event: RealTimeMessage) => {
    if (!sessionRef.current) {
      console.warn('Cannot send event: session is not available');
      return;
    }
    try {
      sessionRef.current.sendMessage({
        role: event.role,
        type: 'message',
        content: event.content
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Don't show error to user for send failures, just log
    }
  }, []);

  const initializeConnection = useCallback(async () => {
    try {
      // Prevent multiple connections
      if (isInitializingRef.current || sessionRef.current) {
        console.log('⚠️ Connection already exists or in progress, skipping...');
        return;
      }

      // Clear deduplication set on new connection
      processedItemIdsRef.current.clear();

      console.log('🔄 Starting new connection...');
      isInitializingRef.current = true;
      setConnectionState('connecting');
      addMessage('system', 'Connecting to your session...');

      const EPHEMERAL_KEY = ephemeralKeyRef.current.client_secret.value;

      let globalPrompt = undefined;
      let userPersonalizedPrompt = undefined;
      let userContextPrompt = undefined;
      let workoutContext = undefined;
      let exerciseContexts = undefined;
      
      try {
        // Build query string with programId or workoutId if available
        const queryParams = new URLSearchParams();
        if (programId) {
          queryParams.append('programId', programId);
        } else if (workoutId) {
          queryParams.append('workoutId', workoutId);
        }
        
        const url = queryParams.toString()
          ? `/api/workout-coach/prompt?${queryParams.toString()}`
          : '/api/workout-coach/prompt';
        
        const response = await fetch(url);
        const data = await response.json();
        globalPrompt = data.globalPrompt;
        userPersonalizedPrompt = data.userPrompt;
        userContextPrompt = data.userContextPrompt;
        workoutContext = data.workoutContext;
        exerciseContexts = data.exerciseContexts;
        console.log('Global Prompt', globalPrompt);
        console.log('User Personalized Prompt', userPersonalizedPrompt);
        console.log('User Context Prompt', userContextPrompt);
        console.log('Workout Context', workoutContext);
        console.log('Exercise Contexts', exerciseContexts);
      } catch (error) {
        console.error('Error fetching workout coach prompts:', error);
      }

      // Fetch session start time if sessionId exists
      let sessionStartTime: string | undefined;
      if (sessionId) {
        try {
          const sessionResponse = await fetch(`/api/training-session/${sessionId}`);
          if (sessionResponse.ok) {
            const session = await sessionResponse.json();
            if (session.start_time) {
              sessionStartTime = session.start_time;
            }
          }
        } catch (error) {
          console.error('Failed to fetch session start time for agent:', error);
        }
      }

      // Build the agent context by combining workout/program context and exercise contexts
      let fullAgentContext = agentContext;
      if (workoutContext) {
        fullAgentContext = workoutContext;
      }
      if (exerciseContexts) {
        fullAgentContext = fullAgentContext
          ? `${fullAgentContext}\n\n${exerciseContexts}`
          : exerciseContexts;
      }

      // Build the agent context
      const workoutAgentContext: WorkoutAgentContext = {
        userId,
        prompt: {
          userPersonalizedPrompt,
          user_info: userContextPrompt
        },
        workoutState,
        workoutData,
        agentContext: fullAgentContext,
        workoutPanelAction: handleWorkoutPanelAction,
        sessionStartTime
      };
      // Create the agent
      const agent = createRealtimeWorkoutCoachAgent(globalPrompt);
      // Create the session
      sessionRef.current = new RealtimeSession(agent, {
        model: 'gpt-realtime-mini',
        context: workoutAgentContext
      });

      // Add error handler before connecting to catch connection errors early
      sessionRef.current.on('error', (error: any) => {
        console.error('Session error:', error);
        // Check if connection is closed
        if (error?.error?.error?.message?.includes('closed') || 
            error?.error?.error?.message?.includes('signalingState')) {
          console.log('Connection was closed, cleaning up...');
          if (sessionRef.current) {
            try {
              sessionRef.current.close();
            } catch (e) {
              // Ignore errors during cleanup
            }
            sessionRef.current = null;
          }
          isInitializingRef.current = false;
          setConnectionState('error');
          addMessage('error', 'Connection was interrupted. Please try again.');
          return;
        }
        
        if (
          error.error?.error?.message ===
          'Conversation already has an active response'
        ) {
          console.log('Conversation already has active response');
        } else {
          addMessage('error', 'There was an error with the connection.');
        }
      });

      try {
        await sessionRef.current.connect({ apiKey: EPHEMERAL_KEY });
      } catch (connectError: any) {
        // Handle connection errors specifically
        console.error('Connection failed:', connectError);
        if (sessionRef.current) {
          try {
            sessionRef.current.close();
          } catch (e) {
            // Ignore cleanup errors
          }
          sessionRef.current = null;
        }
        isInitializingRef.current = false;
        setConnectionState('error');
        addMessage('error', 'Failed to establish connection. Please try again.');
        return;
      }

      // Check if session is still valid after connection
      if (!sessionRef.current) {
        console.log('Session was closed during connection, aborting setup');
        isInitializingRef.current = false;
        setConnectionState('error');
        return;
      }

      // Set the current workout data and the user context info
      try {
        sessionRef.current.updateHistory((history) => {
          return [
            ...history,
            {
              type: 'message',
              itemId: '1',
              role: 'system',
              content: [
                {
                  text: `Current workout data: ${summarizeWorkoutData(workoutData)}`,
                  type: 'input_text'
                }
              ]
            },
            {
              type: 'message',
              itemId: '2',
              role: 'system',
              content: [
                {
                  text: userContextPrompt
                    ? `**User Information/Context:**\n${userContextPrompt}`
                    : '',
                  type: 'input_text'
                }
              ]
            }
          ];
        });
        
        if (sessionRef.current) {
          sessionRef.current.sendMessage({
            role: 'user',
            type: 'message',
            content: [{ text: 'Initiate greeting!', type: 'input_text' }]
          });
        }
      } catch (error) {
        console.error('Error setting up session history:', error);
        // Continue even if history setup fails
      }

      if (!sessionRef.current) {
        return;
      }

      sessionRef.current.on('history_updated', (e) => {
        console.log('Update Histroy', e);
      });

      sessionRef.current.on('audio_start', () => {
        if (sessionRef.current) {
          addMessage('system', 'Audio stream is now active.');
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionRef.current.on('transport_event', (e: any) => {
        // Check if session still exists before processing events
        if (!sessionRef.current) {
          return;
        }

        const inputTokens = e?.response?.usage?.input_tokens;
        const outputTokens = e?.response?.usage?.output_tokens;
        if (
          typeof inputTokens === 'number' ||
          typeof outputTokens === 'number'
        ) {
          workoutActor.send({
            type: 'event.add_tokens',
            inputTokens,
            outputTokens
          });
        }

        // Message Handling with Deduplication
        if (e.type === 'conversation.item.retrieved') {
          const itemId = e?.item?.id;
          const content = e?.item?.content?.[0]?.transcript;
          
          if (itemId && content && !processedItemIdsRef.current.has(itemId)) {
            processedItemIdsRef.current.add(itemId);
            addMessage('user', content);
          }
        } else if (e.type === 'conversation.item.input_audio_transcription.completed') {
          const itemId = e.item_id;
          const content = e.transcript;
          
          if (itemId && content && !processedItemIdsRef.current.has(itemId)) {
            processedItemIdsRef.current.add(itemId);
            addMessage('user', content);
          }
        } else if (e.type === 'response.done') {
          if (e?.item?.type !== 'function_call') {
            addMessage(
              'assistant',
              e.response?.output?.[0]?.content?.[0]?.transcript
            );
          }
        } else if (e.type === 'session.created') {
          setConnectionState('connected');
          addMessage('system', 'Connection established successfully!');
          isInitializingRef.current = false;
        }
      });

      setIsRecording(true);
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionState('error');
      isInitializingRef.current = false;
      addMessage(
        'error',
        'We are unable to connect at the moment. Please try again.'
      );
    }
  }, [
    addMessage,
    userId,
    agentContext,
    workoutState,
    workoutData,
    handleWorkoutPanelAction,
    workoutActor,
    sessionId,
    programId,
    workoutId
  ]);

  const stopConnection = useCallback(() => {
    if (!sessionRef.current) {
      return;
    }
    try {
      sessionRef.current.close();
    } catch (error) {
      console.error('Error closing session:', error);
    } finally {
      sessionRef.current = null;
      isInitializingRef.current = false;
      setConnectionState('disconnected');
      setIsRecording(false);
      setCurrentTranscript('');
      addMessage('system', 'Session has been stopped.');
    }
  }, [addMessage]);

  const toggleRecording = useCallback(() => {
    if (!sessionRef.current) {
      console.warn('Cannot toggle recording: session is not available');
      return;
    }
    try {
      sessionRef.current.interrupt();
      setIsRecording(!isRecording);
      addMessage(
        'system',
        !isRecording
          ? "Recording resumed. Let's continue!"
          : 'Recording paused. Take a moment!'
      );
    } catch (error) {
      console.error('Error toggling recording:', error);
      addMessage('error', 'Failed to toggle recording. Please try again.');
    }
  }, [isRecording, addMessage]);

  const toggleMute = useCallback(() => {
    if (!sessionRef.current) {
      console.warn('Cannot toggle mute: session is not available');
      return;
    }
    try {
      sessionRef.current.mute(!isMuted);
      setIsMuted(!isMuted);
      addMessage(
        'system',
        !isMuted
          ? 'Audio muted. Focus on your workout!'
          : 'Audio unmuted. Ready to listen!'
      );
    } catch (error) {
      console.error('Error toggling mute:', error);
      addMessage('error', 'Failed to toggle mute. Please try again.');
    }
  }, [isMuted, addMessage]);

  const updateHistory = useCallback((event: RealtimeMessageItem) => {
    if (!sessionRef.current) {
      console.warn('Cannot update history: session is not available');
      return;
    }
    try {
      sessionRef.current.updateHistory((history) => {
        const newHistory = [...history, event];
        return newHistory;
      });
    } catch (error) {
      console.error('Error updating history:', error);
    }
  }, []);

  const contextValue: RealtimeChatContextValue = {
    connectionState,
    messages,
    isRecording,
    isMuted,
    currentTranscript,
    messageInput,
    initializeConnection,
    stopConnection,
    toggleRecording,
    sendEvent,
    toggleMute,
    setMessageInput,
    addMessage,
    updateHistory
  };

  return (
    <RealtimeChatContext.Provider value={contextValue}>
      {children}
    </RealtimeChatContext.Provider>
  );
};

export function useRealtimeChat(): RealtimeChatContextValue {
  const context = useContext(RealtimeChatContext);
  if (context === undefined) {
    throw new Error(
      'useRealtimeChat must be used within a RealtimeChatProvider'
    );
  }
  return context;
}