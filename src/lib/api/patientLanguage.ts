import { supabase } from '../supabase'

export interface PatientPreferences {
  patient_id?: string
  language: string
  voice_assistance: boolean
  auto_translate_docs: boolean
  updated_at?: string
}

export async function getPatientPreferences(patientId: string): Promise<PatientPreferences> {
  const { data, error } = await supabase
    .from('patient_preferences')
    .select('patient_id, language, voice_assistance, auto_translate_docs, updated_at')
    .eq('patient_id', patientId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch patient preferences: ${error.message}`)
  }

  if (data) {
    return data as PatientPreferences
  }

  return {
    patient_id: patientId,
    language: 'en',
    voice_assistance: true,
    auto_translate_docs: true,
  }
}

export async function savePatientPreferences(
  patientId: string,
  prefs: Partial<PatientPreferences>
): Promise<PatientPreferences> {
  const payload = {
    patient_id: patientId,
    language: prefs.language ?? 'en',
    voice_assistance: prefs.voice_assistance ?? true,
    auto_translate_docs: prefs.auto_translate_docs ?? true,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('patient_preferences')
    .upsert(payload, { onConflict: 'patient_id' })
    .select('patient_id, language, voice_assistance, auto_translate_docs, updated_at')
    .single()

  if (error) {
    throw new Error(`Failed to save preferences: ${error.message}`)
  }

  return data as PatientPreferences
}
