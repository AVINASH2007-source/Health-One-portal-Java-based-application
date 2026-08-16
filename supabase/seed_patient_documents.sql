-- Health-One: Seed Data for Patient Uploaded Records

do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id from public.profiles where role = 'patient' limit 1;
  if target_user_id is null then
    select id into target_user_id from auth.users limit 1;
  end if;

  if target_user_id is not null then
    insert into public.records (patient_id, uploaded_by, record_type, title, description, occurred_at)
    values
      (target_user_id, target_user_id, 'patient_upload', 'Complete Blood Count (CBC) Report', 'Routine blood panel from City Diagnostics', now() - interval '5 days'),
      (target_user_id, target_user_id, 'patient_upload', 'Chest X-Ray Scan', 'Follow-up radiograph report', now() - interval '14 days'),
      (target_user_id, target_user_id, 'patient_upload', 'Hospital Discharge Summary', 'Annual checkup summary and clinical recommendations', now() - interval '30 days')
    on conflict do nothing;
  end if;
end $$;
