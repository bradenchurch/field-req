CREATE SCHEMA IF NOT EXISTS "field_req";

CREATE TABLE IF NOT EXISTS "field_req"."profiles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" varchar(255) UNIQUE NOT NULL,
    "role" varchar(50) DEFAULT 'user',
    "company_info" text,
    "twilio_phone" varchar(20),
    "trial_status" varchar(50) DEFAULT 'active',
    "created_at" timestamp DEFAULT now() NOT NULL,
    "auth_id" uuid UNIQUE
);

CREATE TABLE IF NOT EXISTS "field_req"."crew_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "profile_id" uuid NOT NULL REFERENCES "field_req"."profiles"("id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "phone" varchar(20) NOT NULL,
    "language" varchar(10) DEFAULT 'en' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "field_req"."projects" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "profile_id" uuid NOT NULL REFERENCES "field_req"."profiles"("id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "address" text,
    "specs" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);
