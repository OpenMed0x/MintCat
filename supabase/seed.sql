


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."oracat_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" "text" NOT NULL,
    "email" "text" NOT NULL,
    "display_name" "text",
    "bio" "text",
    "avatar_url" "text",
    "public_key_pem" "text",
    "private_key_pem" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."oracat_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_delivery_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_type" "text",
    "state" "text" DEFAULT 'pending'::"text",
    "attempt_count" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 5,
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "local_username" "text",
    "last_error" "text",
    "run_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."oracat_delivery_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_following" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "local_username" "text" NOT NULL,
    "remote_actor_url" "text" NOT NULL,
    "following_state" "text" DEFAULT 'accepted'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "state" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "public"."oracat_following" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "local_username" "text" NOT NULL,
    "remote_actor_url" "text" NOT NULL,
    "state" "text" DEFAULT 'accepted'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "inbox_url" "text",
    "shared_inbox_url" "text",
    "accepted_at" timestamp with time zone
);


ALTER TABLE "public"."oracat_follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_inbox_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "activity_id" "text",
    "local_username" "text",
    "actor_url" "text",
    "activity_type" "text",
    "verified" boolean DEFAULT false,
    "raw_activity" "jsonb",
    "published_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."oracat_inbox_activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_instance_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "body" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."oracat_instance_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_moderation_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_type" "text",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."oracat_moderation_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_username" "text" NOT NULL,
    "actor_username" "text",
    "actor_display_name" "text",
    "type" "text",
    "summary" "text",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "post_id" "text"
);


ALTER TABLE "public"."oracat_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_poll_votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "voter_username" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "option_text" "text",
    "post_source" "text"
);


ALTER TABLE "public"."oracat_poll_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_username" "text" NOT NULL,
    "content" "text" NOT NULL,
    "summary" "text" DEFAULT ''::"text",
    "visibility" "text" DEFAULT 'public'::"text",
    "language" "text",
    "media" "jsonb" DEFAULT '[]'::"jsonb",
    "poll" "jsonb",
    "link_previews" "jsonb" DEFAULT '[]'::"jsonb",
    "liked_by" "text"[] DEFAULT '{}'::"text"[],
    "boosted_by" "text"[] DEFAULT '{}'::"text"[],
    "bookmarked_by" "text"[] DEFAULT '{}'::"text"[],
    "comments" "jsonb" DEFAULT '[]'::"jsonb",
    "published_at" timestamp with time zone DEFAULT "now"(),
    "boosted_from_id" "uuid",
    "boosted_from_author" "text"
);


ALTER TABLE "public"."oracat_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_remote_actors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_url" "text" NOT NULL,
    "display_name" "text",
    "handle" "text",
    "avatar_url" "text",
    "inbox_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "preferred_username" "text",
    "shared_inbox_url" "text",
    "public_key_pem" "text",
    "summary" "text"
);


ALTER TABLE "public"."oracat_remote_actors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_remote_posts" (
    "id" "text" NOT NULL,
    "author_actor_url" "text",
    "content" "text",
    "poll" "jsonb",
    "published_at" timestamp with time zone DEFAULT "now"(),
    "actor_url" "text",
    "author_name" "text",
    "author_handle" "text",
    "instance_host" "text",
    "raw_object" "jsonb",
    "url" "text",
    "attachments" "jsonb",
    "avatar_url" "text",
    "media" "jsonb" DEFAULT '[]'::"jsonb"
);


ALTER TABLE "public"."oracat_remote_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_email" "text",
    "target_post_id" "uuid",
    "target_actor" "text",
    "reason" "text",
    "details" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."oracat_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."oracat_risk_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text",
    "payload" "jsonb",
    "severity" "text" DEFAULT 'info'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."oracat_risk_events" OWNER TO "postgres";


