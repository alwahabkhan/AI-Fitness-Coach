SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE TYPE "public"."message_role" AS ENUM (
    'user',
    'assistant',
    'system'
);
ALTER TYPE "public"."message_role" OWNER TO "postgres";
CREATE TYPE "public"."message_thread_type" AS ENUM (
    'nutrition_coach',
    'db_agent',
    'workout_coach'
);
ALTER TYPE "public"."message_thread_type" OWNER TO "postgres";
CREATE TYPE "public"."prompt_type" AS ENUM (
    'nutrition_coach_global',
    'workout_coach_global',
    'nutrition_coach_user',
    'workout_coach_user'
);
ALTER TYPE "public"."prompt_type" OWNER TO "postgres";
CREATE TYPE "public"."user_role" AS ENUM (
    'trainer',
    'trainee'
);
ALTER TYPE "public"."user_role" OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."get_user_workout_history"("user_uuid" "uuid") RETURNS TABLE("workout_name" "text", "session_date" timestamp with time zone, "duration_minutes" integer, "exercises_completed" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.name,
    ws.start_time,
    EXTRACT(EPOCH FROM (ws.end_time - ws.start_time))::INTEGER / 60,
    (ws.results->>'exercises_completed')::INTEGER
  FROM workout_session ws
  JOIN workout w ON w.id = ws.workout_id
  WHERE w.user_id = user_uuid AND ws.end_time IS NOT NULL
  ORDER BY ws.start_time DESC;
END;
$$;
ALTER FUNCTION "public"."get_user_workout_history"("user_uuid" "uuid") OWNER TO "postgres";
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";
SET default_tablespace = '';
SET default_table_access_method = "heap";
CREATE TABLE IF NOT EXISTS "public"."exercise" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "execution_meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "group" integer NOT NULL,
    "order" integer NOT NULL,
    "video_url" "text",
    "agent_context" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_youtube_url" CHECK ((("video_url" IS NULL) OR ("video_url" ~ '^https?://(www\.)?(youtube\.com/watch\?v=|youtu\.be/)'::"text")))
);
ALTER TABLE "public"."exercise" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."message" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_thread_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "role" "public"."message_role" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."message" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."message_thread" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid" NOT NULL,
    "type" "public"."message_thread_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."message_thread" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."prompt" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."prompt_type" NOT NULL,
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "global_prompt_no_user" CHECK (((("user_id" IS NULL) AND ("type" = ANY (ARRAY['nutrition_coach_global'::"public"."prompt_type", 'workout_coach_global'::"public"."prompt_type"]))) OR (("user_id" IS NOT NULL) AND ("type" = ANY (ARRAY['nutrition_coach_user'::"public"."prompt_type", 'workout_coach_user'::"public"."prompt_type"])))))
);
ALTER TABLE "public"."prompt" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."user" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "password" "text" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "agent_context" "text",
    "token_meta" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."user" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."workout" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "agent_context" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."workout" OWNER TO "postgres";
CREATE TABLE IF NOT EXISTS "public"."workout_session" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "message_thread_id" "uuid",
    "start_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_time" timestamp with time zone,
    "operational_cost" numeric(10,4) DEFAULT 0,
    "agent_prompt" "text",
    "results" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_session_times" CHECK ((("end_time" IS NULL) OR ("end_time" >= "start_time")))
);
ALTER TABLE "public"."workout_session" OWNER TO "postgres";
ALTER TABLE ONLY "public"."exercise"
    ADD CONSTRAINT "exercise_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."message_thread"
    ADD CONSTRAINT "message_thread_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."prompt"
    ADD CONSTRAINT "prompt_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."prompt"
    ADD CONSTRAINT "unique_user_prompt" UNIQUE ("type", "user_id");
ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_email_key" UNIQUE ("email");
ALTER TABLE ONLY "public"."user"
    ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."workout"
    ADD CONSTRAINT "workout_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."workout_session"
    ADD CONSTRAINT "workout_session_pkey" PRIMARY KEY ("id");
