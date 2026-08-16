import { supabase } from '../supabase'

export interface TimelineEvent {
  id: string
  patient_id?: string
  category: 'visit' | 'prescription' | 'lab' | 'vaccination' | 'surgery'
  event_date: string
  place: string | null
  title: string
}

export async function getPatientTimeline(
  patientId: string,
  limit = 20,
  offset = 0
): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from('patient_timeline_view')
    .select('*')
    .eq('patient_id', patientId)
    .order('event_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to fetch patient timeline: ${error.message}`)
  }

  return (data as TimelineEvent[]) || []
}
