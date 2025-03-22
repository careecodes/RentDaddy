-- This SQL script creates test data to verify the lease lifecycle status updates
-- Run this before testing the cron job to have leases in different states

-- Clear previous test data (if needed)
DELETE FROM leases WHERE id >= 900;

-- Insert test leases with various status scenarios
INSERT INTO leases (
  id, lease_number, external_doc_id, lease_pdf_s3, tenant_id, landlord_id, apartment_id, 
  lease_start_date, lease_end_date, rent_amount, status, created_by, updated_by, created_at, updated_at
) VALUES
-- Lease ending today (should be marked as expired)
(900, 1, 'doc_test_900', 's3_bucket_url', 2, 100, 10, 
 CURRENT_DATE - INTERVAL '1 year', CURRENT_DATE, 1500.00, 
 'active', 100, 100, NOW(), NOW()),

-- Lease ending in 5 days (should be marked as expires_soon)
(901, 1, 'doc_test_901', 's3_bucket_url', 3, 100, 11, 
 CURRENT_DATE - INTERVAL '355 days', CURRENT_DATE + INTERVAL '5 days', 1750.00, 
 'active', 100, 100, NOW(), NOW()),

-- Lease ending in 30 days (should be marked as expires_soon)
(902, 1, 'doc_test_902', 's3_bucket_url', 4, 100, 12, 
 CURRENT_DATE - INTERVAL '335 days', CURRENT_DATE + INTERVAL '30 days', 2200.00, 
 'active', 100, 100, NOW(), NOW()),

-- Lease ending in 59 days (should be marked as expires_soon)
(903, 1, 'doc_test_903', 's3_bucket_url', 5, 100, 13, 
 CURRENT_DATE - INTERVAL '306 days', CURRENT_DATE + INTERVAL '59 days', 2300.00, 
 'active', 100, 100, NOW(), NOW()),

-- Lease ending in 60 days (should be marked as expires_soon)
(904, 1, 'doc_test_904', 's3_bucket_url', 6, 100, 14, 
 CURRENT_DATE - INTERVAL '305 days', CURRENT_DATE + INTERVAL '60 days', 2800.00, 
 'active', 100, 100, NOW(), NOW()),

-- Lease ending in 61 days (should remain active)
(905, 1, 'doc_test_905', 's3_bucket_url', 7, 100, 15, 
 CURRENT_DATE - INTERVAL '304 days', CURRENT_DATE + INTERVAL '61 days', 2950.00, 
 'active', 100, 100, NOW(), NOW()),

-- Lease ending yesterday (should be marked as expired)
(906, 1, 'doc_test_906', 's3_bucket_url', 8, 100, 16, 
 CURRENT_DATE - INTERVAL '366 days', CURRENT_DATE - INTERVAL '1 day', 2100.00, 
 'active', 100, 100, NOW(), NOW()),

-- Lease that's already expired (should remain expired)
(907, 1, 'doc_test_907', 's3_bucket_url', 9, 100, 17, 
 CURRENT_DATE - INTERVAL '2 years', CURRENT_DATE - INTERVAL '1 year', 1850.00, 
 'expired', 100, 100, NOW(), NOW()),

-- Lease that's already marked expires_soon but actually expired (should be marked expired)
(908, 1, 'doc_test_908', 's3_bucket_url', 10, 100, 18, 
 CURRENT_DATE - INTERVAL '366 days', CURRENT_DATE - INTERVAL '1 day', 1950.00, 
 'expires_soon', 100, 100, NOW(), NOW()),

-- Special statuses that should not be changed
(909, 1, 'doc_test_909', 's3_bucket_url', 11, 100, 10, 
 CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '364 days', 1500.00, 
 'terminated', 100, 100, NOW(), NOW()),

(910, 1, 'doc_test_910', 's3_bucket_url', 12, 100, 11, 
 CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', 1750.00, 
 'draft', 100, 100, NOW(), NOW()),

(911, 1, 'doc_test_911', 's3_bucket_url', 13, 100, 12, 
 CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', 2200.00, 
 'pending_tenant_approval', 100, 100, NOW(), NOW()),

(912, 1, 'doc_test_912', 's3_bucket_url', 14, 100, 13, 
 CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', 2300.00, 
 'pending_landlord_approval', 100, 100, NOW(), NOW());

-- Print summary of test data
SELECT id, status, 
       lease_start_date, 
       lease_end_date, 
       CASE 
           WHEN lease_end_date < CURRENT_DATE THEN 'EXPIRED'
           WHEN lease_end_date - CURRENT_DATE <= 60 THEN 'EXPIRES_SOON'
           ELSE 'ACTIVE'
       END AS expected_status
FROM leases 
WHERE id >= 900
ORDER BY id;