CREATE INDEX "idx_exercise_group_order" ON "public"."exercise" USING "btree" ("workout_id", "group", "order");
CREATE INDEX "idx_exercise_workout_id" ON "public"."exercise" USING "btree" ("workout_id");
CREATE INDEX "idx_message_thread_id_created" ON "public"."message" USING "btree" ("message_thread_id", "created_at");
CREATE INDEX "idx_message_thread_owner" ON "public"."message_thread" USING "btree" ("owner_user_id", "type");
CREATE INDEX "idx_prompt_type_global" ON "public"."prompt" USING "btree" ("type") WHERE ("user_id" IS NULL);
CREATE INDEX "idx_prompt_type_user" ON "public"."prompt" USING "btree" ("type", "user_id") WHERE ("user_id" IS NOT NULL);
CREATE INDEX "idx_user_email" ON "public"."user" USING "btree" ("email");
CREATE INDEX "idx_user_role" ON "public"."user" USING "btree" ("role");
CREATE INDEX "idx_workout_session_start_time" ON "public"."workout_session" USING "btree" ("start_time");
CREATE INDEX "idx_workout_session_workout_id" ON "public"."workout_session" USING "btree" ("workout_id");
CREATE INDEX "idx_workout_user_id" ON "public"."workout" USING "btree" ("user_id");
CREATE OR REPLACE TRIGGER "update_exercise_updated_at" BEFORE UPDATE ON "public"."exercise" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_message_thread_updated_at" BEFORE UPDATE ON "public"."message_thread" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_message_updated_at" BEFORE UPDATE ON "public"."message" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_prompt_updated_at" BEFORE UPDATE ON "public"."prompt" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_user_updated_at" BEFORE UPDATE ON "public"."user" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_workout_session_updated_at" BEFORE UPDATE ON "public"."workout_session" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "update_workout_updated_at" BEFORE UPDATE ON "public"."workout" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
ALTER TABLE ONLY "public"."exercise"
    ADD CONSTRAINT "exercise_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_message_thread_id_fkey" FOREIGN KEY ("message_thread_id") REFERENCES "public"."message_thread"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."message_thread"
    ADD CONSTRAINT "message_thread_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."message"
    ADD CONSTRAINT "message_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."prompt"
    ADD CONSTRAINT "prompt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."workout_session"
    ADD CONSTRAINT "workout_session_message_thread_id_fkey" FOREIGN KEY ("message_thread_id") REFERENCES "public"."message_thread"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."workout_session"
    ADD CONSTRAINT "workout_session_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."workout"
    ADD CONSTRAINT "workout_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE;
CREATE POLICY "Trainers can create users" ON "public"."user" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user" "user_1"
  WHERE ((("user_1"."id")::"text" = ("auth"."uid"())::"text") AND ("user_1"."role" = 'trainer'::"public"."user_role")))));
CREATE POLICY "Trainers can manage all prompts" ON "public"."prompt" USING ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE ((("user"."id")::"text" = ("auth"."uid"())::"text") AND ("user"."role" = 'trainer'::"public"."user_role")))));
CREATE POLICY "Trainers can manage exercises" ON "public"."exercise" USING ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE ((("user"."id")::"text" = ("auth"."uid"())::"text") AND ("user"."role" = 'trainer'::"public"."user_role")))));
CREATE POLICY "Trainers can manage workouts" ON "public"."workout" USING ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE ((("user"."id")::"text" = ("auth"."uid"())::"text") AND ("user"."role" = 'trainer'::"public"."user_role")))));
CREATE POLICY "Trainers can view all threads" ON "public"."message_thread" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE ((("user"."id")::"text" = ("auth"."uid"())::"text") AND ("user"."role" = 'trainer'::"public"."user_role")))));
CREATE POLICY "Trainers can view all users" ON "public"."user" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user" "user_1"
  WHERE ((("user_1"."id")::"text" = ("auth"."uid"())::"text") AND ("user_1"."role" = 'trainer'::"public"."user_role")))));
CREATE POLICY "Users can create messages in their threads" ON "public"."message" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."message_thread" "mt"
  WHERE (("mt"."id" = "message"."message_thread_id") AND (("mt"."owner_user_id")::"text" = ("auth"."uid"())::"text")))));
CREATE POLICY "Users can create their threads" ON "public"."message_thread" FOR INSERT WITH CHECK ((("owner_user_id")::"text" = ("auth"."uid"())::"text"));
CREATE POLICY "Users can create their workout sessions" ON "public"."workout_session" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout" "w"
  WHERE (("w"."id" = "workout_session"."workout_id") AND (("w"."user_id")::"text" = ("auth"."uid"())::"text")))));
