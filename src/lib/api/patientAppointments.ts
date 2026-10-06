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
  time: string // ISO string
  reason: string
  status: 'pending' | 'scheduled' | 'confirmed' | 'rejected' | 'declined' | 'cancelled' | 'completed' | string
  created_at?: string
}

/**
 * Fetches all registered users from public.profiles table who have role === 'doctor'
 * Uses SECURITY DEFINER RPC get_public_doctors to bypass RLS policies cleanly,
 * with automatic fallback to direct profiles table select query.
 */
export async function getAvailableDoctors(): Promise<DoctorProfile[]> {
  try {
    let doctorRows: any[] = []

    // 1. Try RPC get_public_doctors (Security Definer function bypasses RLS safely)
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_public_doctors')

    if (!rpcErr && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
      doctorRows = rpcData
    } else {
      if (rpcErr) {
        console.warn('RPC get_public_doctors notice (RPC function may not be created in DB yet):', rpcErr.message)
      }
      // 2. Fallback to direct select from profiles table
      const { data: selectData, error: selectErr } = await supabase
        .from('profiles')
        .select('id, name, email, specialty, role, hospital_id')

      if (!selectErr && selectData) {
        doctorRows = selectData.filter(
          (p: any) => p.role && p.role.toString().toLowerCase() === 'doctor'
        )
      } else if (selectErr) {
        console.warn('Direct profiles query error:', selectErr.message)
      }
    }

    if (doctorRows && doctorRows.length > 0) {
      return doctorRows.map((d: any) => {
        const rawName = d.name || d.email?.split('@')[0] || 'Specialist'
        const formattedName = rawName.toLowerCase().startsWith('dr.')
          ? rawName
          : `Dr. ${rawName}`

        return {
          id: d.id,
          full_name: formattedName,
          specialty: d.specialty || 'General Practitioner & Internal Medicine',
          hospital_name: 'Health-One Medical Network',
        }
      })
    }
  } catch (e) {
    console.warn('Supabase profiles doctor lookup notice:', e)
  }

  return []
}

/**
 * Queries all real appointments for the logged-in patient from Supabase appointments table
 */
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
        profiles:doctor_id (name, specialty)
      `)
      .eq('patient_id', patientId)
      .order('time', { ascending: false })

    if (!error && data) {
      return data.map((item: any) => {
        const docName = item.profiles?.name
          ? (item.profiles.name.toLowerCase().startsWith('dr.') ? item.profiles.name : `Dr. ${item.profiles.name}`)
          : 'Attending Doctor'

        return {
          id: item.id,
          patient_id: item.patient_id,
          doctor_id: item.doctor_id,
          doctor_name: docName,
          specialization: item.profiles?.specialty || 'Medical Specialist',
          time: item.time,
          reason: item.reason,
          status: item.status,
          created_at: item.created_at,
        }
      })
    }
  } catch (e) {
    console.warn('Supabase appointments fetch notice:', e)
  }

  return []
}

/**
 * Inserts a real appointment request into Supabase appointments table
 */
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
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: patientId,
      doctor_id: payload.doctor_id,
      time: payload.time,
      reason: payload.reason,
      status: 'pending',
    })
    .select('*, profiles:doctor_id (name, specialty)')
    .single()

  if (error) {
    throw new Error(`Failed to record appointment request: ${error.message}`)
  }

  const docName = data.profiles?.name
    ? (data.profiles.name.toLowerCase().startsWith('dr.') ? data.profiles.name : `Dr. ${data.profiles.name}`)
    : payload.doctor_name

  return {
    id: data.id,
    patient_id: data.patient_id,
    doctor_id: data.doctor_id,
    doctor_name: docName,
    specialization: data.profiles?.specialty || payload.specialization || 'Medical Specialist',
    time: data.time,
    reason: data.reason,
    status: data.status || 'pending',
    created_at: data.created_at,
  }
}

/**
 * Updates appointment status to 'cancelled'
 */
export async function updateAppointmentStatusToCancelled(patientId: string, appointmentId: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('patient_id', patientId)

  if (error) {
    throw new Error(`Failed to cancel appointment: ${error.message}`)
  }
}
