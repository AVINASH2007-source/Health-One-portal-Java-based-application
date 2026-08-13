import { useEffect, useState, FormEvent, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Droplet, ShieldAlert, Pill, HeartPulse, QrCode, Phone, User, Plus, X,
  Save, CheckCircle2, AlertCircle, Edit3, Eye, Copy, ExternalLink
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

type EmergencyCardData = {
  patient_id: string
  blood_type: string
  allergies: string[]
  conditions: string[]
  emergency_contact_name: string
  emergency_contact_phone: string
  updated_at?: string
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function EmergencyCard() {
  const { session, name } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form State
  const [bloodType, setBloodType] = useState('O+')
  const [allergies, setAllergies] = useState<string[]>(['Penicillin'])
  const [conditions, setConditions] = useState<string[]>(['Type 2 Diabetes'])
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // Tag Input transient fields
  const [allergyInput, setAllergyInput] = useState('')
  const [conditionInput, setConditionInput] = useState('')

  // View state: 'edit' or 'preview'
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview')
  const [copiedLink, setCopiedLink] = useState(false)

  const patientId = session?.user?.id || ''
  const publicEmergencyUrl = `${window.location.origin}/emergency/${patientId}`

  useEffect(() => {
    if (!patientId) return

    let active = true
    const fetchCard = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('emergency_cards')
        .select('*')
        .eq('patient_id', patientId)
        .single()

      if (active) {
        if (!error && data) {
          setBloodType(data.blood_type || 'O+')
          setAllergies(Array.isArray(data.allergies) ? data.allergies : [])
          setConditions(Array.isArray(data.conditions) ? data.conditions : [])
          setContactName(data.emergency_contact_name || '')
          setContactPhone(data.emergency_contact_phone || '')
        }
        setLoading(false)
      }
    }

    fetchCard()

    return () => {
      active = false
    }
  }, [patientId])

  // Tag helper functions
  const addAllergy = () => {
    const trimmed = allergyInput.trim()
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed])
      setAllergyInput('')
    }
  }

  const removeAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index))
  }

  const handleAllergyKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addAllergy()
    }
  }

  const addCondition = () => {
    const trimmed = conditionInput.trim()
    if (trimmed && !conditions.includes(trimmed)) {
      setConditions([...conditions, trimmed])
      setConditionInput('')
    }
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const handleConditionKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addCondition()
    }
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!patientId) return

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const payload: EmergencyCardData = {
        patient_id: patientId,
        blood_type: bloodType,
        allergies,
        conditions,
        emergency_contact_name: contactName.trim(),
        emergency_contact_phone: contactPhone.trim(),
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('emergency_cards').upsert(payload, {
        onConflict: 'patient_id',
      })

      if (error) throw new Error(error.message)

      setSaveSuccess(true)
      setActiveTab('preview')
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update emergency card.')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicEmergencyUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Emergency Health Card</h1>
          <p className="text-sm text-mist">
            Life-critical medical data accessible by authorized first responders.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-panel2 p-1 rounded-xl border border-edge">
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

      {/* Success / Error Banners */}
      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-vital/30 bg-vital-soft p-3.5 text-xs font-medium text-ink"
        >
          <CheckCircle2 size={16} className="text-vital" />
          <span>Emergency health card updated successfully!</span>
        </motion.div>
      )}

      {saveError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-emergency/30 bg-emergency-soft p-3.5 text-xs text-emergency"
        >
          <AlertCircle size={16} />
          <span>{saveError}</span>
        </motion.div>
      )}

      {loading ? (
        <Skeleton className="h-96 w-full rounded-3xl" />
      ) : activeTab === 'preview' ? (
        /* Preview Tab */
        <div className="space-y-6">
          <Card className="relative overflow-hidden p-6" glow="emergency" hover={false}>
            <div className="mb-5 flex items-center justify-between border-b border-edge/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emergency-soft text-emergency">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <p className="font-display text-base font-bold text-ink">{name || 'Patient'} — Emergency Card</p>
                  <p className="text-xs text-mist">ID: {patientId.slice(0, 8)}...</p>
                </div>
              </div>
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                className="h-2.5 w-2.5 rounded-full bg-emergency shadow-glow-em"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 text-sm">
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
                  {conditions.length === 0 ? (
                    <p className="text-xs text-mist italic">No chronic medical conditions listed.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {conditions.map((cond) => (
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

            {/* QR Code section */}
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge/80 bg-panel2/50 py-6 text-center">
              <div className="relative grid h-32 w-32 place-items-center rounded-2xl bg-panel border border-edge shadow-md">
                <QrCode size={80} className="text-mist" />
                <motion.div
                  className="absolute inset-x-2 h-0.5 bg-vital shadow-glow"
                  animate={{ top: ['10%', '85%', '10%'] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                />
              </div>
              <p className="mt-3 text-xs font-medium text-ink">Emergency Responder Access URL</p>
              <p className="text-[11px] text-mist font-mono max-w-xs truncate">{publicEmergencyUrl}</p>

              <div className="mt-3 flex items-center gap-2">
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
              </div>
            </div>
          </Card>
        </div>
      ) : (
        /* Edit Form Tab */
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

            {/* Allergies Tag Input */}
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
                  onClick={addAllergy}
                  className="rounded-xl bg-panel2 border border-edge px-3 py-2 text-xs font-semibold text-ink hover:bg-vital/10 hover:text-vital"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allergies.map((alg, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-full bg-emergency-soft border border-emergency/30 px-3 py-1 text-xs font-medium text-emergency"
                  >
                    {alg}
                    <button type="button" onClick={() => removeAllergy(index)} className="hover:opacity-75">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Conditions Tag Input */}
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
                  onClick={addCondition}
                  className="rounded-xl bg-panel2 border border-edge px-3 py-2 text-xs font-semibold text-ink hover:bg-vital/10 hover:text-vital"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {conditions.map((cond, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-full bg-vital-soft border border-vital/30 px-3 py-1 text-xs font-medium text-vital"
                  >
                    {cond}
                    <button type="button" onClick={() => removeCondition(index)} className="hover:opacity-75">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-edge">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Emergency Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Doe (Spouse)"
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
