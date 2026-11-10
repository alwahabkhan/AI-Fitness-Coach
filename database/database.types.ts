export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      centralized_exercise: {
        Row: {
          created_at: string | null
          id: string
          main_muscle: Database["public"]["Enums"]["main_muscle_type"] | null
          name: string
          prompt_exercise_description: string | null
          ratios: Json | null
          short_name: string | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          main_muscle?: Database["public"]["Enums"]["main_muscle_type"] | null
          name: string
          prompt_exercise_description?: string | null
          ratios?: Json | null
          short_name?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          main_muscle?: Database["public"]["Enums"]["main_muscle_type"] | null
          name?: string
          prompt_exercise_description?: string | null
          ratios?: Json | null
          short_name?: string | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      enhanced_workout_session: {
        Row: {
          completed_at: string | null
          completed_sets: number | null
          completion_percentage: number | null
          created_at: string | null
          current_exercise_index: number | null
          current_group: number | null
          id: string
          last_timer_update: string | null
          program_id: string | null
          results: Json | null
          session_data: Json | null
          started_at: string | null
          status: string
          timer_state: Json | null
          total_sets: number | null
          training_day_id: string | null
          updated_at: string | null
          user_id: string
          workout_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_sets?: number | null
          completion_percentage?: number | null
          created_at?: string | null
          current_exercise_index?: number | null
          current_group?: number | null
          id?: string
          last_timer_update?: string | null
          program_id?: string | null
          results?: Json | null
          session_data?: Json | null
          started_at?: string | null
          status?: string
          timer_state?: Json | null
          total_sets?: number | null
          training_day_id?: string | null
          updated_at?: string | null
          user_id: string
          workout_id: string
        }
        Update: {
          completed_at?: string | null
          completed_sets?: number | null
          completion_percentage?: number | null
          created_at?: string | null
          current_exercise_index?: number | null
          current_group?: number | null
          id?: string
          last_timer_update?: string | null
          program_id?: string | null
          results?: Json | null
          session_data?: Json | null
          started_at?: string | null
          status?: string
          timer_state?: Json | null
          total_sets?: number | null
          training_day_id?: string | null
          updated_at?: string | null
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_workout_session_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_workout_session_training_day_id_fkey"
            columns: ["training_day_id"]
            isOneToOne: false
            referencedRelation: "training_day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_workout_session_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_workout_session_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise: {
        Row: {
          agent_context: string | null
          created_at: string | null
          execution_meta: Json
          group: number
          id: string
          name: string
          order: number
          updated_at: string | null
          video_url: string | null
          workout_id: string
        }
        Insert: {
          agent_context?: string | null
          created_at?: string | null
          execution_meta?: Json
          group: number
          id?: string
          name: string
          order: number
          updated_at?: string | null
          video_url?: string | null
          workout_id: string
        }
        Update: {
          agent_context?: string | null
          created_at?: string | null
          execution_meta?: Json
          group?: number
          id?: string
          name?: string
          order?: number
          updated_at?: string | null
          video_url?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_completion: {
        Row: {
          completed_at: string | null
          exercise_id: string
          exercise_name: string
          group_number: number
          id: string
          reps_completed: number | null
          rest_time_seconds: number | null
          session_id: string
          set_number: number
          weight_used: number | null
        }
        Insert: {
          completed_at?: string | null
          exercise_id: string
          exercise_name: string
          group_number: number
          id?: string
          reps_completed?: number | null
          rest_time_seconds?: number | null
          session_id: string
          set_number: number
          weight_used?: number | null
        }
        Update: {
          completed_at?: string | null
          exercise_id?: string
          exercise_name?: string
          group_number?: number
          id?: string
          reps_completed?: number | null
          rest_time_seconds?: number | null
          session_id?: string
          set_number?: number
          weight_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_completion_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "enhanced_workout_session"
            referencedColumns: ["id"]
          },
        ]
      }
      last_exercise_instance: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          exercise_name: string
          exercise_parameters: Json
          exercise_type: string
          id: string
          program_id: string | null
          training_day_id: string | null
          updated_at: string | null
          user_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          exercise_name: string
          exercise_parameters?: Json
          exercise_type: string
          id?: string
          program_id?: string | null
          training_day_id?: string | null
          updated_at?: string | null
          user_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          exercise_name?: string
          exercise_parameters?: Json
          exercise_type?: string
          id?: string
          program_id?: string | null
          training_day_id?: string | null
          updated_at?: string | null
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "last_exercise_instance_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "last_exercise_instance_training_day_id_fkey"
            columns: ["training_day_id"]
            isOneToOne: false
            referencedRelation: "training_day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "last_exercise_instance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "last_exercise_instance_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout"
            referencedColumns: ["id"]
          },
        ]
      }
      message: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_thread_id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["message_role"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_thread_id: string
          metadata?: Json | null
          role: Database["public"]["Enums"]["message_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_thread_id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["message_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_message_thread_id_fkey"
            columns: ["message_thread_id"]
            isOneToOne: false
            referencedRelation: "message_thread"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      message_thread: {
        Row: {
          created_at: string | null
          id: string
          meta: Json | null
          owner_user_id: string
          title: string | null
          type: Database["public"]["Enums"]["message_thread_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          owner_user_id: string
          title?: string | null
          type: Database["public"]["Enums"]["message_thread_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          owner_user_id?: string
          title?: string | null
          type?: Database["public"]["Enums"]["message_thread_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_thread_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      notification: {
        Row: {
          acknowledged_at: string | null
          alert_type: Database["public"]["Enums"]["notification_alert_type"]
          created_at: string
          created_by: string | null
          delivery_channels: string[]
          id: string
          message: string
          message_thread_id: string | null
          metadata: Json
          recipient_user_id: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: Database["public"]["Enums"]["notification_alert_type"]
          created_at?: string
          created_by?: string | null
          delivery_channels?: string[]
          id?: string
          message: string
          message_thread_id?: string | null
          metadata?: Json
          recipient_user_id?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: Database["public"]["Enums"]["notification_alert_type"]
          created_at?: string
          created_by?: string | null
          delivery_channels?: string[]
          id?: string
          message?: string
          message_thread_id?: string | null
          metadata?: Json
          recipient_user_id?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_message_thread_id_fkey"
            columns: ["message_thread_id"]
            isOneToOne: false
            referencedRelation: "message_thread"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      program: {
        Row: {
          agent_context: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_completed: boolean | null
          max_sessions: number | null
          name: string
          session_duration_days: number | null
          status: Database["public"]["Enums"]["program_status"] | null
          trainee_id: string
          trainer_id: string
          updated_at: string | null
        }
        Insert: {
          agent_context?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_completed?: boolean | null
          max_sessions?: number | null
          name: string
          session_duration_days?: number | null
          status?: Database["public"]["Enums"]["program_status"] | null
          trainee_id: string
          trainer_id: string
          updated_at?: string | null
        }
        Update: {
          agent_context?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_completed?: boolean | null
          max_sessions?: number | null
          name?: string
          session_duration_days?: number | null
          status?: Database["public"]["Enums"]["program_status"] | null
          trainee_id?: string
          trainer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          type: Database["public"]["Enums"]["prompt_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          type: Database["public"]["Enums"]["prompt_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          type?: Database["public"]["Enums"]["prompt_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      session_state_snapshot: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          snapshot_data: Json
          snapshot_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          snapshot_data: Json
          snapshot_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          snapshot_data?: Json
          snapshot_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_state_snapshot_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "enhanced_workout_session"
            referencedColumns: ["id"]
          },
        ]
      }
      training_day: {
        Row: {
          created_at: string | null
          day_order: number
          description: string | null
          id: string
          name: string
          program_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_order: number
          description?: string | null
          id?: string
          name: string
          program_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_order?: number
          description?: string | null
          id?: string
          name?: string
          program_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_day_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program"
            referencedColumns: ["id"]
          },
        ]
      }
      training_exercise: {
        Row: {
          agent_context: string | null
          created_at: string | null
          exercise_id: string
          exercise_order: number | null
          group_number: number | null
          id: string
          notes: string | null
          r_plus_option: number | null
          reps: number[] | null
          reps_progression: number | null
          rest_seconds: number | null
          sets: number | null
          training_day_id: string
          updated_at: string | null
          weight_progression: number | null
          weights: number[] | null
        }
        Insert: {
          agent_context?: string | null
          created_at?: string | null
          exercise_id: string
          exercise_order?: number | null
          group_number?: number | null
          id?: string
          notes?: string | null
          r_plus_option?: number | null
          reps?: number[] | null
          reps_progression?: number | null
          rest_seconds?: number | null
          sets?: number | null
          training_day_id: string
          updated_at?: string | null
          weight_progression?: number | null
          weights?: number[] | null
        }
        Update: {
          agent_context?: string | null
          created_at?: string | null
          exercise_id?: string
          exercise_order?: number | null
          group_number?: number | null
          id?: string
          notes?: string | null
          r_plus_option?: number | null
          reps?: number[] | null
          reps_progression?: number | null
          rest_seconds?: number | null
          sets?: number | null
          training_day_id?: string
          updated_at?: string | null
          weight_progression?: number | null
          weights?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "training_exercise_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "centralized_exercise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_exercise_training_day_id_fkey"
            columns: ["training_day_id"]
            isOneToOne: false
            referencedRelation: "training_day"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session: {
        Row: {
          agent_prompt: string | null
          created_at: string | null
          end_time: string | null
          id: string
          message_thread_id: string | null
          notes: string | null
          operational_cost: number | null
          perceived_exertion: number | null
          program_id: string
          results: Json | null
          session_number: number
          start_time: string
          status: Database["public"]["Enums"]["training_session_status"]
          training_day_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_prompt?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          message_thread_id?: string | null
          notes?: string | null
          operational_cost?: number | null
          perceived_exertion?: number | null
          program_id: string
          results?: Json | null
          session_number?: number
          start_time?: string
          status?: Database["public"]["Enums"]["training_session_status"]
          training_day_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_prompt?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          message_thread_id?: string | null
          notes?: string | null
          operational_cost?: number | null
          perceived_exertion?: number | null
          program_id?: string
          results?: Json | null
          session_number?: number
          start_time?: string
          status?: Database["public"]["Enums"]["training_session_status"]
          training_day_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_message_thread_id_fkey"
            columns: ["message_thread_id"]
            isOneToOne: false
            referencedRelation: "message_thread"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "program"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_training_day_id_fkey"
            columns: ["training_day_id"]
            isOneToOne: false
            referencedRelation: "training_day"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      user: {
        Row: {
          agent_context: string | null
          allowed_sessions: number | null
          assigned_trainer_id: string | null
          created_at: string | null
          email: string
          id: string
          is_super_admin: boolean
          name: string
          password: string
          role: Database["public"]["Enums"]["user_role"]
          token_meta: Json | null
          updated_at: string | null
        }
        Insert: {
          agent_context?: string | null
          allowed_sessions?: number | null
          assigned_trainer_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_super_admin?: boolean
          name: string
          password: string
          role: Database["public"]["Enums"]["user_role"]
          token_meta?: Json | null
          updated_at?: string | null
        }
        Update: {
          agent_context?: string | null
          allowed_sessions?: number | null
          assigned_trainer_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_super_admin?: boolean
          name?: string
          password?: string
          role?: Database["public"]["Enums"]["user_role"]
          token_meta?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_assigned_trainer_id_fkey"
            columns: ["assigned_trainer_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      workout: {
        Row: {
          agent_context: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_context?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_context?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_session: {
        Row: {
          agent_prompt: string | null
          created_at: string | null
          end_time: string | null
          id: string
          message_thread_id: string | null
          operational_cost: number | null
          results: Json | null
          start_time: string
          updated_at: string | null
          workout_id: string
        }
        Insert: {
          agent_prompt?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          message_thread_id?: string | null
          operational_cost?: number | null
          results?: Json | null
          start_time?: string
          updated_at?: string | null
          workout_id: string
        }
        Update: {
          agent_prompt?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          message_thread_id?: string | null
          operational_cost?: number | null
          results?: Json | null
          start_time?: string
          updated_at?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_session_message_thread_id_fkey"
            columns: ["message_thread_id"]
            isOneToOne: false
            referencedRelation: "message_thread"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_session_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_session_completion_percentage: {
        Args: { session_id: string }
        Returns: number
      }
      get_incomplete_sessions: {
        Args: { user_id: string }
        Returns: {
          completed_sets: number
          completion_percentage: number
          current_exercise_index: number
          current_group: number
          last_timer_update: string
          program_id: string
          session_id: string
          started_at: string
          status: string
          total_sets: number
          training_day_id: string
          workout_id: string
        }[]
      }
      get_trainee_dashboard_stats: {
        Args: { user_id: string }
        Returns: {
          current_streak: number
          sessions_this_week: number
          total_duration_minutes: number
          total_workouts: number
          workouts_completed: number
        }[]
      }
      get_trainer_dashboard_stats: {
        Args: never
        Returns: {
          active_trainees: number
          sessions_this_week: number
          workouts_created: number
        }[]
      }
      get_user_workout_history: {
        Args: { user_uuid: string }
        Returns: {
          duration_minutes: number
          exercises_completed: number
          session_date: string
          workout_name: string
        }[]
      }
      update_session_progress: {
        Args: {
          new_completed_sets?: number
          new_current_exercise_index?: number
          new_current_group?: number
          session_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      main_muscle_type:
        | "Back1"
        | "Back2"
        | "Lats1"
        | "Lats2"
        | "Low back"
        | "Chest1"
        | "Chest2"
        | "Quads1"
        | "Quads2"
        | "Tibialis"
        | "Hams1"
        | "Hams2"
        | "Glutes1"
        | "Glutes2"
        | "Shoulders1"
        | "Shoulders2"
        | "Biceps"
        | "Triceps"
        | "Forearm"
        | "Calves"
        | "Plantar fascia"
        | "Core"
        | "Mobility"
        | "Traps"
        | "Cardio"
        | "Circuits"
        | "Neck"
      message_role: "user" | "assistant" | "system"
      message_thread_type: "nutrition_coach" | "db_agent" | "workout_coach"
      notification_alert_type: "success" | "reminder" | "error"
      notification_status: "pending" | "sent" | "acknowledged"
      program_status: "draft" | "active" | "completed" | "archived"
      prompt_type:
        | "nutrition_coach_global"
        | "workout_coach_global"
        | "nutrition_coach_user"
        | "workout_coach_user"
      training_session_status: "in_progress" | "completed" | "cancelled"
      user_role: "trainer" | "trainee" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      main_muscle_type: [
        "Back1",
        "Back2",
        "Lats1",
        "Lats2",
        "Low back",
        "Chest1",
        "Chest2",
        "Quads1",
        "Quads2",
        "Tibialis",
        "Hams1",
        "Hams2",
        "Glutes1",
        "Glutes2",
        "Shoulders1",
        "Shoulders2",
        "Biceps",
        "Triceps",
        "Forearm",
        "Calves",
        "Plantar fascia",
        "Core",
        "Mobility",
        "Traps",
        "Cardio",
        "Circuits",
        "Neck",
      ],
      message_role: ["user", "assistant", "system"],
      message_thread_type: ["nutrition_coach", "db_agent", "workout_coach"],
      notification_alert_type: ["success", "reminder", "error"],
      notification_status: ["pending", "sent", "acknowledged"],
      program_status: ["draft", "active", "completed", "archived"],
      prompt_type: [
        "nutrition_coach_global",
        "workout_coach_global",
        "nutrition_coach_user",
        "workout_coach_user",
      ],
      training_session_status: ["in_progress", "completed", "cancelled"],
      user_role: ["trainer", "trainee", "admin"],
    },
  },
} as const
