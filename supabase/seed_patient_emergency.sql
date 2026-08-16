-- Health-One: Seed Data for Patient Emergency Card & Access Logs

do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id from public.profiles where role = 'patient' limit 1;
  if target_user_id is null then
    select id into target_user_id from auth.users limit 1;
  end if;

  if target_user_id is not null then
    -- Idempotent delete for this patient
    delete from public.emergency_profile where patient_id = target_user_id;
    delete from public.emergency_access_logs where patient_id = target_user_id;

    -- 1. Seed Emergency Profile
    insert into public.emergency_profile (patient_id, blood_group, emergency_contact_name, emergency_contact_phone, emergency_code)
    values (
      target_user_id,
      'O+',
      'Sarah Johnson (Spouse)',
      '+1 (555) 019-2834',
      'e8c4b2a1'
    );

    -- 2. Seed Recent Access Logs
    insert into public.emergency_access_logs (patient_id, accessed_at, access_method, note)
    values
      (target_user_id, now() - interval '3 hours', 'qr', 'Scanned via Mobile QR Code'),
      (target_user_id, now() - interval '2 days', 'qr', 'Scanned via Mobile QR Code'),
      (target_user_id, now() - interval '5 days', 'manual_code', 'Accessed via Short Emergency Code e8c4b2a1'),
      (target_user_id, now() - interval '12 days', 'qr', 'Scanned via Mobile QR Code');
  end if;
end $$;
