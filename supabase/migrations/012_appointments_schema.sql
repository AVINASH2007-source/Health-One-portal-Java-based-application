-- Migration 012 (Fixed): Safe Idempotent Appointments Migration
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL DEFAULT 'General Checkup',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add all missing columns safely
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS hospital_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS appointment_type TEXT DEFAULT 'in_person';
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS doctor_notes TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 4. Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "appointments: patient select" ON public.appointments;
DROP POLICY IF EXISTS "appointments: patient insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments: patient update" ON public.appointments;
DROP POLICY IF EXISTS "appointments: doctor select" ON public.appointments;
DROP POLICY IF EXISTS "appointments: doctor update" ON public.appointments;

-- 6. Create RLS Policies
CREATE POLICY "appointments: patient select"
ON public.appointments FOR SELECT TO authenticated
USING (auth.uid() = patient_id);

CREATE POLICY "appointments: patient insert"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "appointments: patient update"
ON public.appointments FOR UPDATE TO authenticated
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "appointments: doctor select"
ON public.appointments FOR SELECT TO authenticated
USING (auth.uid() = doctor_id OR doctor_id IS NULL);

CREATE POLICY "appointments: doctor update"
ON public.appointments FOR UPDATE TO authenticated
USING (auth.uid() = doctor_id OR doctor_id IS NULL)
WITH CHECK (auth.uid() = doctor_id OR doctor_id IS NULL);

-- 7. Grant permissions
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
