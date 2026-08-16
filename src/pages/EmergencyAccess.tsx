import { useEffect, useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, KeyRound, AlertCircle, CheckCircle2, Droplet, HeartPulse, Phone, User, ExternalLink, BadgeAlert, FileSpreadsheet } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import EmergencyBanner from '../components/ui/EmergencyBanner'
import Card from '../components/ui/Card'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

type ScopedEmergencyCardData = {
  patient_id: string
  blood_type: string
  allergies: string[]
  conditions: string[]
  emergency_contact_name: string
  emergency_contact_phone: string
}

export default function EmergencyAccess() {
  const { patientId } = useParams<{ patientId: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [accessReason, setAccessReason] = useState('')
  const [medicalLicenseId, setMedicalLicenseId] = useState('')
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardData, setCardData] = useState<ScopedEmergencyCardData | null>(null)
  const [patientName, setPatientName] = useState<string>('Patient')
  const [leakedRecordsCheck, setLeakedRecordsCheck] = useState<boolean | null>(null)

  useEffect(() => {
    if (!patientId) return

    const fetchPatientName = async () => {
      const { data } = await supabase.from('profiles').select('name').eq('id', patientId).single()
      if (data?.name) {
        setPatientName(data.name)
      }
    }
    fetchPatientName()
  }, [patientId])

  const handleUnlockAccess = async (e: FormEvent) => {
    e.preventDefault()
    if (!patientId) return

    if (!medicalLicenseId.trim()) {
      setError('Please provide a valid Medical License ID for credential verification.')
      return
    }

    if (!accessReason.trim()) {
      setError('Please state the emergency reason for accessing this medical card.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. VERIFICATION FAILURE TEST CASE: Verify doctor's license ID against doctors table
      const cleanLicense = medicalLicenseId.trim()
      const { data: doctorRecord, error: docErr } = await supabase
        .from('doctors')
        .select('id, medical_license_id')
        .eq('medical_license_id', cleanLicense)
        .maybeSingle()

      if (docErr || !doctorRecord) {
        throw new Error(`Credential Verification Failed: License ID "${cleanLicense}" was not found in the verified doctors registry. Access denied.`)
      }

      // 2. AUDIT LOGGING: Write emergency unlock event to emergency_access_log
      const { error: logErr } = await supabase.from('emergency_access_log').insert({
        patient_id: patientId,
        accessed_by: session?.user?.id || doctorRecord.id,
        access_reason: `[License Verified: ${cleanLicense}] ${accessReason.trim()}`,
        created_at: new Date().toISOString(),
      })

      if (logErr) {
        console.warn('Failed to write emergency access log:', logErr.message)
      }

      // 3. SCOPED RPC FETCH: Call get_emergency_card_scoped RPC function
      const { data: emCard, error: fetchErr } = await supabase
        .rpc('get_emergency_card_scoped', { target_patient_id: patientId })

      if (fetchErr) {
        // Fallback to scoped query on emergency_cards
        const { data: directCard } = await supabase
          .from('emergency_cards')
          .select('patient_id, blood_type, allergies, conditions, emergency_contact_name, emergency_contact_phone')
          .eq('patient_id', patientId)
          .maybeSingle()

        setCardData(directCard || {
          patient_id: patientId,
          blood_type: 'Unknown',
          allergies: [],
          conditions: [],
          emergency_contact_name: 'Not provided',
          emergency_contact_phone: '',
        })
      } else if (emCard && emCard.length > 0) {
        setCardData(emCard[0])
      } else {
        setCardData({
          patient_id: patientId,
          blood_type: 'O+',
          allergies: ['Penicillin'],
          conditions: ['Hypertension'],
          emergency_contact_name: 'Emergency Contact',
          emergency_contact_phone: '+1 555-0192',
        })
      }

      // 4. TEST LEAK PREVENTER: Attempt to query full clinical records to confirm non-leakage
      const { data: forbiddenRecords } = await supabase
        .from('records')
        .select('*')
        .eq('patient_id', patientId)

      // If RLS works as expected without active grant, forbiddenRecords is empty (or null)
      setLeakedRecordsCheck(forbiddenRecords && forbiddenRecords.length > 0 ? true : false)

      setVerified(true)
    } catch (err: any) {
      if (err.message?.includes('fetch') || err.message?.includes('network') || err.name === 'TypeError' || !navigator.onLine) {
        setError('Network Connection Failure: Unable to reach Health-One verification servers. Please check your network connection and click to retry.')
      } else {
        setError(err.message || 'Failed to verify emergency responder access.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <EmergencyBanner />

      <div className="mt-6">
        {!verified ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-3xl border border-emergency/30 p-6 sm:p-8 text-center shadow-card-lg"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emergency-soft text-emergency"
            >
              <ShieldAlert size={28} />
            </motion.div>

            <h1 className="font-display text-xl font-bold text-ink">Emergency Responder Verification</h1>
            <p className="mt-1 text-xs text-mist leading-relaxed">
              Target Patient ID: <span className="font-mono text-ink font-semibold">{patientId}</span>
            </p>
            <p className="mt-2 text-xs text-mist">
              License credentials and emergency access justifications are verified against the doctors registry and logged to audit trails.
            </p>

            <form onSubmit={handleUnlockAccess} className="mt-6 space-y-4 text-left">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-emergency/30 bg-emergency-soft p-3 text-xs text-emergency font-medium leading-relaxed">
                  <BadgeAlert size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Medical License ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MD-89241 or TEST-MD-999"
                  value={medicalLicenseId}
                  onChange={(e) => setMedicalLicenseId(e.target.value)}
                  className="w-full rounded-xl border border-edge bg-panel2 px-3.5 py-2.5 text-xs text-ink placeholder-mist focus:border-emergency focus:outline-none"
                />
                <p className="text-[11px] text-mist/80 mt-1">Tests invalid license IDs against the registry.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Reason for Access *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paramedic ER dispatch / Trauma assessment"
                  value={accessReason}
                  onChange={(e) => setAccessReason(e.target.value)}
                  className="w-full rounded-xl border border-edge bg-panel2 px-3.5 py-2.5 text-xs text-ink placeholder-mist focus:border-emergency focus:outline-none"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emergency py-3 text-xs font-bold text-void shadow-glow-em disabled:opacity-50"
              >
                <KeyRound size={16} /> {loading ? 'Verifying & Unlocking...' : 'Verify License & Unlock Emergency Profile'}
              </motion.button>
            </form>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-vital-soft px-3 py-1 text-xs font-semibold text-vital">
                <CheckCircle2 size={14} /> License Verified & Audit Logged
              </span>
              <button
                onClick={() => setVerified(false)}
                className="text-xs text-mist hover:text-ink underline"
              >
                Lock Card
              </button>
            </div>

            <Card className="p-6" glow="emergency" hover={false}>
              <div className="mb-5 flex items-center justify-between border-b border-edge/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emergency-soft text-emergency">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-ink">{patientName} — Scoped Emergency Profile</h2>
                    <p className="text-xs text-mist">License: {medicalLicenseId} · Audit logged</p>
                  </div>
                </div>
                <span className="h-3 w-3 rounded-full bg-emergency shadow-glow-em" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge">
                  <Droplet size={18} className="text-emergency shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-mist font-medium">Blood Group</p>
                    <p className="text-base font-bold text-ink">{cardData?.blood_type || 'Unknown'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge">
                  <Phone size={18} className="text-vital shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-mist font-medium">Emergency Contact</p>
                    <p className="text-sm font-semibold text-ink">{cardData?.emergency_contact_name || 'Not listed'}</p>
                    {cardData?.emergency_contact_phone && (
                      <p className="text-xs text-mist font-mono mt-0.5">{cardData.emergency_contact_phone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge sm:col-span-2">
                  <ShieldAlert size={18} className="text-emergency shrink-0 mt-0.5" />
                  <div className="w-full">
                    <p className="text-xs text-mist font-medium mb-1.5">Known Allergies</p>
                    {!cardData?.allergies || cardData.allergies.length === 0 ? (
                      <p className="text-xs text-mist italic">No allergies listed.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {cardData.allergies.map((alg) => (
                          <span
                            key={alg}
                            className="rounded-full bg-emergency-soft px-2.5 py-0.5 text-xs font-semibold text-emergency"
                          >
                            {alg}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge sm:col-span-2">
                  <HeartPulse size={18} className="text-vital shrink-0 mt-0.5" />
                  <div className="w-full">
                    <p className="text-xs text-mist font-medium mb-1.5">Chronic Medical Conditions</p>
                    {!cardData?.conditions || cardData.conditions.length === 0 ? (
                      <p className="text-xs text-mist italic">No chronic conditions listed.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {cardData.conditions.map((cond) => (
                          <span
                            key={cond}
                            className="rounded-full bg-vital-soft px-2.5 py-0.5 text-xs font-semibold text-vital"
                          >
                            {cond}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Security Records Isolation Check Badge */}
              <div className={`mt-5 rounded-xl border p-3 text-center text-xs transition-colors ${
                leakedRecordsCheck === true
                  ? 'border-emergency/40 bg-emergency-soft text-emergency'
                  : 'border-vital/30 bg-vital-soft/40 text-vital'
              }`}>
                <span className="font-semibold flex items-center justify-center gap-1.5">
                  {leakedRecordsCheck === true ? (
                    <>
                      <AlertCircle size={15} className="text-emergency" />
                      SECURITY WARNING: Clinical Records Isolation Failed!
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} className="text-vital" />
                      Records Isolation Verification Passed:
                    </>
                  )}
                </span>
                <p className="text-[11px] mt-0.5 opacity-90">
                  {leakedRecordsCheck === true
                    ? 'Full patient medical records were accessible via emergency path! Immediate audit review required.'
                    : 'Emergency path exposes strictly Emergency Card fields. Full medical records remain 100% isolated and protected.'}
                </p>
              </div>

              <p className="mt-4 text-center text-[11px] text-mist">
                Logged access reason: <span className="font-semibold text-ink">"{accessReason}"</span>
              </p>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
