SET time zone 'UTC';
CREATE TYPE "Complaint_Category" AS ENUM (
    'maintenance',
    'noise',
    'security',
    'parking',
    'neighbor',
    'trash',
    'internet',
    'lease',
    'natural_disaster',
    'other'
    );
CREATE TYPE "Status" AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed'
    );
CREATE TYPE "Type" AS ENUM (
    'lease_agreement',
    'amendment',
    'extension',
    'termination',
    'addendum'
    );

CREATE TYPE "Lease_Status" AS ENUM (
  'draft',
  'pending_approval', 
  'active',
  'expired',
  'terminated',
  'renewed',
  'canceled'          
);
CREATE TYPE "Compliance_Status" AS ENUM (
    'pending_review',
    'compliant',
    'non_compliant',
    'exempted'
    );
CREATE TYPE "Work_Category" AS ENUM (
    'plumbing',
    'electric',
    'carpentry',
    'hvac',
    'other'
    );
CREATE TABLE IF NOT EXISTS "parking_permits"
(
    "id"            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "license_plate" TEXT          NULL,
    "car_make"      TEXT          NULL,
    "car_color"     TEXT          NULL,
    "available"     BOOLEAN       NOT NULL DEFAULT true,
    "created_by"    BIGINT        NULL,
    "updated_at"    TIMESTAMP(0) DEFAULT now(),
    "expires_at"    TIMESTAMP(0)  NULL
);

