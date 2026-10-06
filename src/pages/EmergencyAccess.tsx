import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldAlert,
  Droplet,
  Phone,
  HeartPulse,
  Pill,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Lock,
} from 'lucide-react'
import { useParams, Link } from 'react-router-dom'
import Card from '../components/ui/Card'
import Skeleton from '../components/ui/Skeleton'
import { fetchPublicEmergencyData, PublicEmergencyData } from '../lib/api/patientEmergency'

export default function EmergencyAccess() {
  const { token, patientId } = useParams<{ token?: string; patientId?: string }>()
  const lookupToken = token || patientId || ''

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PublicEmergencyData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lookupToken) {
      setLoading(false)
      setError('No emergency token specified.')
      return
    }

    let isMounted = true

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchPublicEmergencyData(lookupToken)
        if (!isMounted) return

        if (!result) {
          setError('This emergency token is invalid, expired, or has been revoked by the patient.')
        } else {
          setData(result)
        }
      } catch (err) {
        if (!isMounted) return
        setError('Unable to retrieve emergency response packet. Please try again.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [lookupToken])

  return (
    <div className="min-h-screen bg-void text-ink font-body p-4 sm:p-6 flex flex-col items-center justify-start">
      {/* Top Banner (First Responder Alert) */}
      <header className="w-full max-w-lg mb-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emergency/40 bg-emergency-soft px-3.5 py-1.5 text-xs font-bold text-emergency shadow-glow-em">
          <ShieldAlert size={15} /> FIRST RESPONDER EMERGENCY ACCESS
        </div>
        <p className="text-[11px] text-mist mt-1">
          Cryptographically signed public medical profile. Non-emergency records remain strictly isolated.
        </p>
      </header>

      {/* Main Responsive Container */}
      <main className="w-full max-w-lg space-y-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : error || !data ? (
          /* 404 / Token Invalid View */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl border border-emergency/30 bg-panel p-8 text-center shadow-2xl space-y-4"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emergency-soft text-emergency">
              <Lock size={32} />
            </div>
            <h1 className="font-display text-xl font-bold text-ink">404: Emergency Token Invalid</h1>
            <p className="text-xs text-mist leading-relaxed max-w-sm mx-auto">
              {error || 'This emergency QR code has expired or was revoked when the patient regenerated their credentials.'}
            </p>

            <div className="rounded-xl border border-edge bg-panel2 p-3 text-[11px] text-mist font-mono break-all">
              Token: {lookupToken || 'None'}
            </div>

            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-xs font-semibold text-vital hover:underline"
              >
                <ArrowLeft size={14} /> Return to Health-One Portal
              </Link>
            </div>
          </motion.div>
        ) : (
          /* Valid Emergency Data Display */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* 1. Header Card: Patient Name & Blood Group */}
            <Card className="p-6 border border-emergency/40 shadow-2xl" glow="emergency" hover={false}>
              <div className="flex items-start justify-between gap-4 border-b border-edge/60 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-mist">
                    Emergency Patient
                  </span>
                  <h1 className="font-display text-2xl font-black text-ink">{data.patient_name}</h1>
                </div>

                {/* Big Blood Group Badge */}
                <div className="flex flex-col items-center justify-center rounded-2xl bg-emergency px-4 py-2 text-void shadow-glow-em shrink-0">
                  <Droplet size={20} className="fill-current" />
                  <span className="font-display text-xl font-black leading-tight mt-0.5">
                    {data.blood_group}
                  </span>
                </div>
              </div>

              {/* 2. Emergency Contacts with Tap-to-Call */}
              <div className="mt-4">
                <p className="text-xs font-bold text-mist uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Phone size={13} className="text-vital" /> Emergency Contact (Tap to Call)
                </p>

                {data.emergency_contact_phone ? (
                  <a
                    href={`tel:${data.emergency_contact_phone.replace(/\s+/g, '')}`}
                    className="flex items-center justify-between rounded-2xl border border-vital/40 bg-vital-soft p-3.5 hover:bg-vital/20 transition-all cursor-pointer group"
                  >
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {data.emergency_contact_name || 'Primary Contact'}
                      </p>
                      <p className="text-xs text-mist">{data.emergency_contact_relation || 'Family Contact'}</p>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-vital px-3 py-2 text-xs font-bold text-void group-hover:scale-105 transition-transform shadow-glow">
                      <Phone size={14} className="fill-current" />
                      <span>{data.emergency_contact_phone}</span>
                    </div>
                  </a>
                ) : (
                  <p className="text-xs text-mist italic">No emergency contact number listed.</p>
                )}
              </div>
            </Card>

            {/* 3. Known Allergies & Sensitivities */}
            <Card className="p-5" hover={false}>
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={16} className="text-emergency" />
                <h2 className="font-display text-sm font-bold text-ink">Allergies & Sensitivities</h2>
              </div>

              {data.allergies.length === 0 ? (
                <p className="text-xs text-mist italic">No known drug allergies reported.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.allergies.map((alg, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-xl border border-emergency/30 bg-emergency-soft px-3 py-1.5 text-xs font-bold text-emergency"
                    >
                      <span>{alg.allergen}</span>
                      {alg.severity && <span className="opacity-80 text-[10px]">({alg.severity})</span>}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {/* 4. Current Active Medications */}
            <Card className="p-5" hover={false}>
              <div className="flex items-center gap-2 mb-3">
                <Pill size={16} className="text-ai" />
                <h2 className="font-display text-sm font-bold text-ink">Current Active Medications</h2>
              </div>

              {data.medications.length === 0 ? (
                <p className="text-xs text-mist italic">No current medications recorded.</p>
              ) : (
                <div className="space-y-2">
                  {data.medications.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-edge bg-panel2 p-2.5 text-xs"
                    >
                      <span className="font-semibold text-ink">{m.name}</span>
                      <span className="text-mist font-mono text-[11px]">
                        {m.dose || 'Standard dose'} {m.frequency ? `· ${m.frequency}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* 5. Chronic Conditions */}
            <Card className="p-5" hover={false}>
              <div className="flex items-center gap-2 mb-3">
                <HeartPulse size={16} className="text-vital" />
                <h2 className="font-display text-sm font-bold text-ink">Chronic Medical Conditions</h2>
              </div>

              {data.conditions.length === 0 ? (
                <p className="text-xs text-mist italic">No chronic medical conditions listed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.conditions.map((c, i) => (
                    <span
                      key={i}
                      className="rounded-xl border border-vital/30 bg-vital-soft px-3 py-1.5 text-xs font-bold text-vital"
                    >
                      {c.condition_name}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {/* 6. Past Surgeries */}
            {data.surgeries && data.surgeries.length > 0 && (
              <Card className="p-5" hover={false}>
                <div className="flex items-center gap-2 mb-3">
                  <Scissors size={16} className="text-mist" />
                  <h2 className="font-display text-sm font-bold text-ink">Past Surgeries & Procedures</h2>
                </div>

                <div className="space-y-2">
                  {data.surgeries.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-edge bg-panel2 p-2.5 text-xs"
                    >
                      <span className="font-semibold text-ink">{s.surgery_type}</span>
                      <span className="text-mist text-[11px]">{s.surgery_date || 'Past'}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Audit Log Notification Footer */}
            <footer className="text-center text-[11px] text-mist py-4 space-y-1">
              <p className="flex items-center justify-center gap-1 font-semibold text-vital">
                <CheckCircle2 size={13} /> Access event logged to HIPAA Audit Trail
              </p>
              <p>Health-One Emergency Access Protocol · Zero Full Records Exposed</p>
            </footer>
          </motion.div>
        )}
      </main>
    </div>
  )
}
