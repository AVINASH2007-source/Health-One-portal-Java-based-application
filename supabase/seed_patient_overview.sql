-- Health-One: Seed Data for Patient Overview Dashboard
-- Replace '00000000-0000-0000-0000-000000000000' with your test user's auth.uid() if running manually in Supabase.
-- Or run with a variable in SQL editor.

do $$
declare
  target_user_id uuid;
begin
  -- Grab first existing patient user or fallback to a dummy uuid
  select id into target_user_id from auth.users limit 1;
  
  if target_user_id is null then
    target_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;

  -- 1. Seed Vitals (7-day blood pressure trend + daily vitals)
  insert into public.vitals (patient_id, recorded_at, heart_rate, spo2, bp_systolic, bp_diastolic, sleep_minutes, steps)
  values
    (target_user_id, now() - interval '6 days', 72, 98, 118, 78, 450, 8420),
    (target_user_id, now() - interval '5 days', 74, 99, 121, 80, 420, 9150),
    (target_user_id, now() - interval '4 days', 70, 97, 117, 76, 480, 7600),
    (target_user_id, now() - interval '3 days', 75, 98, 123, 82, 390, 10200),
    (target_user_id, now() - interval '2 days', 71, 99, 119, 77, 460, 8900),
    (target_user_id, now() - interval '1 days', 69, 98, 116, 75, 490, 9450),
    (target_user_id, now(),                      72, 98, 120, 79, 465, 8800)
  on conflict do nothing;

  -- 2. Seed Active Medications
  insert into public.medications (patient_id, name, dose, frequency, next_dose_at, active)
  values
    (target_user_id, 'Amoxicillin', '500mg', 'Twice daily', now() + interval '4 hours', true),
    (target_user_id, 'Lisinopril', '10mg', 'Once daily (Morning)', now() + interval '18 hours', true),
    (target_user_id, 'Vitamin D3', '2000 IU', 'Once daily', now() + interval '12 hours', true),
    (target_user_id, 'Metformin', '500mg', 'With meals', now() + interval '2 hours', true)
  on conflict do nothing;

  -- 3. Seed Upcoming Appointments
  insert into public.appointments (patient_id, doctor_name, department, scheduled_at, reason, status)
  values
    (target_user_id, 'Dr. Sarah Jenkins', 'Cardiology', now() + interval '2 days', 'Routine BP & Heart Follow-up', 'upcoming'),
    (target_user_id, 'Dr. Marcus Vance', 'General Medicine', now() + interval '5 days', 'Annual Physical Exam', 'upcoming'),
    (target_user_id, 'Dr. Elena Rostova', 'Dermatology', now() + interval '12 days', 'Skin Check', 'upcoming')
  on conflict do nothing;

  -- 4. Seed Visits
  insert into public.visits (patient_id, hospital_name, doctor_name, department, visit_date, symptoms, diagnosis, treatment, notes)
  values
    (target_user_id, 'Metro Health Medical Center', 'Dr. Sarah Jenkins', 'Cardiology', current_date - interval '14 days', 'Mild chest tightness', 'Primary Hypertension (Controlled)', 'Prescribed Lisinopril 10mg', 'BP responding well to medication'),
    (target_user_id, 'St. Jude Community Hospital', 'Dr. Marcus Vance', 'General Practice', current_date - interval '45 days', 'Persistent cough', 'Acute Bronchitis', 'Course of Amoxicillin', 'Cleared after 7 days'),
    (target_user_id, 'City Wellness Clinic', 'Dr. Allen Poe', 'Orthopedics', current_date - interval '90 days', 'Left knee strain', 'Mild Ligament Sprain', 'Rest and physical therapy', 'Full recovery achieved')
  on conflict do nothing;

  -- 5. Seed Prescriptions
  insert into public.prescriptions (patient_id, medicine_name, dosage, frequency, duration, doctor_name, start_date, end_date, status)
  values
    (target_user_id, 'Amoxicillin', '500mg', '2x per day', '7 days', 'Dr. Marcus Vance', current_date - interval '14 days', current_date - interval '7 days', 'completed'),
    (target_user_id, 'Lisinopril', '10mg', '1x per day', '90 days', 'Dr. Sarah Jenkins', current_date - interval '30 days', current_date + interval '60 days', 'active'),
    (target_user_id, 'Ibuprofen', '400mg', 'As needed', '5 days', 'Dr. Allen Poe', current_date - interval '90 days', current_date - interval '85 days', 'completed')
  on conflict do nothing;

end $$;
