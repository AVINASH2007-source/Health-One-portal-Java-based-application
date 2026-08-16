import { useEffect, useState, FormEvent, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import {
  Droplet,
  ShieldAlert,
  Pill,
  HeartPulse,
  Phone,
  Plus,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Eye,
  Copy,
  ExternalLink,
  RefreshCw,
  Clock,
  Lock,
  Building2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import {
  getEmergencyProfile,
  upsertEmergencyProfile,
  regenerateEmergencyCode,
  getRecentEmergencyAccess,
  EmergencyAccessLog,
} from '../../lib/api/patientEmergency'
import { getPatientRecords, Allergy, Disease } from '../../lib/api/patientRecords'
import { getActiveMedications, Medication } from '../../lib/api/patientOverview'

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function EmergencyCard() {
  const { session, name } = useAuth()
  const patientId = session?.user?.id || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Profile data
  const [bloodType, setBloodType] = useState('O+')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [emergencyCode, setEmergencyCode] = useState('')

  // Related patient records
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [conditions, setConditions] = useState<Disease[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [accessLogs, setAccessLogs] = useState<EmergencyAccessLog[]>([])

  // Edit Form Tag Input arrays
  const [allergyList, setAllergyList] = useState<string[]>([])
  const [conditionList, setConditionList] = useState<string[]>([])
  const [allergyInput, setAllergyInput] = useState('')
  const [conditionInput, setConditionInput] = useState('')

  // View state: 'preview' or 'edit'
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview')
  const [copiedLink, setCopiedLink] = useState(false)

  const publicEmergencyUrl = emergencyCode
    ? `${window.location.origin}/emergency/${emergencyCode}`
    : `${window.location.origin}/emergency/${patientId}`

  useEffect(() => {
    if (!patientId) return

    let isMounted = true
    const loadEmergencyCardData = async () => {
      setLoading(true)
      setSaveError(null)

      try {
        const [profile, recordsData, activeMeds, logs] = await Promise.all([
          getEmergencyProfile(patientId),
          getPatientRecords(patientId),
          getActiveMedications(patientId),
          getRecentEmergencyAccess(patientId),
        ])

        if (!isMounted) return

        setBloodType(profile.blood_group || 'O+')
        setContactName(profile.emergency_contact_name || '')
        setContactPhone(profile.emergency_contact_phone || '')
        setEmergencyCode(profile.emergency_code)

        setAllergies(recordsData.allergies)
        setConditions(recordsData.diseases.filter((d) => d.status !== 'resolved'))
        setMedications(activeMeds)
        setAccessLogs(logs)

        setAllergyList(recordsData.allergies.map((a) => a.allergen))
        setConditionList(recordsData.diseases.filter((d) => d.status !== 'resolved').map((d) => d.condition_name))

        setLoading(false)
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load emergency profile:', err)
        setSaveError(err instanceof Error ? err.message : 'Unable to load emergency profile data.')
        setLoading(false)
      }
    }

    loadEmergencyCardData()

    return () => {
      isMounted = false
    }
  }, [patientId])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!patientId) return

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)

    try {
      const updated = await upsertEmergencyProfile(patientId, {
        blood_group: bloodType,
        emergency_contact_name: contactName.trim(),
        emergency_contact_phone: contactPhone.trim(),
        emergency_code: emergencyCode,
      })

      setBloodType(updated.blood_group || bloodType)
      setContactName(updated.emergency_contact_name || '')
      setContactPhone(updated.emergency_contact_phone || '')
      setSaveSuccess('Emergency health card updated successfully!')
      setActiveTab('preview')
      setTimeout(() => setSaveSuccess(null), 4000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update emergency card.')
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerateCode = async () => {
    if (!patientId || regenerating) return
    const confirmed = window.confirm(
      'Are you sure you want to regenerate your Emergency Code?\n\nExisting printed QR codes or old saved emergency links will stop working immediately.'
    )
    if (!confirmed) return

    setRegenerating(true)
    setSaveError(null)

    try {
      const newCode = await regenerateEmergencyCode(patientId)
      setEmergencyCode(newCode)
      setSaveSuccess('Emergency QR Code regenerated! Previous QR codes have been invalidated.')
      setTimeout(() => setSaveSuccess(null), 4000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to regenerate code.')
    } finally {
      setRegenerating(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicEmergencyUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  // Tag helper functions for edit form
  const addAllergyTag = () => {
    const trimmed = allergyInput.trim()
    if (trimmed && !allergyList.includes(trimmed)) {
      setAllergyList([...allergyList, trimmed])
      setAllergyInput('')
    }
  }

  const removeAllergyTag = (index: number) => {
    setAllergyList(allergyList.filter((_, i) => i !== index))
  }

  const handleAllergyKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addAllergyTag()
    }
  }

  const addConditionTag = () => {
    const trimmed = conditionInput.trim()
    if (trimmed && !conditionList.includes(trimmed)) {
      setConditionList([...conditionList, trimmed])
      setConditionInput('')
    }
  }

  const removeConditionTag = (index: number) => {
    setConditionList(conditionList.filter((_, i) => i !== index))
  }

  const handleConditionKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addConditionTag()
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header & Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Emergency Health Card</h1>
          <p className="text-sm text-mist">
            Life-critical medical data accessible by authorized first responders via QR scan.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-panel2 p-1 rounded-xl border border-edge shrink-0">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'preview' ? 'bg-vital text-void font-semibold shadow-sm' : 'text-mist hover:text-ink'
            }`}
          >
            <Eye size={14} /> Preview Card
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'edit' ? 'bg-vital text-void font-semibold shadow-sm' : 'text-mist hover:text-ink'
            }`}
          >
            <Edit3 size={14} /> Edit Details
          </button>
        </div>
      </motion.div>

      {/* Banners */}
      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-vital/30 bg-vital-soft p-3.5 text-xs font-medium text-ink"
        >
          <CheckCircle2 size={16} className="text-vital shrink-0" />
          <span>{saveSuccess}</span>
        </motion.div>
      )}

      {saveError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-emergency/30 bg-emergency-soft p-3.5 text-xs text-emergency"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{saveError}</span>
        </motion.div>
      )}

      {loading ? (
        <Skeleton className="h-96 w-full rounded-3xl" />
      ) : activeTab === 'preview' ? (
        <div className="space-y-6">
          {/* Main Card */}
          <Card className="relative overflow-hidden p-6" glow="emergency" hover={false}>
            <div className="mb-5 flex items-center justify-between border-b border-edge/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emergency-soft text-emergency">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="font-display text-base font-bold text-ink">{name || 'Patient'} — Emergency Card</p>
                  <p className="text-xs text-mist font-mono">Code: {emergencyCode || 'No Code Set'}</p>
                </div>
              </div>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                className="h-2.5 w-2.5 rounded-full bg-emergency shadow-glow-em"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
              <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge">
                <Droplet size={18} className="text-emergency shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-mist font-medium">Blood Group</p>
                  <p className="text-base font-bold text-ink">{bloodType}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge">
                <Phone size={18} className="text-vital shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-mist font-medium">Emergency Contact</p>
                  <p className="text-sm font-semibold text-ink">{contactName || 'Not specified'}</p>
                  {contactPhone && <p className="text-xs text-mist font-mono mt-0.5">{contactPhone}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge sm:col-span-2">
                <ShieldAlert size={18} className="text-emergency shrink-0 mt-0.5" />
                <div className="w-full">
                  <p className="text-xs text-mist font-medium mb-1.5">Known Allergies</p>
                  {allergies.length === 0 ? (
                    <p className="text-xs text-mist italic">No known drug allergies listed.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {allergies.map((alg) => (
                        <span
                          key={alg.id}
                          className="rounded-full bg-emergency-soft border border-emergency/30 px-2.5 py-0.5 text-xs font-semibold text-emergency"
                        >
                          {alg.allergen} ({alg.severity})
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
                  {conditions.length === 0 ? (
                    <p className="text-xs text-mist italic">No active chronic medical conditions listed.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {conditions.map((cond) => (
                        <span
                          key={cond.id}
                          className="rounded-full bg-vital-soft border border-vital/30 px-2.5 py-0.5 text-xs font-semibold text-vital"
                        >
                          {cond.condition_name} ({cond.status})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-panel2 p-3.5 border border-edge sm:col-span-2">
                <Pill size={18} className="text-ai shrink-0 mt-0.5" />
                <div className="w-full">
                  <p className="text-xs text-mist font-medium mb-1.5">Current Active Medications</p>
                  {medications.length === 0 ? (
                    <p className="text-xs text-mist italic">No active medications listed.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {medications.map((m) => (
                        <span
                          key={m.id}
                          className="rounded-full bg-ai-soft border border-ai/30 px-2.5 py-0.5 text-xs font-medium text-ai"
                        >
                          {m.name} ({m.dose || 'Standard dose'})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Real Scannable SVG QR Code section */}
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge/80 bg-panel2/50 p-6 text-center">
              <div className="relative grid p-3 place-items-center rounded-2xl bg-white border border-edge shadow-md">
                <QRCodeSVG
                  value={publicEmergencyUrl}
                  size={140}
                  level="M"
                  includeMargin={false}
                />
                <motion.div
                  className="absolute inset-x-2 h-0.5 bg-vital shadow-glow"
                  animate={{ top: ['10%', '85%', '10%'] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                />
              </div>
              <p className="mt-3 text-xs font-semibold text-ink">Scannable Emergency Responder QR Code</p>
              <p className="text-[11px] text-mist font-mono max-w-xs truncate">{publicEmergencyUrl}</p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel px-3 py-1.5 text-xs font-medium text-ink hover:bg-panel2"
                >
                  <Copy size={13} /> {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
                <a
                  href={publicEmergencyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel px-3 py-1.5 text-xs font-medium text-vital hover:bg-vital-soft"
                >
                  <ExternalLink size={13} /> Test Public Link
                </a>
                <button
                  onClick={handleRegenerateCode}
                  disabled={regenerating}
                  className="flex items-center gap-1.5 rounded-xl border border-emergency/30 bg-emergency-soft px-3 py-1.5 text-xs font-medium text-emergency hover:bg-emergency/20 transition-all disabled:opacity-50"
                  title="Regenerate QR Code"
                >
                  <RefreshCw size={13} className={regenerating ? 'animate-spin' : ''} />
                  <span>Regenerate Code</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Recent Access Log section */}
          <Card className="p-5" hover={false}>
            <div className="mb-4 flex items-center justify-between border-b border-edge/60 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-vital" />
                <h3 className="text-sm font-semibold text-ink">Recent Responder Access Audit Log</h3>
              </div>
              <span className="rounded-full bg-vital-soft px-2 py-0.5 text-[10px] font-semibold text-vital">
                {accessLogs.length} Scans
              </span>
            </div>

            {accessLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-mist flex flex-col items-center gap-1">
                <Lock size={20} className="text-mist/60" />
                <p>No responder accesses logged yet.</p>
                <p className="text-[11px] text-mist/70">
                  Every scan of your QR code or emergency access attempt will be audited here in real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {accessLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-xl border border-edge bg-panel2 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-vital-soft text-vital font-bold text-[10px]">
                        {log.access_method === 'qr' ? 'QR' : 'CODE'}
                      </div>
                      <div>
                        <p className="font-medium text-ink">
                          {log.access_method === 'qr' ? 'Scanned via QR Code' : 'Accessed via Short Emergency Code'}
                        </p>
                        {log.note && <p className="text-[11px] text-mist">{log.note}</p>}
                      </div>
                    </div>
                    <span className="text-[11px] text-mist shrink-0">{formatDate(log.accessed_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Edit Details Form */
        <Card className="p-6" hover={false}>
          <form onSubmit={handleSave} className="space-y-5">
            {/* Blood Type Select */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Blood Type</label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {BLOOD_TYPES.map((bt) => (
                  <button
                    type="button"
                    key={bt}
                    onClick={() => setBloodType(bt)}
                    className={`rounded-xl py-2 text-xs font-bold transition-all border ${
                      bloodType === bt
                        ? 'border-emergency bg-emergency text-void shadow-glow-em'
                        : 'border-edge bg-panel2 text-ink hover:bg-edge/40'
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergies Display / Tag Input */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Drug / Food Allergies <span className="text-mist font-normal">(press Enter or comma to add)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Latex, Peanuts"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={handleAllergyKeyDown}
                  className="flex-1 rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addAllergyTag}
                  className="rounded-xl bg-panel2 border border-edge px-3 py-2 text-xs font-semibold text-ink hover:bg-vital/10 hover:text-vital"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allergyList.map((alg, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-full bg-emergency-soft border border-emergency/30 px-3 py-1 text-xs font-medium text-emergency"
                  >
                    {alg}
                    <button type="button" onClick={() => removeAllergyTag(index)} className="hover:opacity-75">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Conditions Display / Tag Input */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Chronic Medical Conditions <span className="text-mist font-normal">(press Enter or comma to add)</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="e.g. Diabetes Type 2, Hypertension, Asthma"
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  onKeyDown={handleConditionKeyDown}
                  className="flex-1 rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addConditionTag}
                  className="rounded-xl bg-panel2 border border-edge px-3 py-2 text-xs font-semibold text-ink hover:bg-vital/10 hover:text-vital"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {conditionList.map((cond, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-full bg-vital-soft border border-vital/30 px-3 py-1 text-xs font-medium text-vital"
                  >
                    {cond}
                    <button type="button" onClick={() => removeConditionTag(index)} className="hover:opacity-75">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Emergency Contact Information */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-edge">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Emergency Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Johnson (Spouse)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Emergency Contact Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. +1 (555) 019-2834"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-edge">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-vital px-6 py-2.5 text-xs font-semibold text-void hover:brightness-110 disabled:opacity-50 shadow-glow"
              >
                <Save size={15} /> {saving ? 'Saving...' : 'Save Emergency Card'}
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
