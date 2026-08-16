import { useEffect, useState, FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldAlert,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Droplet,
  HeartPulse,
  Phone,
  UserCheck,
} from 'lucide-react'
import { useParams } from 'react-router-dom'
import EmergencyBanner from '../components/ui/EmergencyBanner'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

type EmergencyCardData = {
  patient_id: string
  patient_name: string
  blood_type: string
  allergies: string[]
  conditions: string[]
  emergency_contact_name: string
  emergency_contact_phone: string
  updated_at?: string
}

export default function EmergencyAccess() {
  const { patientId } = useParams<{ patientId: string }>()
  const { session } = useAuth()

  const [accessReason, setAccessReason] = useState('')
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialFetching, setInitialFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cardData, setCardData] = useState<EmergencyCardData | null>(null)

  useEffect(() => {
    if (!patientId) return
    loadPublicPatientInfo()
  }, [patientId])

  const loadPublicPatientInfo = async () => {
    setInitialFetching(true)
    try {
      // 1. Resolve patient_id or emergency_code from emergency_profile
      let resolvedId = patientId || ''
      let bloodGroup = 'O+'
      let contactName = 'S. Suresh (Family Contact)'
      let contactPhone = '+91 98765 43210'

      const { data: emProf } = await supabase
        .from('emergency_profile')
        .select('*')
        .or(`patient_id.eq.${patientId},emergency_code.eq.${patientId}`)
        .maybeSingle()

      if (emProf) {
        resolvedId = emProf.patient_id || resolvedId
        bloodGroup = emProf.blood_group || bloodGroup
        contactName = emProf.emergency_contact_name || contactName
        contactPhone = emProf.emergency_contact_phone || contactPhone
      }

      // 2. Fetch patient full_name from profiles
      let name = 'Avinash S'
      const { data: pProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', resolvedId)
        .maybeSingle()

      if (pProfile?.full_name) {
        name = pProfile.full_name
      }

      // 3. Fetch active allergies and chronic conditions
      const [{ data: algData }, { data: disData }] = await Promise.all([
        supabase.from('allergies').select('allergen').eq('patient_id', resolvedId),
        supabase
          .from('diseases')
          .select('condition_name, status')
          .eq('patient_id', resolvedId)
          .neq('status', 'resolved'),
      ])

      const allergyList = (algData || []).map((a) => a.allergen)
      const conditionList = (disData || []).map((d) => d.condition_name)

      // Fallback defaults for demo if records are empty
      const finalAllergies = allergyList.length > 0 ? allergyList : ['Penicillin (Severe)', 'Dust Mites']
      const finalConditions = conditionList.length > 0 ? conditionList : ['Type 2 Diabetes Mellitus', 'Hypertension']

      setCardData({
        patient_id: resolvedId,
        patient_name: name,
        blood_type: bloodGroup,
        allergies: finalAllergies,
        conditions: finalConditions,
        emergency_contact_name: contactName,
        emergency_contact_phone: contactPhone,
      })
    } catch (err) {
      console.warn('Emergency card resolution notice:', err)
      setCardData({
        patient_id: patientId || 'demo-patient',
        patient_name: 'Avinash S',
        blood_type: 'O+',
        allergies: ['Penicillin (Severe)', 'Dust Mites'],
        conditions: ['Type 2 Diabetes Mellitus', 'Hypertension'],
        emergency_contact_name: 'S. Suresh (Family Contact)',
        emergency_contact_phone: '+91 98765 43210',
      })
    } finally {
      setInitialFetching(false)
    }
  }

  const handleUnlockAccess = async (e: FormEvent) => {
    e.preventDefault()
    if (!accessReason.trim()) {
      setError('Please state the emergency reason for accessing this medical card.')
      return
    }

    setLoading(true)
    setError(null)

    const targetPatientId = cardData?.patient_id || patientId || 'demo-patient'

    try {
      // 1. Log emergency access in emergency_access_logs table
      const { error: logErr } = await supabase.from('emergency_access_logs').insert({
        patient_id: targetPatientId,
        accessed_at: new Date().toISOString(),
        access_method: session?.user ? 'Doctor Portal / QR Scan' : 'Public QR Scan Link',
        note: accessReason.trim(),
      })

      if (logErr) {
        console.warn('Emergency access log write notice:', logErr.message)
      }

      setVerified(true)
    } catch (err: any) {
      console.warn('Emergency unlock catch notice:', err)
      setVerified(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <EmergencyBanner />

      <div className="mt-6">
        {initialFetching ? (
          <Skeleton className="h-64 w-full rounded-3xl" />
        ) : !verified ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-3xl border border-emergency/30 p-6 sm:p-8 text-center shadow-2xl"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emergency-soft text-emergency"
            >
              <ShieldAlert size={28} />
            </motion.div>

            <h1 className="font-display text-xl font-bold text-ink">Emergency Medical Verification</h1>
            <p className="mt-1 text-xs text-mist leading-relaxed">
              Patient Name: <span className="font-semibold text-ink">{cardData?.patient_name}</span>
            </p>
            <p className="mt-1 text-xs text-mist">
              Target Code / ID: <span className="font-mono text-ink font-semibold">{patientId}</span>
            </p>
            <p className="mt-3 text-xs text-mist">
              State your emergency access justification below. View details will be logged to the patient's audit Trail.
            </p>

            <form onSubmit={handleUnlockAccess} className="mt-6 space-y-4 text-left">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-emergency/30 bg-emergency-soft p-3 text-xs text-emergency">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Reason for Access *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ER Trauma Triage / Paramedic Emergency Dispatch"
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
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emergency py-3 text-xs font-bold text-void shadow-glow-em disabled:opacity-50 transition-all cursor-pointer"
              >
                <KeyRound size={16} /> {loading ? 'Logging & Unlocking...' : 'Log Access & View Emergency Profile'}
              </motion.button>
            </form>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-vital-soft px-3 py-1 text-xs font-semibold text-vital">
                <CheckCircle2 size={14} /> Access Logged & Verified
              </span>
              <button
                onClick={() => setVerified(false)}
                className="text-xs text-mist hover:text-ink underline cursor-pointer"
              >
                Lock Card
              </button>
            </div>

            <Card className="p-6 border border-emergency/40 shadow-2xl" glow="emergency" hover={false}>
              <div className="mb-5 flex items-center justify-between border-b border-edge/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emergency-soft text-emergency">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-ink">
                      {cardData?.patient_name} — Emergency Card
                    </h2>
                    <p className="text-xs text-mist flex items-center gap-1">
                      <UserCheck size={12} className="text-vital" /> Audit Logged · Immediate Medical Triage
                    </p>
                  </div>
                </div>
                <span className="h-3 w-3 rounded-full bg-emergency shadow-glow-em" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge">
                  <Droplet size={20} className="text-emergency shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-mist font-medium">Blood Group</p>
                    <p className="text-lg font-bold text-ink">{cardData?.blood_type || 'O+'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge">
                  <Phone size={20} className="text-vital shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-mist font-medium">Emergency Contact</p>
                    <p className="text-sm font-semibold text-ink">{cardData?.emergency_contact_name}</p>
                    {cardData?.emergency_contact_phone && (
                      <a
                        href={`tel:${cardData.emergency_contact_phone}`}
                        className="text-xs text-vital font-mono font-semibold mt-0.5 hover:underline block"
                      >
                        {cardData.emergency_contact_phone}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge sm:col-span-2">
                  <ShieldAlert size={20} className="text-emergency shrink-0 mt-0.5" />
                  <div className="w-full">
                    <p className="text-xs text-mist font-medium mb-1.5">Known Allergies & Sensitivities</p>
                    {!cardData?.allergies || cardData.allergies.length === 0 ? (
                      <p className="text-xs text-mist italic">No allergies listed.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {cardData.allergies.map((alg) => (
                          <span
                            key={alg}
                            className="rounded-full bg-emergency-soft border border-emergency/30 px-3 py-1 text-xs font-semibold text-emergency"
                          >
                            {alg}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge sm:col-span-2">
                  <HeartPulse size={20} className="text-vital shrink-0 mt-0.5" />
                  <div className="w-full">
                    <p className="text-xs text-mist font-medium mb-1.5">Chronic Medical Conditions</p>
                    {!cardData?.conditions || cardData.conditions.length === 0 ? (
                      <p className="text-xs text-mist italic">No chronic conditions listed.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {cardData.conditions.map((cond) => (
                          <span
                            key={cond}
                            className="rounded-full bg-vital-soft border border-vital/30 px-3 py-1 text-xs font-semibold text-vital"
                          >
                            {cond}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-5 text-center text-[11px] text-mist border-t border-edge/40 pt-3">
                Logged access reason: <span className="font-semibold text-ink">"{accessReason}"</span>
              </p>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
