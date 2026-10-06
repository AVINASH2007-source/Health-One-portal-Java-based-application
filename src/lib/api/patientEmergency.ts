import { supabase } from '../supabase'

export interface EmergencyProfile {
  blood_group: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation?: string | null
  emergency_code?: string
  emergency_token_hash?: string | null
  updated_at?: string
}

export interface EmergencyAccessLog {
  id: string
  patient_id?: string
  accessed_by?: string | null
  accessed_at?: string
  created_at?: string
  access_method: string
  access_reason?: string | null
  ip_address?: string | null
  user_agent?: string | null
  note?: string | null
}

export interface PublicEmergencyData {
  patient_name: string
  blood_group: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation?: string
  allergies: Array<{ allergen: string; severity?: string; reaction?: string }>
  conditions: Array<{ condition_name: string; status?: string; diagnosed_date?: string }>
  medications: Array<{ name: string; dose?: string; frequency?: string }>
  surgeries: Array<{ surgery_type: string; surgery_date?: string; hospital_name?: string }>
}

/**
 * Computes SHA-256 hash of a string using Web Crypto API.
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generates a cryptographically strong, URL-safe random token.
 */
export function generateRandomToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  // Convert to URL-safe base64 / hex string
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Local cache key for holding the plain token on this device for QR display
 */
function getLocalTokenKey(patientId: string) {
  return `healthone_emergency_token_${patientId}`
}

export function getStoredLocalToken(patientId: string): string | null {
  try {
    return localStorage.getItem(getLocalTokenKey(patientId))
  } catch {
    return null
  }
}

export function saveStoredLocalToken(patientId: string, token: string): void {
  try {
    localStorage.setItem(getLocalTokenKey(patientId), token)
  } catch (err) {
    console.warn('Could not store token locally:', err)
  }
}

