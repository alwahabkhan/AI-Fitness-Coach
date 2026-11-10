/* eslint-disable @typescript-eslint/no-explicit-any */
import { WorkoutMachineContext } from '@/state-machine/workout';
import { type FunctionDefinition, type SessionConfig } from '@outspeed/client';
import { type ClientTool } from "@outspeed/client";
import { useConversation } from '@outspeed/react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  buildOutspeedAgentInstructions,
  outspeedAgentTools
} from '@/lib/ai/outspeed-agent';

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

export const getEphemeralKeyFromServer = async (config: SessionConfig) => {
  const host = process.env.NEXT_PUBLIC_HOST || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const tokenResponse = await fetch(
    `${protocol}://${host}/api/ephemeral-outspeed`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    }
  );

  const data = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error('Failed to get ephemeral key');
  }

  return data.client_secret.value;
};

export const OutspeedContext = createContext<OutspeedContextValue | undefined>(
  undefined
);

interface OutspeedContextValue {
  sessionCreated: boolean;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  toggleMute: () => void;
  addToContext: (text: string, role?: 'system' | 'user') => Promise<void>;
  connectionState: ConnectionType;
  isRecording: boolean;
  isMuted: boolean;
  messages: Message[];
  currentTranscript: string;
  messageInput: string;
  setMessageInput: React.Dispatch<React.SetStateAction<string>>;
  sendEvent: (event: RealTimeMessage) => void;
  sendChatMessage: (message: string, options?: { cancelOngoing?: boolean }) => void;
  addMessage: AddMessage;
  setWorkoutDataRef: (data: any) => void;
  setMessageThreadIdRef: (id: string | null) => void;
  setWorkoutMachineRef: (ref: any) => void;
}

