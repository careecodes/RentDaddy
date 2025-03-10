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
    'renewed'
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
    "permit_number" BIGINT                         NOT NULL,
    "created_by"    BIGINT                         NOT NULL,
    "updated_at"    TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "expires_at"    TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);

COMMENT ON COLUMN "parking_permits"."expires_at" IS '5 days long';
CREATE TABLE IF NOT EXISTS "complaints"
(
    "id"               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "complaint_number" BIGINT                         NOT NULL,
    "created_by"       BIGINT                         NOT NULL,
    "category"         "Complaint_Category"           NOT NULL DEFAULT "Complaint_Category" 'other',
    "title"            VARCHAR                        NOT NULL,
    "description"      TEXT                           NOT NULL,
    "unit_number"      SMALLINT                       NOT NULL,
    "status"           "Status"                       NOT NULL DEFAULT "Status" 'open',
    "updated_at"       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "created_at"       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS "work_orders"
(
    "id"           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "created_by"   BIGINT                         NOT NULL,
    "order_number" BIGINT                         NOT NULL,
    "category"     "Work_Category"                NOT NULL,
    "title"        VARCHAR                        NOT NULL,
    "description"  TEXT                           NOT NULL,
    "unit_number"  SMALLINT                       NOT NULL,
    "status"       "Status"                       NOT NULL DEFAULT "Status" 'open',
    "updated_at"   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "created_at"   TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);

CREATE TYPE "Account_Status" AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE "Role" AS ENUM ('tenant', 'admin', 'landlord');
CREATE TABLE IF NOT EXISTS "users"
(
    "id"            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "clerk_id"      UUID                           NOT NULL,
    "first_name"    VARCHAR                        NOT NULL,
    "last_name"     VARCHAR                        NOT NULL,
    "email"         VARCHAR                        NOT NULL,
    "phone"         VARCHAR                        NULL,
    "unit_number"   SMALLINT                       NULL,
    "role"          "Role"                         NOT NULL DEFAULT "Role" 'tenant',
    "status"        "Account_Status"               NOT NULL DEFAULT "Account_Status" 'active',
    "last_login"    TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "updated_at"    TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "created_at"    TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
CREATE INDEX "user_clerk_id_index" ON "users" ("clerk_id");
CREATE INDEX "user_unit_number_index" ON "users" ("unit_number");

COMMENT ON COLUMN "users"."clerk_id" IS 'provided by Clerk';
CREATE TABLE IF NOT EXISTS "apartments"
(
    "id"               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "unit_number"      SMALLINT                       NOT NULL,
    "price"            NUMERIC(10, 2)                 NOT NULL,
    "size"             SMALLINT                       NOT NULL,
    "management_id"    BIGINT                         NOT NULL,
    "availability"     BOOLEAN                        NOT NULL DEFAULT false,
    "lease_id"         BIGINT                         NOT NULL,
    "lease_start_date" DATE                           NOT NULL,
    "lease_end_date"   DATE                           NOT NULL,
    "updated_at"       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "created_at"       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
CREATE INDEX "apartment_unit_number_index" ON "apartments" ("unit_number");

COMMENT ON COLUMN "apartments"."unit_number" IS 'describes as <building><floor><door> -> 2145';
CREATE TABLE IF NOT EXISTS "leases"
(
    "id"                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY ,
    "document_name"      TEXT                           NOT NULL,
    "document_type"      "Type"                         NOT NULL,
    "file_type"          VARCHAR                        NOT NULL,
    "file_path"          VARCHAR                        NOT NULL,
    "file_size"          INTEGER                        NULL,
    "checksum"           TEXT                           NULL,
    "content_hash"       TEXT                           NULL,
    "version_number"     TEXT                           NULL,
    "is_active"          BOOLEAN                        NOT NULL DEFAULT true,
    "is_template"        BOOLEAN                        NOT NULL DEFAULT false,
    "lease_number"       bigint                         NOT NULL,
    "lease_status"       "Lease_Status"                 NOT NULL DEFAULT "Lease_Status" 'draft',
    "updated_at"         TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "created_at"         TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "effective_date"     TIMESTAMP(0) WITHOUT TIME ZONE NULL,
    "expiration_date"    TIMESTAMP(0) WITHOUT TIME ZONE NULL,
    "created_by"         BIGINT                         NOT NULL,
    "updated_by"         BIGINT                         NOT NULL,
    "view_count"         INTEGER                        NOT NULL DEFAULT 0,
    "download_count"     INTEGER                        NOT NULL DEFAULT 0,
    "last_viewed_at"     TIMESTAMP(0) WITHOUT TIME ZONE NULL,
    "apartment_id"       BIGINT                         NOT NULL,
    "landlord"           BIGINT                         NOT NULL,
    "tags"               TEXT                           NULL,
    "custom_metadata"    jsonb                          NULL,
    "is_signed"          BOOLEAN                        NOT NULL DEFAULT false,
    "signature_metadata" jsonb                          NULL,
    "compliance_status"  "Compliance_Status"            NOT NULL DEFAULT "Compliance_Status" 'pending_review'
);
CREATE INDEX "lease_lease_number_index" ON "leases" ("lease_number");
CREATE INDEX "lease_apartment_id_index" ON "leases" ("apartment_id");

COMMENT ON COLUMN "leases"."document_type" IS 'amendment?';
COMMENT ON COLUMN "leases"."file_size" IS 'size in Bytes';
COMMENT ON COLUMN "leases"."tags" IS 'Type: string Array';
CREATE TABLE IF NOT EXISTS "lockers"
(
    "id"          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "access_code" varchar,
    "in_use"      BOOLEAN NOT NULL DEFAULT false,
    "user_id"     BIGINT
);

ALTER TABLE "lockers"
    ADD CONSTRAINT "user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "users" ("id");
CREATE TABLE IF NOT EXISTS "apartment_tenants"
(
    "apartment_id" BIGINT NOT NULL,
    "tenant_id"    BIGINT NOT NULL,
    PRIMARY KEY ("apartment_id", "tenant_id"),
    FOREIGN KEY ("apartment_id") REFERENCES "apartments" ("id"),
    FOREIGN KEY ("tenant_id") REFERENCES "users" ("id")
);
CREATE TABLE IF NOT EXISTS "lease_tenants"
(
    "lease_id"  BIGINT NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    PRIMARY KEY ("lease_id", "tenant_id"),
    FOREIGN KEY ("lease_id") REFERENCES "leases" ("id"),
    FOREIGN KEY ("tenant_id") REFERENCES "users" ("id")
);
ALTER TABLE "parking_permits"
    ADD CONSTRAINT "parking_permit_created_by_foreign" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
ALTER TABLE "apartments"
    ADD CONSTRAINT "apartment_management_id_foreign" FOREIGN KEY ("management_id") REFERENCES "users" ("id");
ALTER TABLE "leases"
    ADD CONSTRAINT "lease_created_by_foreign" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
ALTER TABLE "complaints"
    ADD CONSTRAINT "complaint_created_by_foreign" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
ALTER TABLE "leases"
    ADD CONSTRAINT "lease_apartment_id_foreign" FOREIGN KEY ("apartment_id") REFERENCES "apartments" ("id");
ALTER TABLE "leases"
    ADD CONSTRAINT "lease_updated_by_foreign" FOREIGN KEY ("updated_by") REFERENCES "users" ("id");
ALTER TABLE "work_orders"
    ADD CONSTRAINT "workorder_created_by_foreign" FOREIGN KEY ("created_by") REFERENCES "users" ("id");
ALTER TABLE "leases"
    ADD CONSTRAINT "lease_landlord_foreign" FOREIGN KEY ("landlord") REFERENCES "users" ("id");