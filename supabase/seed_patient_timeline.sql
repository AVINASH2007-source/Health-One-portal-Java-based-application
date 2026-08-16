-- Health-One: Seed Data for Patient Timeline (Lab Reports, Vaccinations, Surgeries)

do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id from auth.users limit 1;
  
  if target_user_id is null then
    target_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;

  -- 1. Seed Lab Reports
  insert into public.lab_reports (patient_id, report_type, lab_name, report_date, result_summary)
  values
    (target_user_id, 'Comprehensive Blood Panel', 'Quest Diagnostics', current_date - interval '10 days', 'CBC normal, HbA1c 5.4%, Lipid panel optimal'),
    (target_user_id, 'Lumbar Spine MRI', 'Apex Radiology Center', current_date - interval '60 days', 'Mild L4-L5 disc bulge, no nerve impingement'),
    (target_user_id, 'Thyroid Function Test (TSH)', 'LabCorp Medical', current_date - interval '120 days', 'TSH 2.1 mIU/L within normal limits'),
    (target_user_id, 'Chest X-Ray', 'City Diagnostic Imaging', current_date - interval '180 days', 'Clear lung fields, heart size normal')
  on conflict do nothing;

  -- 2. Seed Vaccinations
  insert into public.vaccinations (patient_id, vaccine_name, dose_number, administered_date, administered_at)
  values
    (target_user_id, 'COVID-19 Bivalent Booster', 4, current_date - interval '30 days', 'Walgreens Pharmacy #4102'),
    (target_user_id, 'Annual Influenza Vaccine', 1, current_date - interval '200 days', 'CVS MinuteClinic'),
    (target_user_id, 'Tdap (Tetanus, Diphtheria, Pertussis)', 1, current_date - interval '500 days', 'Metro Health Health Center'),
    (target_user_id, 'Hepatitis B Booster', 3, current_date - interval '900 days', 'University Student Health Center')
  on conflict do nothing;

  -- 3. Seed Surgeries
  insert into public.surgeries (patient_id, surgery_type, hospital_name, surgeon, surgery_date, notes)
  values
    (target_user_id, 'Laparoscopic Appendectomy', 'St. Jude Community Hospital', 'Dr. Robert Chen', current_date - interval '365 days', 'Uncomplicated procedure, full recovery'),
    (target_user_id, 'Wisdom Teeth Extraction', 'Dental Surgery Associates', 'Dr. Maria Santos', current_date - interval '730 days', 'All four impacted molars removed under sedation')
  on conflict do nothing;

end $$;