export const OutspeedProvider = ({
  children
}: {
  children: React.ReactNode;
}) => {
  const [workoutDataRef, setWorkoutDataRef] = useState<any>(null);
  const [messageThreadIdRef, setMessageThreadIdRef] = useState<string | null>(null);
  
  const [sessionCreated, setSessionCreated] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ConnectionType>('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [messageInput, setMessageInput] = useState('');

  const isInitializingRef = useRef(false);
  const workoutMachineRefCallback = useRef<any>(null);

  // Client tool callbacks
  const startWorkout = useCallback(() => {
    workoutMachineRefCallback.current?.send({ type: 'event.start' });
  }, []);

  const pauseWorkout = useCallback(() => {
    workoutMachineRefCallback.current?.send({ type: 'event.pause' });
  }, []);

  const resumeWorkout = useCallback(() => {
    workoutMachineRefCallback.current?.send({ type: 'event.resume' });
  }, []);

  const nextSet = useCallback(() => {
    workoutMachineRefCallback.current?.send({ type: 'event.next_set' });
  }, []);

  const previousSet = useCallback(() => {
    workoutMachineRefCallback.current?.send({ type: 'event.previous_set' });
  }, []);

  const skipRest = useCallback(() => {
    workoutMachineRefCallback.current?.send({ type: 'event.skip_rest' });
  }, []);

  const goToExercise = useCallback(
    ({ exerciseId }: { exerciseId: string }) => {
      workoutMachineRefCallback.current?.send({ type: 'event.go_to_exercise', exerciseId });
    },
    []
  );

  const goToGroup = useCallback(
    ({ groupId }: { groupId: string }) => {
      workoutMachineRefCallback.current?.send({ type: 'event.go_to_group', groupId });
    },
    []
  );

  const adaptWorkout = useCallback(
    ({
      exercises
    }: {
      exercises: {
        id: string;
        reps?: number;
        weight?: number;
        sets?: number;
        restSeconds?: number;
      }[];
    }) => {
      workoutMachineRefCallback.current?.send({ type: 'event.adapt_workout', exercises });
    },
    []
  );

  const finishWorkout = useCallback(() => {
    workoutMachineRefCallback.current?.send({ type: 'event.finish_workout' });
  }, []);

  const showExerciseVideo = useCallback(() => {
    workoutMachineRefCallback.current?.send({ type: 'event.show_exercise_video' });
  }, []);

  const hideExerciseVideo = useCallback(() => {
    workoutMachineRefCallback.current?.send({ type: 'event.hide_exercise_video' });
  }, []);

  const setCustomTimer: ClientTool<{ time: number; prompt: string }> = ({ time, prompt }, context) => {
    setTimeout(() => {
      context.sendText(
        `🔔 TIMER ALERT: The timer you set ${time} seconds ago has finished.
    
  Timer prompt: "${prompt}"
  Completed at: ${new Date().toLocaleString()}
    
  This is an automated system notification. Please proceed with any actions related to this timer.`,
      );
    }, time * 1000);

    return "Timer set";
  };

  const conversation = useConversation({
    onDisconnect: () => {
      console.log('Disconnected! cleaning up...');
      setSessionCreated(false);
    },
    clientTools: {
      start_workout: startWorkout,
      pause: pauseWorkout,
      resume: resumeWorkout,
      next_set: nextSet,
      previous_set: previousSet,
      skip_rest: skipRest,
      go_to_exercise: goToExercise,
      go_to_group: goToGroup,
      adapt_workout: adaptWorkout,
      show_exercise_video: showExerciseVideo,
      hide_exercise_video: hideExerciseVideo,
      set_timer: setCustomTimer,
      finish_workout: finishWorkout
    }
  });

  const addMessage: AddMessage = useCallback(
    (type, content, timestamp = Date.now()) => {
      if (content) {
        setMessages((prev) => [
          ...prev,
          { type, content, timestamp, id: Math.random() }
        ]);

        if (messageThreadIdRef) {
          fetch('/api/workout-coach/message', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              threadId: messageThreadIdRef,
              content,
              type
            })
          });
        }
      }
    },
    [messageThreadIdRef]
  );

  const sendEvent = useCallback(
    (event: RealTimeMessage) => {
      conversation.send(JSON.stringify(event));

      const responseEvent = {
        type: 'response.create'
      };

      conversation.send(JSON.stringify(responseEvent));
    },
    [conversation]
  );

  const sendChatMessage = useCallback(
    (message: string, options?: { cancelOngoing?: boolean }) => {
      conversation.sendText(message, options);
    },
    [conversation]
  );

  const startSession = useCallback(async () => {
    let globalPrompt = undefined;
    let userPersonalizedPrompt = undefined;
    let userContextPrompt = undefined;
    try {
      const response = await fetch('/api/workout-coach/prompt');
      const data = await response.json();
      globalPrompt = data.globalPrompt;
      userPersonalizedPrompt = data.userPrompt;
      userContextPrompt = data.userContextPrompt;
      console.log('Global Prompt', globalPrompt);
      console.log('User Personalized Prompt', userPersonalizedPrompt);
      console.log('User Context Prompt', userContextPrompt);
    } catch (error) {
      console.error('Error fetching workout coach prompts:', error);
    }

    const sessionConfig: SessionConfig = {
      model: 'outspeed-v1',
      instructions: buildOutspeedAgentInstructions(
        globalPrompt,
        userPersonalizedPrompt,
        '',
        workoutDataRef,
        userContextPrompt
      ),
      voice: 'savannah',
      temperature: 0,
      turn_detection: {
        type: 'semantic_vad'
      },
      tools: outspeedAgentTools as FunctionDefinition[]
    };
    try {
      if (isInitializingRef.current) {
        console.log('⚠️ Connection already exists or in progress, skipping...');
        return;
      }

      console.log('🔄 Starting new connection...');
      isInitializingRef.current = true;
      setConnectionState('connecting');
      addMessage('system', 'Connecting to your session...');

      const ephemeralKey = await getEphemeralKeyFromServer(sessionConfig);

      conversation.on('conversation.item.created', (event) => {
        console.log('Item added:', event.item);
      });

      conversation.on('session.created', () => {
        console.log('Session created');
        setSessionCreated(true);
        setConnectionState('connected');
        addMessage('system', 'Connection established successfully!');
        conversation.sendText('Initiate greeting!');
        isInitializingRef.current = false;
      });

      conversation.on('response.done', (event) => {
        console.log('Response done', event);
        if (event?.item?.type !== 'function_call') {
          addMessage(
            'assistant',
            event.response?.output?.[0]?.content?.[0]?.transcript
          );
        }
      });

      conversation.on(
        'conversation.item.input_audio_transcription.completed',
        (event) => {
          console.log(
            'Conversation item input audio transcription completed',
            event
          );
          addMessage('user', event.transcript);
        }
      );

      await conversation.startSession(ephemeralKey);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting session', error);
      setConnectionState('error');
      isInitializingRef.current = false;
      addMessage(
        'error',
        'We are unable to connect at the moment. Please try again.'
      );
    }
  }, [conversation, workoutDataRef, addMessage]);

  const endSession = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('Error ending session', error);
    } finally {
      setSessionCreated(false);
      setConnectionState('disconnected');
      setIsRecording(false);
      setCurrentTranscript('');
    }
  }, [conversation]);

  const toggleMute = useCallback(() => {
    conversation.toggleMute();
    setIsMuted((v) => !v);
    addMessage(
      'system',
      !isMuted
        ? 'Audio muted. Focus on your workout!'
        : 'Audio unmuted. Ready to listen!'
    );
  }, [conversation, isMuted, addMessage]);

  const addToContext = useCallback(
    async (text: string, role: 'system' | 'user' = 'user') => {
      const event = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: role || 'user',
          content: [
            {
              type: 'input_text',
              text
            }
          ]
        }
      };

      await conversation.send(JSON.stringify(event));
    },
    [conversation]
  );

  const contextValue = useMemo(
    () => ({
      sessionCreated,
      startSession,
      endSession,
      toggleMute,
      addToContext,
      connectionState,
      isRecording,
      isMuted,
      messages,
      currentTranscript,
      messageInput,
      setMessageInput,
      sendEvent,
      addMessage,
      sendChatMessage,
      setWorkoutDataRef,
      setMessageThreadIdRef,
      setWorkoutMachineRef: (ref: any) => {
        workoutMachineRefCallback.current = ref;
      }
    }),
    [
      sessionCreated,
      startSession,
      endSession,
      toggleMute,
      addToContext,
      connectionState,
      isRecording,
      isMuted,
      messages,
      currentTranscript,
      messageInput,
      sendEvent,
      addMessage,
      sendChatMessage
    ]
  );

  return (
    <OutspeedContext.Provider value={contextValue}>
      {children}
    </OutspeedContext.Provider>
  );
};


export const useOutspeed = () => {
  const context = useContext(OutspeedContext);
  if (!context) {
    throw new Error('useOutspeed must be used within an OutspeedProvider');
  }
  return context;
};