export async function getEmergencyProfile(patientId: string): Promise<EmergencyProfile> {
  const { data, error } = await supabase
    .from('emergency_profile')
    .select('blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, emergency_code, emergency_token_hash, updated_at')
    .eq('patient_id', patientId)
    .maybeSingle()

  if (error) {
    console.warn(`Emergency profile fetch warning: ${error.message}`)
  }

  if (data) {
    return data as EmergencyProfile
  }

  // Initialize profile with new token and hash
  const initialToken = generateRandomToken()
  const initialHash = await sha256(initialToken)
  saveStoredLocalToken(patientId, initialToken)

  const { data: created, error: createErr } = await supabase
    .from('emergency_profile')
    .insert({
      patient_id: patientId,
      blood_group: 'O+',
      emergency_contact_name: 'Sarah Johnson (Spouse)',
      emergency_contact_phone: '+1 (555) 019-2834',
      emergency_contact_relation: 'Spouse',
      emergency_token_hash: initialHash,
      emergency_code: initialToken.slice(0, 8),
    })
    .select('blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, emergency_code, emergency_token_hash, updated_at')
    .single()

  if (createErr) {
    console.warn(`Failed to initialize emergency profile: ${createErr.message}`)
    return {
      blood_group: 'O+',
      emergency_contact_name: 'Sarah Johnson (Spouse)',
      emergency_contact_phone: '+1 (555) 019-2834',
      emergency_contact_relation: 'Spouse',
      emergency_code: initialToken.slice(0, 8),
      emergency_token_hash: initialHash,
    }
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
    .select('blood_group, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, emergency_code, emergency_token_hash, updated_at')
    .single()

  if (error) {
    throw new Error(`Failed to save emergency profile: ${error.message}`)
  }

  return data as EmergencyProfile
}

/**
 * Regenerates the random token, computes its SHA-256 hash, and updates Supabase.
 * The old token is immediately revoked since only the new hash is stored.
 */
export async function regenerateEmergencyToken(patientId: string): Promise<{ token: string; hash: string }> {
  const newToken = generateRandomToken()
  const newHash = await sha256(newToken)

  const { error } = await supabase
    .from('emergency_profile')
    .upsert(
      {
        patient_id: patientId,
        emergency_token_hash: newHash,
        emergency_code: newToken.slice(0, 8),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id' }
    )

  if (error) {
    throw new Error(`Failed to regenerate emergency token: ${error.message}`)
  }

  saveStoredLocalToken(patientId, newToken)
  return { token: newToken, hash: newHash }
}

export async function getRecentEmergencyAccess(patientId: string): Promise<EmergencyAccessLog[]> {
  const { data, error } = await supabase
    .from('emergency_access_log')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .limit(15)

  if (error) {
    console.warn(`Failed to fetch emergency access logs: ${error.message}`)
    return []
  }

  return (data as EmergencyAccessLog[]) || []
}

/**
 * Public emergency lookup by token.
 * 1. Hashes the given token using SHA-256.
 * 2. Queries Supabase get_emergency_card RPC or direct emergency_profile lookup.
 * 3. Fallback to Java backend GET /api/emergency/{token} if configured.
 */
export async function fetchPublicEmergencyData(token: string): Promise<PublicEmergencyData | null> {
  if (!token || token.trim().length === 0) return null

  try {
    const tokenHash = await sha256(token)

    // 1. Try RPC function
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_emergency_card', {
      code: tokenHash,
    })

    if (!rpcErr && rpcData) {
      return rpcData as PublicEmergencyData
    }

    // 2. Try direct lookup with tokenHash or token fallback
    const { data: emProf } = await supabase
      .from('emergency_profile')
      .select('*, profiles:patient_id (name)')
      .or(`emergency_token_hash.eq.${tokenHash},emergency_code.eq.${token},patient_id.eq.${token}`)
      .maybeSingle()

    if (emProf) {
      const pid = emProf.patient_id
      const pName = (emProf as any).profiles?.name || 'Patient'

      // Log access audit
      await supabase.from('emergency_access_log').insert({
        patient_id: pid,
        access_method: 'qr',
        access_reason: 'Public Emergency QR Scan',
        created_at: new Date().toISOString(),
      })

      // Fetch life-critical items
      const [allergiesRes, conditionsRes, medsRes, surgRes] = await Promise.all([
        supabase.from('allergies').select('allergen, severity, reaction_notes').eq('patient_id', pid),
        supabase.from('diseases').select('condition_name, status, diagnosed_date').eq('patient_id', pid).neq('status', 'resolved'),
        supabase.from('medications').select('name, dose, frequency').eq('patient_id', pid).eq('active', true),
        supabase.from('surgeries').select('surgery_type, surgery_date, hospital_name').eq('patient_id', pid),
      ])

      return {
        patient_name: pName,
        blood_group: emProf.blood_group || 'O+',
        emergency_contact_name: emProf.emergency_contact_name || '',
        emergency_contact_phone: emProf.emergency_contact_phone || '',
        emergency_contact_relation: emProf.emergency_contact_relation || 'Family Contact',
        allergies: allergiesRes.data?.map((a: any) => ({ allergen: a.allergen, severity: a.severity, reaction: a.reaction_notes })) || [],
        conditions: conditionsRes.data?.map((c: any) => ({ condition_name: c.condition_name, status: c.status, diagnosed_date: c.diagnosed_date })) || [],
        medications: medsRes.data?.map((m: any) => ({ name: m.name, dose: m.dose, frequency: m.frequency })) || [],
        surgeries: surgRes.data?.map((s: any) => ({ surgery_type: s.surgery_type, surgery_date: s.surgery_date, hospital_name: s.hospital_name })) || [],
      }
    }

    // 3. Optional fallback to backend API
    try {
      const res = await fetch(`/api/emergency/${encodeURIComponent(token)}`)
      if (res.ok) {
        const json = await res.json()
        if (json.data) return json.data
      }
    } catch {
      // Backend not running or unreachable
    }

    return null
  } catch (err) {
    console.error('Error fetching emergency data:', err)
    return null
  }
}
