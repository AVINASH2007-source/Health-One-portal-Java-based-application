import { supabase } from '../supabase'

export interface EmergencyProfile {
  blood_group: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_code: string
  updated_at?: string
}

export interface EmergencyAccessLog {
  id: string
  patient_id?: string
  accessed_at: string
  access_method: string
  note: string | null
}

export async function getEmergencyProfile(patientId: string): Promise<EmergencyProfile> {
  const { data, error } = await supabase
    .from('emergency_profile')
    .select('blood_group, emergency_contact_name, emergency_contact_phone, emergency_code, updated_at')
    .eq('patient_id', patientId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch emergency profile: ${error.message}`)
  }

  if (data) {
    return data as EmergencyProfile
  }

  // Auto-generate profile row with random code if missing
  const newCode = Math.random().toString(36).substring(2, 10)
  const { data: created, error: createErr } = await supabase
    .from('emergency_profile')
    .insert({
      patient_id: patientId,
      blood_group: 'O+',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_code: newCode,
    })
    .select('blood_group, emergency_contact_name, emergency_contact_phone, emergency_code, updated_at')
    .single()

  if (createErr) {
    throw new Error(`Failed to initialize emergency profile: ${createErr.message}`)
  }

  return created as EmergencyProfile
}

export async function upsertEmergencyProfile(
  patientId: string,
  updates: Partial<EmergencyProfile>
): Promise<EmergencyProfile> {
  const { data, error } = await supabase
    .from('emergency_profile')
    .upsert(
      {
        patient_id: patientId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id' }
    )
    .select('blood_group, emergency_contact_name, emergency_contact_phone, emergency_code, updated_at')
    .single()

  if (error) {
    throw new Error(`Failed to save emergency profile: ${error.message}`)
  }

  return data as EmergencyProfile
}

export async function regenerateEmergencyCode(patientId: string): Promise<string> {
  const newCode = Math.random().toString(36).substring(2, 10)
  const { data, error } = await supabase
    .from('emergency_profile')
    .update({ emergency_code: newCode, updated_at: new Date().toISOString() })
    .eq('patient_id', patientId)
    .select('emergency_code')
    .single()

  if (error) {
    throw new Error(`Failed to regenerate emergency code: ${error.message}`)
  }

  return data.emergency_code
}

export async function getRecentEmergencyAccess(patientId: string): Promise<EmergencyAccessLog[]> {
  const { data, error } = await supabase
    .from('emergency_access_logs')
    .select('*')
    .eq('patient_id', patientId)
    .order('accessed_at', { ascending: false })
    .limit(10)

  if (error) {
    throw new Error(`Failed to fetch emergency access logs: ${error.message}`)
  }

  return (data as EmergencyAccessLog[]) || []
}

export async function getEmergencyCardByCode(code: string) {
  const { data, error } = await supabase.rpc('get_emergency_card', { code })
  if (error) {
    throw new Error(`RPC get_emergency_card failed: ${error.message}`)
  }
  return data
}