COMMENT ON COLUMN "parking_permits"."expires_at" IS '5 days long';
CREATE TABLE IF NOT EXISTS "complaints"
(
    "id"               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "created_by"       BIGINT               NOT NULL,
    "category"         "Complaint_Category" NOT NULL DEFAULT "Complaint_Category" 'other',
    "title"            VARCHAR              NOT NULL,
    "description"      TEXT                 NOT NULL,
    "unit_number"      BIGINT               NULL,
    "status"           "Status"             NOT NULL DEFAULT "Status" 'open',
    "updated_at"       TIMESTAMP(0)                  DEFAULT now(),
    "created_at"       TIMESTAMP(0)                  DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "work_orders"
(
    "id"           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "created_by"   BIGINT          NOT NULL,
    "category"     "Work_Category" NOT NULL,
    "title"        VARCHAR         NOT NULL,
    "description"  TEXT            NOT NULL,
    "unit_number"  BIGINT          NOT NULL,
    "status"       "Status"        NOT NULL DEFAULT "Status" 'open',
    "updated_at"   TIMESTAMP(0)             DEFAULT now(),
    "created_at"   TIMESTAMP(0)             DEFAULT now()
);

CREATE TYPE "Account_Status" AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE "Role" AS ENUM ('tenant', 'admin');
CREATE TABLE IF NOT EXISTS "users"
(
    "id"         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "clerk_id"   TEXT UNIQUE      NOT NULL, -- Clerk ID's "user_2u9IV7xs5cUaYv2MsGH3pcI5hzK" cannot be converted to UUID format
    "first_name" VARCHAR          NOT NULL,
    "last_name"  VARCHAR          NOT NULL,
    "email"      VARCHAR          NOT NULL,
    "phone"      VARCHAR          NULL,
    "role"       "Role"           NOT NULL DEFAULT "Role" 'tenant',
    "status"     "Account_Status" NOT NULL DEFAULT "Account_Status" 'active',
    "updated_at" TIMESTAMP(0)              DEFAULT now(),
    "created_at" TIMESTAMP(0)              DEFAULT now()
);
CREATE INDEX "user_clerk_id_index" ON "users" ("clerk_id");

COMMENT ON COLUMN "users"."clerk_id" IS 'provided by Clerk';
CREATE TABLE IF NOT EXISTS "apartments"
(
    "id"            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "unit_number"   BIGINT         NULL,
    "building_id"   BIGINT         NOT NULL,
    "price"         NUMERIC(10, 2) NULL,
    "size"          SMALLINT       NULL,
    "management_id" BIGINT         NOT NULL,
    "availability"  BOOLEAN        NOT NULL DEFAULT true,
    "lease_id"      BIGINT         NULL,
    "updated_at"    TIMESTAMP(0)            DEFAULT now(),
    "created_at"    TIMESTAMP(0)            DEFAULT now()
);
CREATE INDEX "apartment_unit_number_index" ON "apartments" ("unit_number");

COMMENT ON COLUMN "apartments"."unit_number" IS 'describes as <building><floor><door> -> 2145';
-- Leases Table

CREATE TABLE IF NOT EXISTS "leases"
(
    "id"               BIGSERIAL PRIMARY KEY,
    "lease_number"     BIGINT  NOT NULL,
    "external_doc_id"  TEXT           NOT NULL UNIQUE, -- Maps to Documenso's externalId
    "lease_pdf_s3" TEXT,
    "tenant_id"        BIGINT         NOT NULL REFERENCES users (id),
    "landlord_id"      BIGINT         NOT NULL REFERENCES users (id),
    "apartment_id"     BIGINT         NOT NULL ,
    "lease_start_date" DATE           NOT NULL,
    "lease_end_date"   DATE           NOT NULL,
    "rent_amount"      DECIMAL(10, 2) NOT NULL,
    "status"            "Lease_Status" NOT NULL DEFAULT 'active',
    "created_by"       BIGINT         NOT NULL,
    "updated_by"       BIGINT         NOT NULL,
    "created_at"       TIMESTAMP(0)            DEFAULT now(),
    "updated_at"       TIMESTAMP(0)            DEFAULT now(),
    "previous_lease_id" BIGINT REFERENCES leases(id),
    "tenant_signing_url" TEXT,
    "landlord_signing_url" TEXT
);

CREATE INDEX "lease_lease_number_index" ON "leases" ("lease_number");
CREATE INDEX "lease_apartment_id_index" ON "leases" ("apartment_id");

CREATE TABLE IF NOT EXISTS "lockers"
(
    "id"          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "access_code" varchar,
    "in_use"      BOOLEAN NOT NULL DEFAULT true,
    "user_id"     BIGINT
);

ALTER TABLE "lockers"
    ADD CONSTRAINT "user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

CREATE TABLE IF NOT EXISTS "buildings"
(
    "id"               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "parking_total"    BIGINT NULL,
    "per_user_parking" BIGINT NULL,
    "management_id"    BIGINT NOT NULL,
    "created_at"       TIMESTAMP(0) DEFAULT now(),
    "updated_at"       TIMESTAMP(0) DEFAULT now()
);

ALTER TABLE "parking_permits"
    ADD CONSTRAINT "parking_permit_created_by_foreign" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
ALTER TABLE "apartments"
    ADD CONSTRAINT "apartment_management_id_foreign" FOREIGN KEY ("management_id") REFERENCES "users" ("id");
ALTER TABLE "leases"
    ADD CONSTRAINT "lease_created_by_foreign" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
ALTER TABLE "complaints"
    ADD CONSTRAINT "complaint_created_by_foreign" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
ALTER TABLE
    "apartments"
    ADD CONSTRAINT "apartments_building_id_foreign" FOREIGN KEY ("building_id") REFERENCES "buildings" ("id");
ALTER TABLE "leases"
    ADD CONSTRAINT "lease_apartment_id_foreign" FOREIGN KEY ("apartment_id") REFERENCES "apartments" ("id");
ALTER TABLE "leases"
    ADD CONSTRAINT "lease_updated_by_foreign" FOREIGN KEY ("updated_by") REFERENCES "users" ("id");
ALTER TABLE "work_orders"
    ADD CONSTRAINT "workorder_created_by_foreign" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
ALTER TABLE "leases"
    ADD CONSTRAINT "lease_landlord_foreign" FOREIGN KEY ("landlord_id") REFERENCES "users" ("id");

