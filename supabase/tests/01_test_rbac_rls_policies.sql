-- ====================================================================
-- Health-One: Direct RLS Verification & Security Test Suite
-- Run this in your Supabase SQL Editor to test RBAC & RLS policies
-- ====================================================================

-- STEP 1: Create mock auth users and profiles for testing
DO $$
DECLARE
  test_patient_id uuid := '11111111-1111-1111-1111-111111111111';
  test_doctor_id  uuid := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Insert into auth.users first to satisfy foreign key (profiles -> auth.users)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES 
    (test_patient_id, '00000000-0000-0000-0000-000000000000', 'patient_alpha@test.local', '$2a$10$dummyhash', NOW(), '{"provider":"email","providers":["email"]}', '{"role":"patient","name":"Test Patient Alpha"}', NOW(), NOW(), 'authenticated', 'authenticated'),
    (test_doctor_id, '00000000-0000-0000-0000-000000000000', 'doctor_bravo@test.local', '$2a$10$dummyhash', NOW(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Test Doctor Bravo"}', NOW(), NOW(), 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- Insert profiles (or handle via signup trigger)
  INSERT INTO public.profiles (id, role, name, email)
  VALUES 
    (test_patient_id, 'patient', 'Test Patient Alpha', 'patient_alpha@test.local'),
    (test_doctor_id, 'doctor', 'Test Doctor Bravo', 'doctor_bravo@test.local')
  ON CONFLICT (id) DO NOTHING;

  -- Insert mock doctor credential record
  INSERT INTO public.doctors (id, medical_license_id, specialty)
  VALUES (test_doctor_id, 'TEST-MD-999', 'Internal Medicine')
  ON CONFLICT (id) DO NOTHING;

  -- Insert confidential patient record
  INSERT INTO public.records (id, patient_id, record_type, title, description)
  VALUES ('33333333-3333-3333-3333-333333333333', test_patient_id, 'consultation', 'Confidential Cardiology Assessment', 'Patient exhibits hypertension.')
  ON CONFLICT (id) DO NOTHING;

  -- Insert confidential patient medication
  INSERT INTO public.medications (id, patient_id, name, dosage, frequency, source)
  VALUES ('44444444-4444-4444-4444-444444444444', test_patient_id, 'Lisinopril', '10mg', 'Once daily', 'patient_added')
  ON CONFLICT (id) DO NOTHING;
END $$;


-- ====================================================================
-- TEST SCENARIO A: Unauthorized Doctor Access (No Grant, No Emergency Log)
-- ====================================================================
-- Simulate Doctor requesting records without patient permission
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

SELECT id, title, record_type FROM public.records 
WHERE patient_id = '11111111-1111-1111-1111-111111111111';
-- EXPECTED OUTPUT: 0 rows returned (RLS BLOCKED DIRECT READ)

SELECT id, name, dosage FROM public.medications 
WHERE patient_id = '11111111-1111-1111-1111-111111111111';
-- EXPECTED OUTPUT: 0 rows returned (RLS BLOCKED DIRECT READ)

RESET ROLE;


-- ====================================================================
-- TEST SCENARIO B: Authorized Access via Patient Access Grant
-- ====================================================================
-- Patient grants Doctor access in access_grants table
INSERT INTO public.access_grants (patient_id, doctor_id, scope)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'full')
ON CONFLICT (patient_id, doctor_id) DO UPDATE SET expires_at = NULL;

-- Now simulate Doctor reading records again
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

SELECT id, title, record_type FROM public.records 
WHERE patient_id = '11111111-1111-1111-1111-111111111111';
-- EXPECTED OUTPUT: 1 row returned ('Confidential Cardiology Assessment')

SELECT id, name, dosage FROM public.medications 
WHERE patient_id = '11111111-1111-1111-1111-111111111111';
-- EXPECTED OUTPUT: 1 row returned ('Lisinopril 10mg')

RESET ROLE;


-- ====================================================================
-- TEST SCENARIO C: Revoked / Expired Access Grant
-- ====================================================================
-- Expire the grant
UPDATE public.access_grants 
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE patient_id = '11111111-1111-1111-1111-111111111111'
AND doctor_id = '22222222-2222-2222-2222-222222222222';

-- Simulate Doctor reading records with expired grant
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

SELECT id, title FROM public.records 
WHERE patient_id = '11111111-1111-1111-1111-111111111111';
-- EXPECTED OUTPUT: 0 rows returned (RLS BLOCKED DUE TO EXPIRATION)

RESET ROLE;


-- ====================================================================
-- TEST SCENARIO D: Verified Emergency Access Override Path
-- ====================================================================
-- Doctor logs emergency access override
INSERT INTO public.emergency_access_log (patient_id, accessed_by, access_reason)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Emergency Trauma Room Assessment');

-- Simulate Doctor reading records via Emergency Override
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';

SELECT id, title FROM public.records 
WHERE patient_id = '11111111-1111-1111-1111-111111111111';
-- EXPECTED OUTPUT: 1 row returned (EMERGENCY OVERRIDE GRANTED FOR 24 HOURS)

RESET ROLE;

-- Cleanup test fixtures
DELETE FROM public.emergency_access_log WHERE patient_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.access_grants WHERE patient_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.medications WHERE patient_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.records WHERE patient_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM public.doctors WHERE id = '22222222-2222-2222-2222-222222222222';
DELETE FROM public.profiles WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM auth.users WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
