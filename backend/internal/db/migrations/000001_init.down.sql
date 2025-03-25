-- Dependents
DROP TABLE IF EXISTS "lease_tenants";
DROP TABLE IF EXISTS "apartment_tenants";
-- FKs
ALTER TABLE "leases" DROP CONSTRAINT IF EXISTS "lease_landlord_foreign";
ALTER TABLE "work_orders" DROP CONSTRAINT IF EXISTS "workorder_created_by_foreign";
ALTER TABLE "leases" DROP CONSTRAINT IF EXISTS "lease_updated_by_foreign";
ALTER TABLE "leases" DROP CONSTRAINT IF EXISTS "lease_apartment_id_foreign";
ALTER TABLE "complaints" DROP CONSTRAINT IF EXISTS "complaint_created_by_foreign";
ALTER TABLE "leases" DROP CONSTRAINT IF EXISTS "lease_created_by_foreign";
ALTER TABLE "apartments" DROP CONSTRAINT IF EXISTS "apartment_management_id_foreign";
ALTER TABLE "parking_permits" DROP CONSTRAINT IF EXISTS "parkingpermit_created_by_foreign";
ALTER TABLE "lockers" DROP CONSTRAINT IF EXISTS "user_id_foreign";
-- Tables
DROP TABLE IF EXISTS "leases";
DROP TABLE IF EXISTS "apartments";
DROP TABLE IF EXISTS "parking_permits";
DROP TABLE IF EXISTS "users";
DROP TABLE IF EXISTS "work_orders";
DROP TABLE IF EXISTS "complaints";
DROP TABLE IF EXISTS "lockers";
-- ENUMS
DROP TYPE IF EXISTS "Compliance_Status";
DROP TYPE IF EXISTS "Lease_Status";
DROP TYPE IF EXISTS "Type";
DROP TYPE IF EXISTS "Account_Status";
DROP TYPE IF EXISTS "Role";
DROP TYPE IF EXISTS "Work_Category";
DROP TYPE IF EXISTS "Status";
DROP TYPE IF EXISTS "Complaint_Category";
