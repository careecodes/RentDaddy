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
    'pending_tenant_approval',
    'pending_landlord_approval',
    'pending_tenant_approval',
    'pending_landlord_approval',
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
    "lease_id"         BIGINT                        ,
    "lease_id"         BIGINT                        ,
    "updated_at"       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "created_at"       TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL
);
CREATE INDEX "apartment_unit_number_index" ON "apartments" ("unit_number");

COMMENT ON COLUMN "apartments"."unit_number" IS 'describes as <building><floor><door> -> 2145';


CREATE TABLE IF NOT EXISTS "leases"
(
    "id"               BIGSERIAL PRIMARY KEY,
    "lease_number"     BIGINT  NOT NULL,
    "external_doc_id"  TEXT           NOT NULL UNIQUE, -- Maps to Documenso's externalId
    "lease_pdf"        BYTEA         NOT NULL,
    "lease_pdf"        BYTEA         NOT NULL,
    "tenant_id"        BIGINT         NOT NULL REFERENCES users (id),
    "landlord_id"      BIGINT         NOT NULL REFERENCES users (id),
    "apartment_id"     BIGINT         NOT NULL ,
    "lease_start_date" DATE           NOT NULL,
    "lease_end_date"   DATE           NOT NULL,
    "rent_amount"      DECIMAL(10, 2) NOT NULL,
    "status"            "Lease_Status" NOT NULL DEFAULT 'active',
    "status"            "Lease_Status" NOT NULL DEFAULT 'active',
    "created_by"       BIGINT         NOT NULL,
    "updated_by"       BIGINT         NOT NULL,
    "created_at"       TIMESTAMP(0)            DEFAULT now(),
    "updated_at"       TIMESTAMP(0)            DEFAULT now(),
    "previous_lease_id" BIGINT REFERENCES leases(id)
    "updated_at"       TIMESTAMP(0)            DEFAULT now(),
    "previous_lease_id" BIGINT REFERENCES leases(id)

);

CREATE INDEX "lease_lease_number_index" ON "leases" ("lease_number");
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


