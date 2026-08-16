import { supabase } from '../supabase'

export interface VitalReading {
  id: string
  patient_id: string
  recorded_at: string
  heart_rate: number | null
  spo2: number | null
  bp_systolic: number | null
  bp_diastolic: number | null
  sleep_minutes: number | null
  steps: number | null
}

export interface Medication {
  id: string
  patient_id: string
  name: string
  dose: string | null
  frequency: string | null
  next_dose_at: string | null
  active: boolean
  created_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  doctor_name: string
  department: string | null
  time: string
  reason: string | null
  status: string
  created_at: string
}

export interface Visit {
  id: string
  patient_id: string
  hospital_name: string
  doctor_name: string | null
  department: string | null
  visit_date: string
  symptoms: string | null
  diagnosis: string | null
  treatment: string | null
  notes: string | null
  created_at: string
}

export interface Prescription {
  id: string
  patient_id: string
  medicine_name: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  doctor_name: string | null
  start_date: string | null
  end_date: string | null
  status: string
  created_at: string
}

export interface TimelineItem {
  id: string
  type: 'visit' | 'prescription'
  title: string
  subtitle?: string
  date: string
  details?: string
}

export async function getRecentVitals(patientId: string): Promise<VitalReading[]> {
  const { data, error } = await supabase
    .from('vitals')
    .select('*')
    .eq('patient_id', patientId)
    .order('recorded_at', { ascending: true })
    .limit(7)

  if (error) {
    throw new Error(`Failed to fetch vitals: ${error.message}`)
  }

  return (data as VitalReading[]) || []
}

export async function getLatestVitalReading(patientId: string): Promise<VitalReading | null> {
  const { data, error } = await supabase
    .from('vitals')
    .select('*')
    .eq('patient_id', patientId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch latest vitals: ${error.message}`)
  }

  return (data as VitalReading) || null
}

export async function getActiveMedications(patientId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('patient_id', patientId)
    .eq('active', true)
    .order('next_dose_at', { ascending: true, nullsFirst: false })

  if (error) {
    throw new Error(`Failed to fetch active medications: ${error.message}`)
  }

  return (data as Medication[]) || []
}

export async function getUpcomingAppointments(patientId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', patientId)
    .eq('status', 'upcoming')
    .order('time', { ascending: true })
    .limit(3)

  if (error) {
    throw new Error(`Failed to fetch upcoming appointments: ${error.message}`)
  }

  return (data as Appointment[]) || []
}

export async function getRecentTimeline(patientId: string): Promise<TimelineItem[]> {
  const [{ data: visits, error: vErr }, { data: prescriptions, error: pErr }] = await Promise.all([
    supabase
      .from('visits')
      .select('*')
      .eq('patient_id', patientId)
      .order('visit_date', { ascending: false })
      .limit(5),
    supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (vErr) throw new Error(`Failed to fetch visits: ${vErr.message}`)
  if (pErr) throw new Error(`Failed to fetch prescriptions: ${pErr.message}`)

  const visitItems: TimelineItem[] = (visits || []).map((v) => ({
    id: `visit-${v.id}`,
    type: 'visit',
    title: v.hospital_name || 'Hospital Visit',
    subtitle: v.doctor_name ? `Dr. ${v.doctor_name}` : v.department || undefined,
    date: v.visit_date,
    details: v.diagnosis || v.symptoms || undefined,
  }))

  const prescriptionItems: TimelineItem[] = (prescriptions || []).map((p) => ({
    id: `rx-${p.id}`,
    type: 'prescription',
    title: `Prescription: ${p.medicine_name}`,
    subtitle: p.doctor_name ? `Prescribed by ${p.doctor_name}` : p.dosage || undefined,
    date: p.start_date || (p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    details: p.frequency ? `${p.dosage || ''} - ${p.frequency}` : undefined,
  }))

  const combined = [...visitItems, ...prescriptionItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return combined.slice(0, 5)
}
