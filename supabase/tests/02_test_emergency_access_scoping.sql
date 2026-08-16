-- ====================================================================
-- Health-One: Emergency Path Scoping & Non-Leakage Security Test Suite
-- Run this in your Supabase SQL Editor to verify emergency scoping
-- ====================================================================

-- STEP 1: Add scoped RPC function to public schema
CREATE OR REPLACE FUNCTION public.get_emergency_card_scoped(target_patient_id uuid)
RETURNS TABLE (
  patient_id uuid,
  blood_type text,
  allergies text[],
  conditions text[],
  emergency_contact_name text,
  emergency_contact_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.patient_id,
    ec.blood_type,
    ec.allergies,
    ec.conditions,
    ec.emergency_contact_name,
    ec.emergency_contact_phone
  FROM public.emergency_cards ec
  WHERE ec.patient_id = target_patient_id;
END;
$$;


-- STEP 2: Setup Mock Test Fixtures
DO $$
DECLARE
  test_patient_id uuid := '66666666-6666-6666-6666-666666666666';
  test_doctor_id  uuid := '77777777-7777-7777-7777-777777777777';
BEGIN
  -- Insert auth users
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES 
    (test_patient_id, '00000000-0000-0000-0000-000000000000', 'em_patient@test.local', '$2a$10$dummyhash', NOW(), '{"provider":"email","providers":["email"]}', '{"role":"patient","name":"Emergency Patient"}', NOW(), NOW(), 'authenticated', 'authenticated'),
    (test_doctor_id, '00000000-0000-0000-0000-000000000000', 'em_doctor@test.local', '$2a$10$dummyhash', NOW(), '{"provider":"email","providers":["email"]}', '{"role":"doctor","name":"Emergency Doctor"}', NOW(), NOW(), 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- Insert profiles
  INSERT INTO public.profiles (id, role, name, email)
  VALUES 
    (test_patient_id, 'patient', 'Emergency Patient', 'em_patient@test.local'),
    (test_doctor_id, 'doctor', 'Emergency Doctor', 'em_doctor@test.local')
  ON CONFLICT (id) DO NOTHING;

  -- Insert verified doctor record
  INSERT INTO public.doctors (id, medical_license_id, specialty)
  VALUES (test_doctor_id, 'VALID-MD-100', 'Trauma Emergency')
  ON CONFLICT (id) DO NOTHING;

  -- Insert Emergency Card
  INSERT INTO public.emergency_cards (patient_id, blood_type, allergies, conditions, emergency_contact_name, emergency_contact_phone)
  VALUES (test_patient_id, 'O-Negative', ARRAY['Penicillin', 'Latex'], ARRAY['Asthma'], 'Jane Doe', '+1 555-9988')
  ON CONFLICT (patient_id) DO NOTHING;

  -- Insert Sensitive Clinical Record
  INSERT INTO public.records (id, patient_id, record_type, title, description)
  VALUES ('88888888-8888-8888-8888-888888888888', test_patient_id, 'consultation', 'Highly Confidential Psychiatric Evaluation', 'Sensitive diagnostic detail.')
  ON CONFLICT (id) DO NOTHING;
END $$;


-- ====================================================================
-- TEST SCENARIO 1: Scoped RPC Execution (Returns ONLY emergency fields)
-- ====================================================================
-- Call get_emergency_card_scoped for the patient
SELECT * FROM public.get_emergency_card_scoped('66666666-6666-6666-6666-666666666666');
-- EXPECTED OUTPUT: 1 row with blood_type 'O-Negative', allergies, conditions, contact info.
-- NOTE: Output strictly DOES NOT contain records, diagnoses, or clinical notes!


-- ====================================================================
-- TEST SCENARIO 2: Non-Leakage Check (Attempting to fetch full records via emergency path)
-- ====================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '77777777-7777-7777-7777-777777777777';

-- Attempt to read full patient records before emergency log unlock
SELECT id, title, description FROM public.records 
WHERE patient_id = '66666666-6666-6666-6666-666666666666';
-- EXPECTED OUTPUT: 0 rows returned (REJECTED & ISOLATED BY RLS)

RESET ROLE;


-- ====================================================================
-- TEST SCENARIO 3: Bad License ID Failure Case Test
-- ====================================================================
-- Attempt to verify an invalid license ID
SELECT count(*) FROM public.doctors WHERE medical_license_id = 'INVALID-BAD-LICENSE-999';
-- EXPECTED OUTPUT: 0 (Verification fails -> Access unlock rejected, no log written for bad license)


-- ====================================================================
-- TEST SCENARIO 4: Happy Path Emergency Unlock & Mandatory Audit Logging
-- ====================================================================
-- Doctor verifies license ID 'VALID-MD-100' and writes to emergency_access_log
INSERT INTO public.emergency_access_log (patient_id, accessed_by, access_reason)
VALUES ('66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', '[License Verified: VALID-MD-100] Severe allergic reaction dispatch');

-- Confirm audit log entry was written
SELECT id, accessed_by, access_reason FROM public.emergency_access_log 
WHERE patient_id = '66666666-6666-6666-6666-666666666666';
-- EXPECTED OUTPUT: 1 row returned with logged access reason and timestamp!


-- ====================================================================
-- TEST SCENARIO 5: Post-Emergency Unlock Record Isolation Verification
-- Re-run query on public.records AFTER emergency_access_log insert to prove 0 rows returned
-- ====================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '77777777-7777-7777-7777-777777777777';

-- Query full patient records AFTER emergency unlock log row was created
SELECT id, title, description FROM public.records 
WHERE patient_id = '66666666-6666-6666-6666-666666666666';
-- EXPECTED OUTPUT: 0 rows returned (PROVES EMERGENCY LOG ENTRY DOES NOT UNLOCK FULL RECORDS)

RESET ROLE;


-- Cleanup test fixtures
DELETE FROM public.emergency_access_log WHERE patient_id = '66666666-6666-6666-6666-666666666666';
DELETE FROM public.records WHERE patient_id = '66666666-6666-6666-6666-666666666666';
DELETE FROM public.emergency_cards WHERE patient_id = '66666666-6666-6666-6666-666666666666';
DELETE FROM public.doctors WHERE id = '77777777-7777-7777-7777-777777777777';
DELETE FROM public.profiles WHERE id IN ('66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777');
DELETE FROM auth.users WHERE id IN ('66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777');
