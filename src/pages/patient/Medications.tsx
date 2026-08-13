import { useEffect, useState, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pill, Calendar, Clock, Stethoscope, Search, CheckCircle2, History, AlertCircle,
  Plus, Edit3, Trash2, ShieldCheck, Sparkles, User, AlertTriangle, Check, X, Wand2
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

type Medication = {
  id: string
  patient_id: string
  prescribed_by: string | null
  name: string
  dosage: string
  frequency: string
  duration: string | null
  source: 'doctor_prescribed' | 'patient_added' | 'ai_extracted' | string
  status: 'confirmed' | 'unconfirmed' | string
  start_date: string
  end_date: string | null
  notes: string | null
  created_at: string
}

export default function Medications() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [medications, setMedications] = useState<Medication[]>([])
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'past' | 'unconfirmed' | 'patient' | 'doctor'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMed, setEditingMed] = useState<Medication | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [frequency, setFrequency] = useState('')
  const [duration, setDuration] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const fetchMedications = async () => {
    if (!session?.user?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('patient_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setMedications(data)
    } else if (error) {
      console.error('Failed to fetch medications:', error.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMedications()
  }, [session?.user?.id])

  const todayISO = new Date().toISOString().split('T')[0]

  const isMedActive = (med: Medication) => {
    return !med.end_date || med.end_date >= todayISO
  }

  // Duplicate detection while typing name
  const handleNameChange = (val: string) => {
    setName(val)
    if (!val.trim()) {
      setDuplicateWarning(null)
      return
    }
    const cleanVal = val.trim().toLowerCase()
    const duplicate = medications.find(
      (m) => m.name.toLowerCase() === cleanVal && (!editingMed || m.id !== editingMed.id)
    )
    if (duplicate) {
      setDuplicateWarning(
        `A medication named "${duplicate.name}" (${duplicate.dosage}) is already in your record.`
      )
    } else {
      setDuplicateWarning(null)
    }
  }

  const openAddModal = () => {
    setEditingMed(null)
    setName('')
    setDosage('')
    setFrequency('')
    setDuration('')
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate('')
    setNotes('')
    setDuplicateWarning(null)
    setActionError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (med: Medication) => {
    setEditingMed(med)
    setName(med.name)
    setDosage(med.dosage)
    setFrequency(med.frequency)
    setDuration(med.duration || '')
    setStartDate(med.start_date || new Date().toISOString().split('T')[0])
    setEndDate(med.end_date || '')
    setNotes(med.notes || '')
    setDuplicateWarning(null)
    setActionError(null)
    setIsModalOpen(true)
  }

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return
    if (!name.trim() || !dosage.trim() || !frequency.trim()) {
      setActionError('Medicine name, dosage, and frequency are required.')
      return
    }

    setSubmitting(true)
    setActionError(null)

    try {
      if (editingMed) {
        // Edit existing medication
        let { error } = await supabase
          .from('medications')
          .update({
            name: name.trim(),
            dosage: dosage.trim(),
            frequency: frequency.trim(),
            duration: duration.trim() || null,
            start_date: startDate,
            end_date: endDate || null,
            notes: notes.trim() || null,
          })
          .eq('id', editingMed.id)
          .eq('patient_id', session.user.id)

        if (error) {
          const fallbackRes = await supabase
            .from('medications')
            .update({
              name: name.trim(),
              dosage: dosage.trim(),
              frequency: frequency.trim(),
              start_date: startDate,
              end_date: endDate || null,
              notes: notes.trim() || null,
            })
            .eq('id', editingMed.id)
            .eq('patient_id', session.user.id)

          if (fallbackRes.error) throw new Error(fallbackRes.error.message)
        }

        setActionSuccess(`Updated "${name.trim()}" successfully.`)
      } else {
        // Insert new patient-added medication
        let { error } = await supabase.from('medications').insert({
          patient_id: session.user.id,
          name: name.trim(),
          dosage: dosage.trim(),
          frequency: frequency.trim(),
          duration: duration.trim() || null,
          source: 'patient_added',
          status: 'confirmed',
          start_date: startDate,
          end_date: endDate || null,
          notes: notes.trim() || null,
        })

        if (error) {
          const fallbackRes = await supabase.from('medications').insert({
            patient_id: session.user.id,
            name: name.trim(),
            dosage: dosage.trim(),
            frequency: frequency.trim(),
            start_date: startDate,
            end_date: endDate || null,
            notes: notes.trim() || null,
          })

          if (fallbackRes.error) throw new Error(fallbackRes.error.message)
        }

        setActionSuccess(`Added "${name.trim()}" to your medication list.`)
      }

      setIsModalOpen(false)
      fetchMedications()
    } catch (err: any) {
      setActionError(err.message || 'Failed to save medication.')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirm/Verify AI Extracted Medication
  const handleVerifyMedication = async (med: Medication) => {
    if (!session?.user?.id) return
    try {
      const { error } = await supabase
        .from('medications')
        .update({ status: 'confirmed' })
        .eq('id', med.id)
        .eq('patient_id', session.user.id)

      if (error) throw new Error(error.message)

      setActionSuccess(`Verified and confirmed "${med.name}" into your official medication record.`)
      setMedications((prev) =>
        prev.map((m) => (m.id === med.id ? { ...m, status: 'confirmed' } : m))
      )
    } catch (err: any) {
      setActionError(`Verification failed: ${err.message}`)
    }
  }

  // Delete Medication
  const handleDeleteMedication = async (med: Medication) => {
    if (!session?.user?.id) return
    if (med.prescribed_by && med.source === 'doctor_prescribed') {
      setActionError('Doctor-prescribed medications cannot be deleted by patient.')
      return
    }

    if (!window.confirm(`Are you sure you want to remove "${med.name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', med.id)
        .eq('patient_id', session.user.id)

      if (error) throw new Error(error.message)

      setActionSuccess(`Removed "${med.name}" from your medication list.`)
      setMedications((prev) => prev.filter((m) => m.id !== med.id))
    } catch (err: any) {
      setActionError(`Failed to delete medication: ${err.message}`)
    }
  }

  // Filter logic
  const filteredMeds = medications.filter((m) => {
    const active = isMedActive(m)
    const matchesTab =
      filterTab === 'all' ||
      (filterTab === 'active' && active) ||
      (filterTab === 'past' && !active) ||
      (filterTab === 'unconfirmed' && m.status === 'unconfirmed') ||
      (filterTab === 'patient' && (m.source === 'patient_added' || m.source === 'ai_extracted')) ||
      (filterTab === 'doctor' && (m.source === 'doctor_prescribed' || !!m.prescribed_by))

    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.dosage.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesTab && matchesSearch
  })

  const activeCount = medications.filter(isMedActive).length
  const pastCount = medications.length - activeCount
  const unconfirmedCount = medications.filter((m) => m.status === 'unconfirmed').length

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Ongoing'
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Medications</h1>
          <p className="text-sm text-mist">
            Manage your prescriptions, AI-extracted medication reports, and self-added medicines.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-vital px-4 py-2.5 text-xs font-semibold text-void shadow-glow transition-all hover:brightness-110 shrink-0"
        >
          <Plus size={16} /> Add Medication
        </button>
      </motion.div>

      {/* Action Banners */}
      {actionSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-xl border border-vital/30 bg-vital-soft p-3.5 text-xs text-ink"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-vital shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-mist hover:text-ink">
            <X size={14} />
          </button>
        </motion.div>
      )}

      {actionError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-xl border border-emergency/30 bg-emergency-soft p-3.5 text-xs text-ink"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-emergency shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-mist hover:text-ink">
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* Unconfirmed AI Warning Prompt */}
      {unconfirmedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-500">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-ink">
                {unconfirmedCount} AI-Extracted Medication(s) Pending Verification
              </p>
              <p className="text-[11px] text-mist mt-0.5">
                OCR & Gemini AI extracted new medications from your uploaded documents. Please review and click "Verify / Confirm" below.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterTab('unconfirmed')}
            className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-void shadow-sm hover:brightness-110 shrink-0"
          >
            Review Unconfirmed ({unconfirmedCount})
          </button>
        </motion.div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card delay={0} className="p-4 flex items-center gap-3" hover={false}>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-vital-soft text-vital">
            <Pill size={20} />
          </div>
          <div>
            <p className="text-xs text-mist font-medium">Active Medicines</p>
            <p className="text-xl font-bold text-ink">{activeCount}</p>
          </div>
        </Card>

        <Card delay={0.05} className="p-4 flex items-center gap-3" hover={false}>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-panel2 text-mist">
            <History size={20} />
          </div>
          <div>
            <p className="text-xs text-mist font-medium">Past History</p>
            <p className="text-xl font-bold text-ink">{pastCount}</p>
          </div>
        </Card>

        <Card delay={0.1} className="p-4 flex items-center gap-3" hover={false}>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
            <Wand2 size={20} />
          </div>
          <div>
            <p className="text-xs text-mist font-medium">Pending AI Verification</p>
            <p className="text-xl font-bold text-ink">{unconfirmedCount}</p>
          </div>
        </Card>

        <Card delay={0.15} className="p-4 flex items-center gap-3" hover={false}>
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ai-soft text-ai">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-mist font-medium">Total On Record</p>
            <p className="text-xl font-bold text-ink">{medications.length}</p>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4" hover={false}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            <input
              type="text"
              placeholder="Search medications by name, dosage, or instructions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-edge bg-panel2 py-2 pl-9 pr-4 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { key: 'all', label: `All (${medications.length})` },
              { key: 'active', label: `Active (${activeCount})` },
              { key: 'unconfirmed', label: `Unconfirmed AI (${unconfirmedCount})` },
              { key: 'patient', label: `Patient Added` },
              { key: 'doctor', label: `Doctor Prescribed` },
              { key: 'past', label: `Past` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterTab(t.key as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                  filterTab === t.key
                    ? 'bg-vital text-void font-semibold shadow-sm'
                    : 'bg-panel2 text-mist hover:text-ink hover:bg-edge/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Medications List */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : filteredMeds.length === 0 ? (
        <Card className="p-10 text-center" hover={false}>
          <Pill size={36} className="mx-auto mb-3 text-mist/50" />
          <p className="text-sm font-semibold text-ink">No medications found</p>
          <p className="mt-1 text-xs text-mist">
            {searchQuery || filterTab !== 'all'
              ? 'No medications match your selected filter or search criteria.'
              : 'You have no prescriptions on record. Click "Add Medication" to manually add a medicine.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredMeds.map((med, i) => {
            const active = isMedActive(med)
            const isUnconfirmed = med.status === 'unconfirmed'
            const isDoctor = med.source === 'doctor_prescribed' || !!med.prescribed_by
            const isAI = med.source === 'ai_extracted'

            return (
              <Card
                key={med.id}
                delay={i * 0.03}
                className={`p-5 flex flex-col justify-between ${
                  isUnconfirmed ? 'border-amber-500/50 bg-amber-500/5' : ''
                }`}
                hover={false}
              >
                <div>
                  {/* Top Row: Name, Dosage, Source Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`grid h-10 w-10 place-items-center rounded-xl shrink-0 ${
                          isUnconfirmed
                            ? 'bg-amber-500/20 text-amber-500'
                            : active
                            ? 'bg-vital-soft text-vital'
                            : 'bg-panel2 text-mist'
                        }`}
                      >
                        <Pill size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-ink">{med.name}</h3>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              active
                                ? 'bg-vital-soft text-vital'
                                : 'bg-panel2 text-mist border border-edge'
                            }`}
                          >
                            {active ? 'Active' : 'Past'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-vital mt-0.5">{med.dosage}</p>
                      </div>
                    </div>

                    {/* Source Badge */}
                    <div className="text-right shrink-0">
                      {isDoctor ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-vital-soft border border-vital/30 px-2.5 py-0.5 text-[11px] font-medium text-vital">
                          <Stethoscope size={11} /> Doctor Prescribed
                        </span>
                      ) : isAI ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            isUnconfirmed
                              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-500 animate-pulse'
                              : 'bg-ai-soft border border-ai/30 text-ai'
                          }`}
                        >
                          <Sparkles size={11} /> {isUnconfirmed ? 'AI (Pending Verification)' : 'AI Extracted'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-panel2 border border-edge px-2.5 py-0.5 text-[11px] font-medium text-mist">
                          <User size={11} /> Patient Added
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attributes: Frequency, Duration, Dates */}
                  <div className="mt-4 space-y-2 text-xs text-mist">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-ai shrink-0" />
                      <span>Frequency: <strong className="text-ink font-medium">{med.frequency}</strong></span>
                    </div>

                    {med.duration && (
                      <div className="flex items-center gap-2">
                        <History size={13} className="text-ai shrink-0" />
                        <span>Duration: <strong className="text-ink font-medium">{med.duration}</strong></span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-ai shrink-0" />
                      <span>
                        Dates: {formatDate(med.start_date)} — {formatDate(med.end_date)}
                      </span>
                    </div>

                    {med.notes && (
                      <div className="mt-2 rounded-xl bg-panel2 p-2.5 border border-edge/80 text-[11px]">
                        <p className="font-semibold text-ink mb-0.5">Instructions / Notes:</p>
                        <p className="text-mist leading-relaxed">{med.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification & Action Bar */}
                <div className="mt-4 border-t border-edge/60 pt-3 flex items-center justify-between">
                  {isUnconfirmed ? (
                    <button
                      onClick={() => handleVerifyMedication(med)}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-void hover:brightness-110 shadow-sm"
                    >
                      <Check size={14} /> Verify & Confirm Medication
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-vital">
                      <CheckCircle2 size={12} /> Confirmed on record
                    </span>
                  )}

                  {!isDoctor && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(med)}
                        title="Edit medication"
                        className="rounded-lg border border-edge bg-panel2 p-1.5 text-mist hover:text-ink hover:bg-panel"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteMedication(med)}
                        title="Remove medication"
                        className="rounded-lg border border-edge bg-panel2 p-1.5 text-mist hover:text-emergency hover:bg-emergency-soft"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Manual Add / Edit Medication Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-edge bg-panel p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-edge pb-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-vital-soft">
                    <Pill size={18} className="text-vital" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-ink">
                      {editingMed ? 'Edit Medication' : 'Add Medication Manually'}
                    </h2>
                    <p className="text-xs text-mist">Enter prescription or over-the-counter medicine details.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-mist hover:bg-panel2 hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
                {/* Duplicate Warning */}
                {duplicateWarning && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Duplicate Medicine Warning</p>
                      <p className="text-[11px] mt-0.5">{duplicateWarning}</p>
                    </div>
                  </div>
                )}

                {/* Medicine Name */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Metformin, Amoxicillin, Paracetamol"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
                  />
                </div>

                {/* Dosage & Frequency */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Dosage *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., 500mg, 10ml, 1 tablet"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Frequency *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Twice daily, Every 8 hours"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
                    />
                  </div>
                </div>

                {/* Duration & Start Date */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Duration (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g., 7 days, 1 month, Ongoing"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink focus:border-vital focus:outline-none"
                    />
                  </div>
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">End Date (Leave blank if ongoing)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                {/* Notes / Instructions */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Instructions / Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Take with meals after food, avoid alcohol..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-mist hover:bg-panel2 hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-xl bg-vital px-5 py-2 text-xs font-semibold text-void hover:brightness-110 disabled:opacity-50 shadow-glow"
                  >
                    {submitting ? 'Saving...' : editingMed ? 'Save Changes' : 'Add Medication'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
