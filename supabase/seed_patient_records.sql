-- Health-One: Seed Data for Patient Records (Allergies & Diseases)

do $$
declare
  target_user_id uuid;
begin
  -- Find seeded patient user via public.profiles where role = 'patient'
  select id into target_user_id
  from public.profiles
  where role = 'patient'
  limit 1;

  -- Fallback if profiles is empty
  if target_user_id is null then
    select id into target_user_id from auth.users limit 1;
  end if;

  if target_user_id is not null then
    -- Idempotent delete for this patient
    delete from public.allergies where patient_id = target_user_id;
    delete from public.diseases where patient_id = target_user_id;

    -- 1. Seed Allergies
    insert into public.allergies (patient_id, allergen, category, severity, reaction_notes)
    values
      (target_user_id, 'Penicillin', 'drug', 'severe', 'Anaphylaxis risk. Causes severe hives and facial swelling.'),
      (target_user_id, 'Peanuts & Tree Nuts', 'food', 'moderate', 'Causes gastrointestinal distress and localized rash.'),
      (target_user_id, 'Latex', 'environmental', 'mild', 'Contact dermatitis / skin redness on exposure.'),
      (target_user_id, 'Sulfa Drugs', 'drug', 'moderate', 'Causes widespread skin eruption and fever.');

    -- 2. Seed Diseases / Conditions
    insert into public.diseases (patient_id, condition_name, diagnosed_date, status, notes)
    values
      (target_user_id, 'Primary Hypertension', current_date - interval '730 days', 'active', 'Managed with daily Lisinopril 10mg. Regular BP tracking.'),
      (target_user_id, 'Type 2 Diabetes Mellitus', current_date - interval '365 days', 'managed', 'Controlled with diet and exercise. HbA1c currently 5.4%.'),
      (target_user_id, 'Acute Bronchitis', current_date - interval '90 days', 'resolved', 'Full resolution following 7-day antibiotic course.'),
      (target_user_id, 'Seasonal Allergic Rhinitis', current_date - interval '1095 days', 'active', 'Flares up during spring pollen season.');
  end if;
end $$;
