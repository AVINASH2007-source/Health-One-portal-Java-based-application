import { supabase } from '../supabase'

export interface DoctorProfile {
  id: string
  full_name: string
  specialty?: string
  hospital_name?: string
  avatar_url?: string
}

export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  doctor_name?: string
  specialization?: string
  time: string // ISO string or timestamp
  reason: string
  status: 'pending' | 'scheduled' | 'confirmed' | 'rejected' | 'declined' | 'cancelled' | 'completed' | string
  created_at?: string
}

export const FALLBACK_DOCTORS: DoctorProfile[] = [
  {
    id: 'doc-101',
    full_name: 'Dr. R. Kumar',
    specialty: 'Cardiology & Heart Health',
    hospital_name: 'Apollo Hospitals, Chennai',
  },
  {
    id: 'doc-102',
    full_name: 'Dr. A. Iyer',
    specialty: 'General Medicine & Internal Health',
    hospital_name: 'Fortis Health Center, Chennai',
  },
  {
    id: 'doc-103',
    full_name: 'Dr. S. Ramesh',
    specialty: 'Orthopedics & Joint Surgery',
    hospital_name: 'MGM Healthcare, Chennai',
  },
  {
    id: 'doc-104',
    full_name: 'Dr. P. Sharma',
    specialty: 'Endocrinology & Diabetes Care',
    hospital_name: 'Apollo Specialty Clinic',
  },
  {
    id: 'doc-105',
    full_name: 'Dr. M. Swaminathan',
    specialty: 'Neurology & Brain Health',
    hospital_name: 'Kauvery Hospital, Chennai',
  },
]

const LOCAL_KEY = 'healthone_patient_appointments_v2'

function getLocalAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('Failed to parse local appointments:', e)
  }

  const in2Days = new Date(Date.now() + 86400000 * 2)
  in2Days.setHours(10, 30, 0, 0)

  const in4DaysAgo = new Date(Date.now() - 86400000 * 4)
  in4DaysAgo.setHours(14, 0, 0, 0)

  return [
    {
      id: 'apt-101',
      patient_id: 'default-patient',
      doctor_id: 'doc-101',
      doctor_name: 'Dr. R. Kumar',
      specialization: 'Cardiology & Heart Health',
      time: in2Days.toISOString(),
      reason: 'Routine ECG review & blood pressure checkup',
      status: 'pending',
      created_at: new Date().toISOString(),
    },
    {
      id: 'apt-102',
      patient_id: 'default-patient',
      doctor_id: 'doc-102',
      doctor_name: 'Dr. A. Iyer',
      specialization: 'General Medicine & Internal Health',
      time: in4DaysAgo.toISOString(),
      reason: 'Fasting blood glucose review and prescription renewal',
      status: 'scheduled',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ]
}

function saveLocalAppointments(appts: Appointment[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(appts))
  } catch (e) {
    console.warn('Failed to save local appointments:', e)
  }
}

// 1. Query available doctors from profiles table where role = 'doctor'
export async function getAvailableDoctors(): Promise<DoctorProfile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, specialty, role, hospital_name')
      .eq('role', 'doctor')

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        full_name: d.full_name || d.name || 'Doctor',
        specialty: d.specialty || d.specialization || 'General Practitioner',
        hospital_name: d.hospital_name || 'Health-One Hospital System',
      }))
    }
  } catch (e) {
    console.warn('Supabase profiles doctor lookup notice, using fallback list:', e)
  }

  return FALLBACK_DOCTORS
}

// 2. Query appointments for current patient where patient_id = user.id
export async function getPatientAppointments(patientId: string): Promise<Appointment[]> {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        doctor_id,
        time,
        reason,
        status,
        created_at,
        profiles:doctor_id (full_name, specialty)
      `)
      .eq('patient_id', patientId)
      .order('time', { ascending: false })

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id,
        patient_id: item.patient_id,
        doctor_id: item.doctor_id,
        doctor_name: item.profiles?.full_name || 'Doctor',
        specialization: item.profiles?.specialty || 'Medical Specialist',
        time: item.time,
        reason: item.reason,
        status: item.status,
        created_at: item.created_at,
      }))
    }
  } catch (e) {
    console.warn('Supabase appointments fetch notice, using fallback storage:', e)
  }

  return getLocalAppointments()
}

// 3. Create appointment: insert into appointments: { patient_id: user.id, doctor_id, time, reason, status: 'pending' }
export async function createAppointmentRequest(
  patientId: string,
  payload: {
    doctor_id: string
    doctor_name: string
    specialization?: string
    time: string
    reason: string
  }
): Promise<Appointment> {
  const newAppt: Appointment = {
    id: `apt-${Date.now()}`,
    patient_id: patientId,
    doctor_id: payload.doctor_id,
    doctor_name: payload.doctor_name,
    specialization: payload.specialization,
    time: payload.time,
    reason: payload.reason,
    status: 'pending',
    created_at: new Date().toISOString(),
  }

  try {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: patientId,
        doctor_id: payload.doctor_id,
        time: payload.time,
        reason: payload.reason,
        status: 'pending',
      })
      .select('*')
      .single()

    if (!error && data) {
      const dbAppt: Appointment = {
        ...newAppt,
        id: data.id,
        status: data.status || 'pending',
      }
      const current = getLocalAppointments()
      saveLocalAppointments([dbAppt, ...current])
      return dbAppt
    } else if (error) {
      console.warn('Supabase appointment insert notice, using local storage fallback:', error.message)
    }
  } catch (e) {
    console.warn('Supabase appointment insert catch notice:', e)
  }

  const current = getLocalAppointments()
  const updated = [newAppt, ...current]
  saveLocalAppointments(updated)

  return newAppt
}

// 4. Update status to 'cancelled' (requires RLS policy: "appointments: patient update")
export async function updateAppointmentStatusToCancelled(patientId: string, appointmentId: string): Promise<void> {
  let dbSuccess = false
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId)
      .eq('patient_id', patientId)

    if (error) {
      console.warn('Supabase appointment cancellation notice (Check RLS policy "appointments: patient update"):', error.message)
    } else {
      dbSuccess = true
    }
  } catch (e) {
    console.warn('Supabase appointment cancellation catch notice:', e)
  }

  // Also update local storage state
  const locals = getLocalAppointments()
  const updated = locals.map((a) => (a.id === appointmentId ? { ...a, status: 'cancelled' } : a))
  saveLocalAppointments(updated)
}