ALTER TABLE ONLY "public"."oracat_accounts"
    ADD CONSTRAINT "oracat_accounts_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."oracat_accounts"
    ADD CONSTRAINT "oracat_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_accounts"
    ADD CONSTRAINT "oracat_accounts_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."oracat_delivery_jobs"
    ADD CONSTRAINT "oracat_delivery_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_following"
    ADD CONSTRAINT "oracat_following_local_username_remote_actor_url_key" UNIQUE ("local_username", "remote_actor_url");



ALTER TABLE ONLY "public"."oracat_following"
    ADD CONSTRAINT "oracat_following_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_follows"
    ADD CONSTRAINT "oracat_follows_local_username_remote_actor_url_key" UNIQUE ("local_username", "remote_actor_url");



ALTER TABLE ONLY "public"."oracat_follows"
    ADD CONSTRAINT "oracat_follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_inbox_activities"
    ADD CONSTRAINT "oracat_inbox_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_instance_rules"
    ADD CONSTRAINT "oracat_instance_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_moderation_actions"
    ADD CONSTRAINT "oracat_moderation_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_notifications"
    ADD CONSTRAINT "oracat_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_poll_votes"
    ADD CONSTRAINT "oracat_poll_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_poll_votes"
    ADD CONSTRAINT "oracat_poll_votes_source_post_user_unique" UNIQUE ("post_source", "post_id", "voter_username");



ALTER TABLE ONLY "public"."oracat_poll_votes"
    ADD CONSTRAINT "oracat_poll_votes_user_vote_unique" UNIQUE ("post_id", "voter_username");



ALTER TABLE ONLY "public"."oracat_posts"
    ADD CONSTRAINT "oracat_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_remote_actors"
    ADD CONSTRAINT "oracat_remote_actors_actor_url_key" UNIQUE ("actor_url");



ALTER TABLE ONLY "public"."oracat_remote_actors"
    ADD CONSTRAINT "oracat_remote_actors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_remote_posts"
    ADD CONSTRAINT "oracat_remote_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_reports"
    ADD CONSTRAINT "oracat_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."oracat_risk_events"
    ADD CONSTRAINT "oracat_risk_events_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."oracat_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_delivery_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_following" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_inbox_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_instance_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_moderation_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_poll_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_remote_actors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_remote_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracat_risk_events" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON TABLE "public"."oracat_accounts" TO "anon";
GRANT ALL ON TABLE "public"."oracat_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_delivery_jobs" TO "anon";
GRANT ALL ON TABLE "public"."oracat_delivery_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_delivery_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_following" TO "anon";
GRANT ALL ON TABLE "public"."oracat_following" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_following" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_follows" TO "anon";
GRANT ALL ON TABLE "public"."oracat_follows" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_follows" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_inbox_activities" TO "anon";
GRANT ALL ON TABLE "public"."oracat_inbox_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_inbox_activities" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_instance_rules" TO "anon";
GRANT ALL ON TABLE "public"."oracat_instance_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_instance_rules" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_moderation_actions" TO "anon";
GRANT ALL ON TABLE "public"."oracat_moderation_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_moderation_actions" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_notifications" TO "anon";
GRANT ALL ON TABLE "public"."oracat_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_poll_votes" TO "anon";
GRANT ALL ON TABLE "public"."oracat_poll_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_poll_votes" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_posts" TO "anon";
GRANT ALL ON TABLE "public"."oracat_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_posts" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_remote_actors" TO "anon";
GRANT ALL ON TABLE "public"."oracat_remote_actors" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_remote_actors" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_remote_posts" TO "anon";
GRANT ALL ON TABLE "public"."oracat_remote_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_remote_posts" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_reports" TO "anon";
GRANT ALL ON TABLE "public"."oracat_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_reports" TO "service_role";



GRANT ALL ON TABLE "public"."oracat_risk_events" TO "anon";
GRANT ALL ON TABLE "public"."oracat_risk_events" TO "authenticated";
GRANT ALL ON TABLE "public"."oracat_risk_events" TO "service_role";



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







