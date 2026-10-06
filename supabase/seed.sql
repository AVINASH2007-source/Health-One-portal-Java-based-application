-- ==============================================================================
-- Health-One: Master Seed Data (seed.sql)
-- Single script to populate all sample/demo data in your Supabase database
-- Run this in the Supabase SQL Editor after running schema.sql
-- ==============================================================================

do $$
declare
  target_patient_id uuid;
  target_doctor_id  uuid;
begin
  -- 1. Identify or fallback to test patient ID
  select id into target_patient_id 
  from public.profiles 
  where role = 'patient' 
  order by created_at desc 
  limit 1;

  if target_patient_id is null then
    select id into target_patient_id from auth.users limit 1;
  end if;

  if target_patient_id is null then
    target_patient_id := '00000000-0000-0000-0000-000000000001'::uuid;
  end if;

  -- 2. Identify or fallback to test doctor ID
  select id into target_doctor_id 
  from public.profiles 
  where role = 'doctor' 
  order by created_at desc 
  limit 1;

  if target_doctor_id is null then
    target_doctor_id := '00000000-0000-0000-0000-000000000002'::uuid;
  end if;

  -- ============================================================================
  -- 1. Seed Vitals (7-day trend + daily vitals)
  -- ============================================================================
  delete from public.vitals where patient_id = target_patient_id;
  insert into public.vitals (patient_id, recorded_at, heart_rate, spo2, bp_systolic, bp_diastolic, sleep_minutes, steps)
  values
    (target_patient_id, now() - interval '6 days', 72, 98, 118, 78, 450, 8420),
    (target_patient_id, now() - interval '5 days', 74, 99, 121, 80, 420, 9150),
    (target_patient_id, now() - interval '4 days', 70, 97, 117, 76, 480, 7600),
    (target_patient_id, now() - interval '3 days', 75, 98, 123, 82, 390, 10200),
    (target_patient_id, now() - interval '2 days', 71, 99, 119, 77, 460, 8900),
    (target_patient_id, now() - interval '1 days', 69, 98, 116, 75, 490, 9450),
    (target_patient_id, now(),                      72, 98, 120, 79, 465, 8800)
  on conflict do nothing;

  -- ============================================================================
  -- 2. Seed Active Medications
  -- ============================================================================
  delete from public.medications where patient_id = target_patient_id;
  insert into public.medications (patient_id, name, dose, frequency, dosage, next_dose_at, active, source, status)
  values
    (target_patient_id, 'Amoxicillin', '500mg', 'Twice daily', '500mg', now() + interval '4 hours', true, 'doctor_prescribed', 'confirmed'),
    (target_patient_id, 'Lisinopril', '10mg', 'Once daily (Morning)', '10mg', now() + interval '18 hours', true, 'doctor_prescribed', 'confirmed'),
    (target_patient_id, 'Vitamin D3', '2000 IU', 'Once daily', '2000 IU', now() + interval '12 hours', true, 'patient_added', 'confirmed'),
    (target_patient_id, 'Metformin', '500mg', 'With meals', '500mg', now() + interval '2 hours', true, 'doctor_prescribed', 'confirmed')
  on conflict do nothing;

  -- ============================================================================
  -- 3. Seed Appointments
  -- ============================================================================
  delete from public.appointments where patient_id = target_patient_id;
  insert into public.appointments (patient_id, doctor_id, doctor_name, specialization, hospital_name, time, reason, status)
  values
    (target_patient_id, target_doctor_id, 'Dr. Sarah Jenkins', 'Cardiology', 'Metro Health Medical Center', now() + interval '2 days', 'Routine BP & Heart Follow-up', 'upcoming'),
    (target_patient_id, target_doctor_id, 'Dr. Marcus Vance', 'General Medicine', 'St. Jude Community Hospital', now() + interval '5 days', 'Annual Physical Exam', 'upcoming'),
    (target_patient_id, target_doctor_id, 'Dr. Elena Rostova', 'Dermatology', 'City Wellness Clinic', now() + interval '12 days', 'Skin Check & Consultation', 'upcoming')
  on conflict do nothing;

  -- ============================================================================
  -- 4. Seed Clinical Visits
  -- ============================================================================
  delete from public.visits where patient_id = target_patient_id;
  insert into public.visits (patient_id, hospital_name, doctor_name, department, visit_date, symptoms, diagnosis, treatment, notes)
  values
    (target_patient_id, 'Metro Health Medical Center', 'Dr. Sarah Jenkins', 'Cardiology', current_date - interval '14 days', 'Mild chest tightness', 'Primary Hypertension (Controlled)', 'Prescribed Lisinopril 10mg', 'BP responding well to medication'),
    (target_patient_id, 'St. Jude Community Hospital', 'Dr. Marcus Vance', 'General Practice', current_date - interval '45 days', 'Persistent cough', 'Acute Bronchitis', 'Course of Amoxicillin', 'Cleared after 7 days'),
    (target_patient_id, 'City Wellness Clinic', 'Dr. Allen Poe', 'Orthopedics', current_date - interval '90 days', 'Left knee strain', 'Mild Ligament Sprain', 'Rest and physical therapy', 'Full recovery achieved')
  on conflict do nothing;

  -- ============================================================================
  -- 5. Seed Prescriptions
  -- ============================================================================
  delete from public.prescriptions where patient_id = target_patient_id;
  insert into public.prescriptions (patient_id, medicine_name, dosage, frequency, duration, doctor_name, start_date, end_date, status)
  values
    (target_patient_id, 'Amoxicillin', '500mg', '2x per day', '7 days', 'Dr. Marcus Vance', current_date - interval '14 days', current_date - interval '7 days', 'completed'),
    (target_patient_id, 'Lisinopril', '10mg', '1x per day', '90 days', 'Dr. Sarah Jenkins', current_date - interval '30 days', current_date + interval '60 days', 'active'),
    (target_patient_id, 'Ibuprofen', '400mg', 'As needed', '5 days', 'Dr. Allen Poe', current_date - interval '90 days', current_date - interval '85 days', 'completed')
  on conflict do nothing;

  -- ============================================================================
  -- 6. Seed Lab Reports
  -- ============================================================================
  delete from public.lab_reports where patient_id = target_patient_id;
  insert into public.lab_reports (patient_id, report_type, lab_name, report_date, result_summary)
  values
    (target_patient_id, 'Comprehensive Blood Panel', 'Quest Diagnostics', current_date - interval '10 days', 'CBC normal, HbA1c 5.4%, Lipid panel optimal'),
    (target_patient_id, 'Lumbar Spine MRI', 'Apex Radiology Center', current_date - interval '60 days', 'Mild L4-L5 disc bulge, no nerve impingement'),
    (target_patient_id, 'Thyroid Function Test (TSH)', 'LabCorp Medical', current_date - interval '120 days', 'TSH 2.1 mIU/L within normal limits'),
    (target_patient_id, 'Chest X-Ray', 'City Diagnostic Imaging', current_date - interval '180 days', 'Clear lung fields, heart size normal')
  on conflict do nothing;

  -- ============================================================================
  -- 7. Seed Vaccinations
  -- ============================================================================
  delete from public.vaccinations where patient_id = target_patient_id;
  insert into public.vaccinations (patient_id, vaccine_name, dose_number, administered_date, administered_at)
  values
    (target_patient_id, 'COVID-19 Bivalent Booster', 4, current_date - interval '30 days', 'Walgreens Pharmacy #4102'),
    (target_patient_id, 'Annual Influenza Vaccine', 1, current_date - interval '200 days', 'CVS MinuteClinic'),
    (target_patient_id, 'Tdap (Tetanus, Diphtheria, Pertussis)', 1, current_date - interval '500 days', 'Metro Health Health Center'),
    (target_patient_id, 'Hepatitis B Booster', 3, current_date - interval '900 days', 'University Student Health Center')
  on conflict do nothing;

  -- ============================================================================
  -- 8. Seed Surgeries
  -- ============================================================================
  delete from public.surgeries where patient_id = target_patient_id;
  insert into public.surgeries (patient_id, surgery_type, hospital_name, surgeon, surgery_date, notes)
  values
    (target_patient_id, 'Laparoscopic Appendectomy', 'St. Jude Community Hospital', 'Dr. Robert Chen', current_date - interval '365 days', 'Uncomplicated procedure, full recovery'),
    (target_patient_id, 'Wisdom Teeth Extraction', 'Dental Surgery Associates', 'Dr. Maria Santos', current_date - interval '730 days', 'All four impacted molars removed under sedation')
  on conflict do nothing;

  -- ============================================================================
  -- 9. Seed Allergies
  -- ============================================================================
  delete from public.allergies where patient_id = target_patient_id;
  insert into public.allergies (patient_id, allergen, category, severity, reaction_notes)
  values
    (target_patient_id, 'Penicillin', 'drug', 'severe', 'Anaphylaxis risk. Causes severe hives and facial swelling.'),
    (target_patient_id, 'Peanuts & Tree Nuts', 'food', 'moderate', 'Causes gastrointestinal distress and localized rash.'),
    (target_patient_id, 'Latex', 'environmental', 'mild', 'Contact dermatitis / skin redness on exposure.'),
    (target_patient_id, 'Sulfa Drugs', 'drug', 'moderate', 'Causes widespread skin eruption and fever.')
  on conflict do nothing;

  -- ============================================================================
  -- 10. Seed Diseases / Chronic Conditions
  -- ============================================================================
  delete from public.diseases where patient_id = target_patient_id;
  insert into public.diseases (patient_id, condition_name, diagnosed_date, status, notes)
  values
    (target_patient_id, 'Primary Hypertension', current_date - interval '730 days', 'active', 'Managed with daily Lisinopril 10mg. Regular BP tracking.'),
    (target_patient_id, 'Type 2 Diabetes Mellitus', current_date - interval '365 days', 'managed', 'Controlled with diet and exercise. HbA1c currently 5.4%.'),
    (target_patient_id, 'Acute Bronchitis', current_date - interval '90 days', 'resolved', 'Full resolution following 7-day antibiotic course.'),
    (target_patient_id, 'Seasonal Allergic Rhinitis', current_date - interval '1095 days', 'active', 'Flares up during spring pollen season.')
  on conflict do nothing;

  -- ============================================================================
  -- 11. Seed Emergency Profile & Emergency Cards
  -- ============================================================================
  delete from public.emergency_profile where patient_id = target_patient_id;
  insert into public.emergency_profile (patient_id, blood_group, emergency_contact_name, emergency_contact_phone, emergency_code)
  values (
    target_patient_id,
    'O+',
    'Sarah Johnson (Spouse)',
    '+1 (555) 019-2834',
    'e8c4b2a1'
  )
  on conflict (patient_id) do update set
    blood_group = excluded.blood_group,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_phone = excluded.emergency_contact_phone,
    emergency_code = excluded.emergency_code;

  insert into public.emergency_cards (patient_id, blood_type, allergies, conditions, emergency_contact_name, emergency_contact_phone)
  values (
    target_patient_id,
    'O+',
    array['Penicillin', 'Peanuts & Tree Nuts'],
    array['Primary Hypertension', 'Type 2 Diabetes'],
    'Sarah Johnson (Spouse)',
    '+1 (555) 019-2834'
  )
  on conflict (patient_id) do update set
    blood_type = excluded.blood_type,
    allergies = excluded.allergies,
    conditions = excluded.conditions,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_phone = excluded.emergency_contact_phone;

  -- ============================================================================
  -- 12. Seed Emergency Access Logs
  -- ============================================================================
  delete from public.emergency_access_log where patient_id = target_patient_id;
  insert into public.emergency_access_log (patient_id, accessed_by, access_reason, created_at)
  values
    (target_patient_id, target_doctor_id, 'ER Trauma Bay 2 Triage Scan', now() - interval '3 hours'),
    (target_patient_id, target_doctor_id, 'Emergency Medical Services Transport (QR Scan)', now() - interval '2 days'),
    (target_patient_id, target_doctor_id, 'Urgent Care Code Verification (Code: e8c4b2a1)', now() - interval '5 days'),
    (target_patient_id, target_doctor_id, 'Public First Responder QR Lookup', now() - interval '12 days')
  on conflict do nothing;

  -- ============================================================================
  -- 13. Seed Patient Uploaded Records
  -- ============================================================================
  delete from public.records where patient_id = target_patient_id and record_type = 'patient_upload';
  insert into public.records (patient_id, uploaded_by, record_type, title, description, occurred_at)
  values
    (target_patient_id, target_patient_id, 'patient_upload', 'Complete Blood Count (CBC) Report', 'Routine blood panel from City Diagnostics', now() - interval '5 days'),
    (target_patient_id, target_patient_id, 'patient_upload', 'Chest X-Ray Scan', 'Follow-up radiograph report', now() - interval '14 days'),
    (target_patient_id, target_patient_id, 'patient_upload', 'Hospital Discharge Summary', 'Annual checkup summary and clinical recommendations', now() - interval '30 days')
  on conflict do nothing;

  -- ============================================================================
  -- 14. Seed Doctor-Patient Access Grant
  -- ============================================================================
  insert into public.access_grants (patient_id, doctor_id, scope, granted_at)
  values (target_patient_id, target_doctor_id, 'full', now())
  on conflict (patient_id, doctor_id) do nothing;

end $$;
