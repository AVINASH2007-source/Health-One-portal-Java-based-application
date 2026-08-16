-- Health-One: Add public.records to patient_timeline_view using exact table schemas

create or replace view public.patient_timeline_view
with (security_invoker = true) as
  select id, patient_id, 'visit' as category, visit_date as event_date,
         hospital_name as place, coalesce(diagnosis, 'Visit') as title
  from public.visits
  union all
  select id, patient_id, 'prescription' as category, start_date as event_date,
         doctor_name as place, medicine_name || ' prescribed' as title
  from public.prescriptions
  union all
  select id, patient_id, 'lab' as category, report_date as event_date,
         lab_name as place, report_type || ' — results uploaded' as title
  from public.lab_reports
  union all
  select id, patient_id, 'vaccination' as category, administered_date as event_date,
         administered_at as place, vaccine_name as title
  from public.vaccinations
  union all
  select id, patient_id, 'surgery' as category, surgery_date as event_date,
         hospital_name as place, surgery_type as title
  from public.surgeries
  union all
  select id, patient_id, 'document' as category, occurred_at::date as event_date,
         'Uploaded File' as place, title
  from public.records;