-- Add a landlord record 
INSERT INTO users (
  id, clerk_id, first_name, last_name, email, phone, unit_number, role, status, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES (
  100, 'user_2u69YK0HAf07yrNmOd1rpjNmyEr', 'First', 'Landlord', 'wrldconnect1@gmail.com', '+15559876543', NULL, 'admin', 'active', NOW(), NOW()
);


-- Insert statements for users with active leases
INSERT INTO users (
  id, clerk_id, first_name, last_name, email, phone, unit_number, role, status, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
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


-- Insert statements for users with future leases
INSERT INTO users (
  id, clerk_id, first_name, last_name, email, phone, unit_number, role, status, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
  (1, 'user_grace1', 'Grace', 'Hall', 'reem@reemock.com', '+15551234001', 218, 'tenant', 'active', NOW(), NOW()),
  (16, 'user_samantha1', 'Samantha', 'Green', 'samantha.green@example.com', '+15551234016', 410, 'tenant', 'active', NOW(), NOW()),
  (17, 'user_liam1', 'Liam', 'Carter', 'liam.carter@example.com', '+15551234017', 509, 'tenant', 'active', NOW(), NOW()),
  (18, 'user_evelyn1', 'Evelyn', 'Adams', 'evelyn.adams@example.com', '+15551234018', 601, 'tenant', 'active', NOW(), NOW());



-- Insert statements for available apartments 
INSERT INTO apartments (
 id, unit_number, price, size, management_id, availability, lease_id, updated_at, created_at
) OVERRIDING SYSTEM VALUE VALUES
(10, 101, 1500.00, 650, 100, true, NULL, NOW(), NOW()),
(11, 102, 1750.00, 750, 100, true, NULL, NOW(), NOW()),
(12, 201, 2200.00, 950, 100, true, NULL, NOW(), NOW()),
(13, 202, 2300.00, 1000, 100, true, NULL, NOW(), NOW()),
(14, 301, 2800.00, 1200, 100, true, NULL, NOW(), NOW()),
(15, 302, 2950.00, 1250, 100, true, NULL, NOW(), NOW());

-- Insert statements for unavailable apartments 
INSERT INTO apartments (
  id, unit_number, price, size, management_id, availability, lease_id, updated_at, created_at
) OVERRIDING SYSTEM VALUE VALUES
  (16, 410, 2100.00, 880, 100, false, NULL, NOW(), NOW()),  -- Samantha Green
  (17, 509, 1850.00, 800, 100, false, NULL, NOW(), NOW()),  -- Liam Carter
  (18, 601, 1950.00, 850, 100, false, NULL, NOW(), NOW());  -- Evelyn Adams


-- Insert statements for leases starting after 10 days
INSERT INTO leases (
  id, lease_number, external_doc_id, lease_pdf, tenant_id, landlord_id, apartment_id, 
  lease_start_date, lease_end_date, rent_amount, status, created_by, updated_by, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
  (16, 1, 'doc_lease_16', decode('','hex'), 16, 100, 16, '2025-03-30', '2026-03-30', 2100.00, 'draft', 100, 100, NOW(), NOW()),
  (17, 1, 'doc_lease_17', decode('','hex'), 17, 100, 17, '2025-04-05', '2026-04-05', 1850.00, 'draft', 100, 100, NOW(), NOW()),
  (18, 1, 'doc_lease_18', decode('','hex'), 18, 100, 18, '2025-04-10', '2026-04-10', 1950.00, 'draft', 100, 100, NOW(), NOW());


-- Looping test cases over apartments and tenants with rotating test emails

-- Apartments 10-12: leases ending today (for termination testing)
INSERT INTO leases (id, lease_number, external_doc_id, lease_pdf, tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount, status, created_by, updated_by, created_at, updated_at)
VALUES
-- Lease ending today
(100, 1, 'doc_100', decode('', 'hex'), 2, 100, 10, CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE, 1500.00, 'active', 100, 100, NOW(), NOW()),
(101, 1, 'doc_101', decode('', 'hex'), 3, 100, 11, CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE, 1750.00, 'active', 100, 100, NOW(), NOW()),
(102, 1, 'doc_102', decode('', 'hex'), 4, 100, 12, CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE, 2200.00, 'active', 100, 100, NOW(), NOW());

-- Apartments 13–15: expired leases (for renewal testing)
INSERT INTO leases (id, lease_number, external_doc_id, lease_pdf, tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount, status, created_by, updated_by, created_at, updated_at)
VALUES
(103, 1, 'doc_103', decode('', 'hex'), 5, 100, 13, CURRENT_DATE - INTERVAL '2 year', CURRENT_DATE - INTERVAL '1 year', 2300.00, 'expired', 100, 100, NOW(), NOW()),
(104, 1, 'doc_104', decode('', 'hex'), 6, 100, 14, CURRENT_DATE - INTERVAL '2 year', CURRENT_DATE - INTERVAL '1 year', 2800.00, 'expired', 100, 100, NOW(), NOW()),
(105, 1, 'doc_105', decode('', 'hex'), 7, 100, 15, CURRENT_DATE - INTERVAL '2 year', CURRENT_DATE - INTERVAL '1 year', 2950.00, 'expired', 100, 100, NOW(), NOW());

-- Apartments 16–18: future leases (for creation success test)
INSERT INTO leases (id, lease_number, external_doc_id, lease_pdf, tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount, status, created_by, updated_by, created_at, updated_at)
VALUES
(106, 1, 'doc_106', decode('', 'hex'), 8, 100, 16, CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '1 year', 2100.00, 'pending_tenant_approval', 100, 100, NOW(), NOW()),
(107, 1, 'doc_107', decode('', 'hex'), 9, 100, 17, CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '1 year', 1850.00, 'pending_tenant_approval', 100, 100, NOW(), NOW()),
(108, 1, 'doc_108', decode('', 'hex'), 10, 100, 18, CURRENT_DATE + INTERVAL '20 days', CURRENT_DATE + INTERVAL '1 year', 1950.00, 'pending_tenant_approval', 100, 100, NOW(), NOW());
