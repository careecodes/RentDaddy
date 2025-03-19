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
    "permit_number" BIGINT       NOT NULL,
    "created_by"    BIGINT       NOT NULL,
    "updated_at"    TIMESTAMP(0) DEFAULT now(),
    "expires_at"    TIMESTAMP(0) NOT NULL
);

COMMENT ON COLUMN "parking_permits"."expires_at" IS '5 days long';
CREATE TABLE IF NOT EXISTS "complaints"
(
    "id"               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "complaint_number" BIGINT               NOT NULL,
    "created_by"       BIGINT               NOT NULL,
    "category"         "Complaint_Category" NOT NULL DEFAULT "Complaint_Category" 'other',
    "title"            VARCHAR              NOT NULL,
    "description"      TEXT                 NOT NULL,
    "unit_number"      SMALLINT             NOT NULL,
    "status"           "Status"             NOT NULL DEFAULT "Status" 'open',
    "updated_at"       TIMESTAMP(0)                  DEFAULT now(),
    "created_at"       TIMESTAMP(0)                  DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "work_orders"
(
    "id"           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "created_by"   BIGINT          NOT NULL,
    "order_number" BIGINT          NOT NULL,
    "category"     "Work_Category" NOT NULL,
    "title"        VARCHAR         NOT NULL,
    "description"  TEXT            NOT NULL,
    "unit_number"  SMALLINT        NOT NULL,
    "status"       "Status"        NOT NULL DEFAULT "Status" 'open',
    "updated_at"   TIMESTAMP(0)             DEFAULT now(),
    "created_at"   TIMESTAMP(0)             DEFAULT now()
);

CREATE TYPE "Account_Status" AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE "Role" AS ENUM ('tenant', 'admin');
CREATE TABLE IF NOT EXISTS "users"
(
    "id"            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "clerk_id"      TEXT                           NOT NULL, -- Clerk ID's "user_2u9IV7xs5cUaYv2MsGH3pcI5hzK" cannot be converted to UUID format
    "first_name"    VARCHAR                        NOT NULL,
    "last_name"     VARCHAR                        NOT NULL,
    "email"         VARCHAR                        NOT NULL,
    "phone"         VARCHAR                        NULL,
    "image_url"     TEXT                           NULL, --Avatar picture
    "unit_number"   SMALLINT                       NULL,
    "role"          "Role"                         NOT NULL DEFAULT "Role" 'tenant',
    "status"        "Account_Status"               NOT NULL DEFAULT "Account_Status" 'active',
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
    "updated_at"       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "created_at"       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
CREATE INDEX "apartment_unit_number_index" ON "apartments" ("unit_number");

COMMENT ON COLUMN "apartments"."unit_number" IS 'describes as <building><floor><door> -> 2145';


CREATE TABLE IF NOT EXISTS "leases"
(
    "id"               BIGSERIAL PRIMARY KEY,
    "is_signed" BOOLEAN NOT NULL DEFAULT false,
    "lease_version"     BIGINT UNIQUE  NOT NULL,
    "external_doc_id"  TEXT           NOT NULL UNIQUE, -- Maps to Documenso's externalId
    "lease_pdf"   BYTEA         NOT NULL,
    "tenant_id"        BIGINT         NOT NULL REFERENCES users (id),
    "landlord_id"      BIGINT         NOT NULL REFERENCES users (id),
    "apartment_id"     BIGINT         NOT NULL ,
    "lease_start_date" DATE           NOT NULL,
    "lease_end_date"   DATE           NOT NULL,
    "rent_amount"      DECIMAL(10, 2) NOT NULL,
    "lease_status"     "Lease_Status" NOT NULL DEFAULT 'active',
    "created_by"       BIGINT         NOT NULL,
    "updated_by"       BIGINT         NOT NULL,
    "created_at"       TIMESTAMP(0)            DEFAULT now(),
    "updated_at"       TIMESTAMP(0)            DEFAULT now()

);

CREATE INDEX "lease_lease_version_index" ON "leases" ("lease_version");
CREATE INDEX "lease_apartment_id_index" ON "leases" ("apartment_id");

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
    ADD CONSTRAINT "lease_landlord_foreign" FOREIGN KEY ("landlord_id") REFERENCES "users" ("id");

-- Example insert to be used to potentially store a copy locally
-- INSERT INTO lease_templates (id, lease_template_title, lease_template_pdf)
-- VALUES (1, 'Minimal Lease Agreement', pg_read_binary_file('/files/minimalresidentialagreement.pdf'));

-- Insert statements for users with active leases
INSERT INTO users (
  id, clerk_id, first_name, last_name, email, phone, unit_number, role, status, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
  (1, 'user_grace1', 'Grace', 'Hall', 'grace.hall@example.com', '+15551234001', 218, 'tenant', 'active', NOW(), NOW()),
  (2, 'user_james1', 'James', 'Smith', 'james.smith@example.com', '+15551234002', 212, 'tenant', 'active', NOW(), NOW()),
  (3, 'user_diego1', 'Diego', 'Lewis', 'diego.lewis@example.com', '+15551234003', 466, 'tenant', 'active', NOW(), NOW()),
  (4, 'user_hector1', 'Hector', 'Wilson', 'hector.wilson@example.com', '+15551234004', 179, 'tenant', 'active', NOW(), NOW()),
  (5, 'user_charlie1', 'Charlie', 'Davis', 'charlie.davis@example.com', '+15551234005', 378, 'tenant', 'active', NOW(), NOW()),
  (6, 'user_jj1', 'JJ', 'SchraderBachar', 'jj.schrader@example.com', '+15551234006', 333, 'tenant', 'active', NOW(), NOW()),
  (7, 'user_malik1', 'Malik', 'Johnson', 'malik.johnson@example.com', '+15551234007', 299, 'tenant', 'active', NOW(), NOW()),
  (8, 'user_john1', 'John', 'Doe', 'john.doe@example.com', '+15551234008', 101, 'tenant', 'active', NOW(), NOW()),
  (9, 'user_emily1', 'Emily', 'Wildaughter', 'emily.wildaughter@example.com', '+15551234009', 310, 'tenant', 'active', NOW(), NOW()),
  (10, 'user_planter1', 'Planter', 'Lewis', 'planter.lewis@example.com', '+15551234010', 180, 'tenant', 'active', NOW(), NOW()),
  (11, 'user_unfrank1', 'Unfrank', 'Thomas', 'unfrank.thomas@example.com', '+15551234011', 222, 'tenant', 'active', NOW(), NOW()),
  (12, 'user_henry1', 'Henry', 'Clark', 'henry.clark@example.com', '+15551234012', 199, 'tenant', 'active', NOW(), NOW()),
  (13, 'user_danny1', 'Danny', 'Thompson', 'danny.thompson@example.com', '+15551234013', 205, 'tenant', 'active', NOW(), NOW()),
  (14, 'user_dennis1', 'Dennis', 'Garcia', 'dennis.garcia@example.com', '+15551234014', 299, 'tenant', 'active', NOW(), NOW()),
  (15, 'user_yoon1', 'Yoon', 'Soon', 'yoon.soon@example.com', '+15551234015', 305, 'tenant', 'active', NOW(), NOW());


-- Add a landlord record 
INSERT INTO users (
  id, clerk_id, first_name, last_name, email, phone, unit_number, role, status, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES (
  100, 'user_landlord1', 'First', 'Landlord', 'reem.mokhtar@gmail.com', '+15559876543', NULL, 'admin', 'active', NOW(), NOW()
);

-- Insert statements for apartments
INSERT INTO apartments (
  id, unit_number, price, size, management_id, availability, lease_id, updated_at, created_at
) OVERRIDING SYSTEM VALUE VALUES
  (1, 101, 2000.00, 850, 100, false, 1, NOW(), NOW()),  -- John Doe
  (2, 205, 1800.00, 800, 100, false, 2, NOW(), NOW()),  -- Danny Thompson
  (3, 212, 2223.00, 900, 100, false, 3, NOW(), NOW()),  -- James Smith
  (4, 333, 1950.00, 825, 100, false, 4, NOW(), NOW()),  -- JJ SchraderBachar
  (5, 179, 2150.00, 875, 100, false, 5, NOW(), NOW()),  -- Hector Wilson
  (6, 218, 2060.00, 850, 100, false, 6, NOW(), NOW()),  -- Grace Hall
  (7, 222, 2200.00, 925, 100, false, 7, NOW(), NOW()),  -- Unfrank Thomas
  (8, 305, 2000.00, 850, 100, false, 8, NOW(), NOW()),  -- Yoon Soon
  (9, 199, 1450.00, 750, 100, false, 9, NOW(), NOW()),  -- Henry Clark
  (10, 299, 1400.00, 700, 100, false, 10, NOW(), NOW()), -- Malik Johnson
  (11, 310, 1900.00, 825, 100, false, 11, NOW(), NOW()), -- Emily Wildaughter
  (12, 378, 1803.00, 800, 100, false, 12, NOW(), NOW()), -- Charlie Davis
  (13, 466, 1100.00, 650, 100, false, 13, NOW(), NOW()), -- Diego Lewis
  (14, 180, 1700.00, 775, 100, false, 14, NOW(), NOW()), -- Planter Lewis
  (15, 299, 1550.00, 750, 100, false, 15, NOW(), NOW()); -- Dennis Garcia
