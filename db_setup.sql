CREATE SCHEMA IF NOT EXISTS "field_req";

-- Clean up any stale/old tables to avoid skip-on-exist schema conflicts
DROP TABLE IF EXISTS "field_req"."projects" CASCADE;
DROP TABLE IF EXISTS "field_req"."crew_members" CASCADE;
DROP TABLE IF EXISTS "field_req"."profiles" CASCADE;

CREATE TABLE "field_req"."profiles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" varchar(255) UNIQUE NOT NULL,
    "role" varchar(50) DEFAULT 'user',
    "company_info" text,
    "twilio_phone" varchar(20),
    "trial_status" varchar(50) DEFAULT 'active',
    "created_at" timestamp DEFAULT now() NOT NULL,
    "auth_id" uuid UNIQUE
);

CREATE TABLE "field_req"."crew_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "profile_id" uuid NOT NULL REFERENCES "field_req"."profiles"("id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "phone" varchar(20) NOT NULL,
    "language" varchar(10) DEFAULT 'en' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "field_req"."projects" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "profile_id" uuid NOT NULL REFERENCES "field_req"."profiles"("id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "address" text,
    "specs" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE "field_req"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "field_req"."crew_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "field_req"."projects" ENABLE ROW LEVEL SECURITY;

-- User policies
DROP POLICY IF EXISTS "Users can manage their own profile" ON "field_req"."profiles";
CREATE POLICY "Users can manage their own profile" ON "field_req"."profiles"
    FOR ALL TO authenticated
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own crew members" ON "field_req"."crew_members";
CREATE POLICY "Users can manage their own crew members" ON "field_req"."crew_members"
    FOR ALL TO authenticated
    USING (profile_id IN (SELECT id FROM "field_req"."profiles" WHERE auth_id = auth.uid()))
    WITH CHECK (profile_id IN (SELECT id FROM "field_req"."profiles" WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own projects" ON "field_req"."projects";
CREATE POLICY "Users can manage their own projects" ON "field_req"."projects"
    FOR ALL TO authenticated
    USING (profile_id IN (SELECT id FROM "field_req"."profiles" WHERE auth_id = auth.uid()))
    WITH CHECK (profile_id IN (SELECT id FROM "field_req"."profiles" WHERE auth_id = auth.uid()));

-- Service role bypass policies (since some backend flows like checking/sending might run via service role key)
DROP POLICY IF EXISTS "Service role bypass profile" ON "field_req"."profiles";
CREATE POLICY "Service role bypass profile" ON "field_req"."profiles"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role bypass crew_members" ON "field_req"."crew_members";
CREATE POLICY "Service role bypass crew_members" ON "field_req"."crew_members"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role bypass projects" ON "field_req"."projects";
CREATE POLICY "Service role bypass projects" ON "field_req"."projects"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