CREATE POLICY "Users can update their own data" ON "public"."user" FOR UPDATE USING ((("auth"."uid"())::"text" = ("id")::"text"));
CREATE POLICY "Users can update their workout sessions" ON "public"."workout_session" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workout" "w"
  WHERE (("w"."id" = "workout_session"."workout_id") AND (("w"."user_id")::"text" = ("auth"."uid"())::"text")))));
CREATE POLICY "Users can view exercises" ON "public"."exercise" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workout" "w"
  WHERE (("w"."id" = "exercise"."workout_id") AND ((("w"."user_id")::"text" = ("auth"."uid"())::"text") OR (EXISTS ( SELECT 1
           FROM "public"."user"
          WHERE ((("user"."id")::"text" = ("auth"."uid"())::"text") AND ("user"."role" = 'trainer'::"public"."user_role")))))))));
CREATE POLICY "Users can view global prompts" ON "public"."prompt" FOR SELECT USING (("user_id" IS NULL));
CREATE POLICY "Users can view messages in their threads" ON "public"."message" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."message_thread" "mt"
  WHERE (("mt"."id" = "message"."message_thread_id") AND (("mt"."owner_user_id")::"text" = ("auth"."uid"())::"text")))));
CREATE POLICY "Users can view their custom prompts" ON "public"."prompt" FOR SELECT USING ((("user_id")::"text" = ("auth"."uid"())::"text"));
CREATE POLICY "Users can view their own data" ON "public"."user" FOR SELECT USING ((("auth"."uid"())::"text" = ("id")::"text"));
CREATE POLICY "Users can view their threads" ON "public"."message_thread" FOR SELECT USING ((("owner_user_id")::"text" = ("auth"."uid"())::"text"));
CREATE POLICY "Users can view their workout sessions" ON "public"."workout_session" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workout" "w"
  WHERE (("w"."id" = "workout_session"."workout_id") AND ((("w"."user_id")::"text" = ("auth"."uid"())::"text") OR (EXISTS ( SELECT 1
           FROM "public"."user"
          WHERE ((("user"."id")::"text" = ("auth"."uid"())::"text") AND ("user"."role" = 'trainer'::"public"."user_role")))))))));
CREATE POLICY "Users can view their workouts" ON "public"."workout" FOR SELECT USING (((("user_id")::"text" = ("auth"."uid"())::"text") OR (EXISTS ( SELECT 1
   FROM "public"."user"
  WHERE ((("user"."id")::"text" = ("auth"."uid"())::"text") AND ("user"."role" = 'trainer'::"public"."user_role"))))));
ALTER TABLE "public"."exercise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."message_thread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prompt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workout_session" ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_workout_history"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_workout_history"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_workout_history"("user_uuid" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
GRANT ALL ON TABLE "public"."exercise" TO "anon";
GRANT ALL ON TABLE "public"."exercise" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise" TO "service_role";
GRANT ALL ON TABLE "public"."message" TO "anon";
GRANT ALL ON TABLE "public"."message" TO "authenticated";
GRANT ALL ON TABLE "public"."message" TO "service_role";
GRANT ALL ON TABLE "public"."message_thread" TO "anon";
GRANT ALL ON TABLE "public"."message_thread" TO "authenticated";
GRANT ALL ON TABLE "public"."message_thread" TO "service_role";
GRANT ALL ON TABLE "public"."prompt" TO "anon";
GRANT ALL ON TABLE "public"."prompt" TO "authenticated";
GRANT ALL ON TABLE "public"."prompt" TO "service_role";
GRANT ALL ON TABLE "public"."user" TO "anon";
GRANT ALL ON TABLE "public"."user" TO "authenticated";
GRANT ALL ON TABLE "public"."user" TO "service_role";
GRANT ALL ON TABLE "public"."workout" TO "anon";
GRANT ALL ON TABLE "public"."workout" TO "authenticated";
GRANT ALL ON TABLE "public"."workout" TO "service_role";
GRANT ALL ON TABLE "public"."workout_session" TO "anon";
GRANT ALL ON TABLE "public"."workout_session" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_session" TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
RESET ALL;
