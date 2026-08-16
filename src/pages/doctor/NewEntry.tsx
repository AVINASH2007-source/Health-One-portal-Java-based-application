import { useState, useEffect, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardPlus, Stethoscope, Pill, AlertTriangle, CheckCircle2, User, FileText, Calendar, Plus, Trash2, ArrowRight } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

type PatientOption = {
  id: string
  name: string
  email: string
}

type PrescriptionDraft = {
  id: string
  name: string
  dosage: string
  frequency: string
  duration: string
  notes: string
}

export default function NewEntry() {
  const navigate = useNavigate()
  const { user, name: doctorName } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPatientId = searchParams.get('patientId') || ''

  const [patients, setPatients] = useState<PatientOption[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId)
  const [selectedPatientName, setSelectedPatientName] = useState<string>('Patient')
  
  // Entry Type: 'visit' (Clinical Note / Diagnosis) or 'prescription' (Rx Builder)
  const [entryType, setEntryType] = useState<'visit' | 'prescription'>('visit')

  // Visit Note State
  const [visitTitle, setVisitTitle] = useState('')
  const [recordType, setRecordType] = useState('consultation')
  const [diagnosisNotes, setDiagnosisNotes] = useState('')
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().split('T')[0])

  // Prescription List State
  const [prescriptions, setPrescriptions] = useState<PrescriptionDraft[]>([
    { id: '1', name: '', dosage: '', frequency: 'Twice daily', duration: '7 days', notes: '' },
  ])

  // Patient Context for Interaction Checker
  const [existingMeds, setExistingMeds] = useState<string[]>([])
  const [knownAllergies, setKnownAllergies] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // 1. Fetch available patients
  useEffect(() => {
    let active = true
    const fetchPatients = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'patient')
        .limit(25)

      if (active && data && data.length > 0) {
        setPatients(data)
        if (!selectedPatientId) {
          setSelectedPatientId(data[0].id)
          setSelectedPatientName(data[0].name)
        } else {
          const matched = data.find(p => p.id === selectedPatientId)
          if (matched) setSelectedPatientName(matched.name)
        }
      }
    }
    fetchPatients()
    return () => { active = false }
  }, [])

  // 2. Fetch patient's active meds & allergies for interaction safety
  useEffect(() => {
    if (!selectedPatientId) return
    let active = true

    const fetchPatientSafetyData = async () => {
      // Fetch Medications
      const { data: meds } = await supabase
        .from('medications')
        .select('name')
        .eq('patient_id', selectedPatientId)

      // Fetch Emergency Card Allergies
      const { data: emCard } = await supabase
        .from('emergency_cards')
        .select('allergies')
        .eq('patient_id', selectedPatientId)
        .maybeSingle()

      if (active) {
        setExistingMeds(meds ? meds.map(m => m.name.toLowerCase()) : [])
        setKnownAllergies(emCard?.allergies ? emCard.allergies.map((a: string) => a.toLowerCase()) : [])
      }
    }

    fetchPatientSafetyData()
    return () => { active = false }
  }, [selectedPatientId])

  const handlePatientSelect = (pId: string) => {
    setSelectedPatientId(pId)
    setSearchParams({ patientId: pId })
    const p = patients.find(x => x.id === pId)
    if (p) setSelectedPatientName(p.name)
  }

  const addPrescriptionRow = () => {
    setPrescriptions(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', dosage: '', frequency: 'Twice daily', duration: '7 days', notes: '' }
    ])
  }

  const removePrescriptionRow = (id: string) => {
    if (prescriptions.length === 1) return
    setPrescriptions(prev => prev.filter(p => p.id !== id))
  }

  const updatePrescriptionField = (id: string, field: keyof PrescriptionDraft, val: string) => {
    setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p))
  }

  // Handle Form Submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!selectedPatientId) {
      setFormError('Please select a target patient.')
      return
    }

    setSubmitting(true)

    try {
      if (entryType === 'visit') {
        if (!visitTitle.trim()) {
          throw new Error('Please provide a title for this clinical visit entry.')
        }

        // Insert into public.records table
        const { error: recErr } = await supabase.from('records').insert({
          patient_id: selectedPatientId,
          doctor_id: user?.id || null,
          uploaded_by: user?.id || null,
          record_type: recordType,
          title: visitTitle.trim(),
          description: diagnosisNotes.trim() || null,
          occurred_at: new Date(occurredAt).toISOString(),
        })

        if (recErr) throw recErr

        setFormSuccess(`Clinical visit note for ${selectedPatientName} saved to medical timeline!`)
        setVisitTitle('')
        setDiagnosisNotes('')
      } else {
        // Prescription Mode
        const validRx = prescriptions.filter(p => p.name.trim() !== '')
        if (validRx.length === 0) {
          throw new Error('Please enter at least one medication name.')
        }

        // 1. Insert Rx Visit Record in records table
        const rxSummary = validRx.map(p => `${p.name} ${p.dosage}`).join(', ')
        const { error: recErr } = await supabase.from('records').insert({
          patient_id: selectedPatientId,
          doctor_id: user?.id || null,
          uploaded_by: user?.id || null,
          record_type: 'prescription',
          title: `New Prescription — ${validRx[0].name}${validRx.length > 1 ? ` +${validRx.length - 1} more` : ''}`,
          description: `Prescribed by Dr. ${doctorName || 'Doctor'}: ${rxSummary}`,
          occurred_at: new Date().toISOString(),
        })

        if (recErr) throw recErr

        // 2. Insert rows into public.medications table
        const medInserts = validRx.map(p => ({
          patient_id: selectedPatientId,
          prescribed_by: user?.id || null,
          name: p.name.trim(),
          dosage: p.dosage.trim() || 'Standard',
          frequency: p.frequency || 'As directed',
          duration: p.duration.trim() || null,
          source: 'doctor_prescribed',
          status: 'confirmed',
          notes: p.notes.trim() || null,
        }))

        const { error: medErr } = await supabase.from('medications').insert(medInserts)
        if (medErr) throw medErr

        setFormSuccess(`Prescription for ${selectedPatientName} (${validRx.length} medication(s)) saved successfully!`)
        setPrescriptions([{ id: Date.now().toString(), name: '', dosage: '', frequency: 'Twice daily', duration: '7 days', notes: '' }])
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save entry. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Check if any draft prescription triggers allergy / duplicate warnings
  const activeRxWarnings = prescriptions
    .filter(p => p.name.trim() !== '')
    .flatMap(p => {
      const rxName = p.name.trim().toLowerCase()
      const warnings: string[] = []
      if (knownAllergies.some(a => rxName.includes(a))) {
        warnings.push(`Allergy Alert: Patient is allergic to ${p.name}!`)
      }
      if (existingMeds.some(m => m === rxName)) {
        warnings.push(`Duplicate Medication: ${p.name} is already listed under active prescriptions.`)
      }
      return warnings
    })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header & Patient Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">New Medical Entry</h1>
          <p className="text-sm text-mist">Add clinical visit notes, diagnoses, or prescriptions to patient timeline.</p>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="flex items-center gap-2">
          <User size={16} className="text-vital" />
          <select
            value={selectedPatientId}
            onChange={(e) => handlePatientSelect(e.target.value)}
            className="rounded-xl border border-edge bg-cardsurface px-3 py-2 text-xs font-medium text-ink focus:border-vital focus:outline-none"
          >
            {patients.length === 0 ? (
              <option value="">No patients found</option>
            ) : (
              patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.email})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Entry Mode Switcher */}
      <div className="flex rounded-2xl border border-edge bg-cardsurface p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setEntryType('visit')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
            entryType === 'visit' ? 'bg-ai text-white shadow-md' : 'text-mist hover:text-ink'
          }`}
        >
          <Stethoscope size={15} /> Clinical Visit & Diagnosis
        </button>

        <button
          type="button"
          onClick={() => setEntryType('prescription')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
            entryType === 'prescription' ? 'bg-vital text-white shadow-md' : 'text-mist hover:text-ink'
          }`}
        >
          <Pill size={15} /> Prescription Builder
        </button>
      </div>

      {/* Form Area */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-emergency/30 bg-emergency-soft p-4 text-xs text-emergency">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="flex items-center justify-between rounded-2xl border border-vital/30 bg-vital-soft p-4 text-xs text-vital font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{formSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/doctor/patient-timeline?patientId=${selectedPatientId}`)}
              className="flex items-center gap-1 text-xs text-vital hover:underline"
            >
              View Timeline <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* MODE A: Clinical Visit & Diagnosis Form */}
        {entryType === 'visit' && (
          <Card className="p-6 space-y-4" hover={false}>
            <div className="flex items-center gap-2 border-b border-edge/60 pb-3">
              <Stethoscope size={18} className="text-ai" />
              <h2 className="font-display text-base font-semibold text-ink">Clinical Consultation Entry — {selectedPatientName}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Visit Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology Follow-up & ECG Review"
                  value={visitTitle}
                  onChange={(e) => setVisitTitle(e.target.value)}
                  className="w-full rounded-xl border border-edge bg-panel2 px-3.5 py-2.5 text-xs text-ink placeholder:text-mist focus:border-ai focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Record Type</label>
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  className="w-full rounded-xl border border-edge bg-panel2 px-3.5 py-2.5 text-xs text-ink focus:border-ai focus:outline-none"
                >
                  <option value="consultation">Consultation Note</option>
                  <option value="clinical_note">Clinical Progress Note</option>
                  <option value="lab_report">Lab Result Evaluation</option>
                  <option value="vaccination">Vaccination Record</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink mb-1">Date of Visit</label>
                <input
                  type="date"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full rounded-xl border border-edge bg-panel2 px-3.5 py-2.5 text-xs text-ink focus:border-ai focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink mb-1">Diagnosis Notes & Clinical Findings</label>
                <textarea
                  rows={4}
                  placeholder="Enter detailed assessment, examination notes, treatment recommendations, and follow-up plan..."
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  className="w-full rounded-xl border border-edge bg-panel2 p-3.5 text-xs text-ink placeholder:text-mist focus:border-ai focus:outline-none"
                />
              </div>
            </div>
          </Card>
        )}

        {/* MODE B: Prescription Builder Form */}
        {entryType === 'prescription' && (
          <Card className="p-6 space-y-4" hover={false}>
            <div className="flex items-center justify-between border-b border-edge/60 pb-3">
              <div className="flex items-center gap-2">
                <Pill size={18} className="text-vital" />
                <h2 className="font-display text-base font-semibold text-ink">Prescription Builder — {selectedPatientName}</h2>
              </div>
              <button
                type="button"
                onClick={addPrescriptionRow}
                className="flex items-center gap-1 rounded-xl bg-vital/10 px-3 py-1.5 text-xs font-semibold text-vital hover:bg-vital/20 transition-colors"
              >
                <Plus size={14} /> Add Medication
              </button>
            </div>

            {/* Active Interaction Warnings */}
            {activeRxWarnings.length > 0 && (
              <div className="space-y-2">
                {activeRxWarnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-emergency/30 bg-emergency-soft px-3 py-2 text-xs font-semibold text-emergency">
                    <AlertTriangle size={14} /> {w}
                  </div>
                ))}
              </div>
            )}

            {/* Prescription Items Table */}
            <div className="space-y-3">
              {prescriptions.map((rx, index) => (
                <motion.div
                  key={rx.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-edge bg-panel2/60 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Medication #{index + 1}</span>
                    {prescriptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePrescriptionRow(rx.id)}
                        className="text-xs text-mist hover:text-emergency transition-colors"
                        title="Remove Medication"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Medication Name * (e.g. Amoxicillin)"
                        value={rx.name}
                        onChange={(e) => updatePrescriptionField(rx.id, 'name', e.target.value)}
                        className="w-full rounded-xl border border-edge bg-cardsurface px-3 py-2 text-xs text-ink placeholder:text-mist focus:border-vital focus:outline-none"
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 500mg)"
                        value={rx.dosage}
                        onChange={(e) => updatePrescriptionField(rx.id, 'dosage', e.target.value)}
                        className="w-full rounded-xl border border-edge bg-cardsurface px-3 py-2 text-xs text-ink placeholder:text-mist focus:border-vital focus:outline-none"
                      />
                    </div>

                    <div>
                      <select
                        value={rx.frequency}
                        onChange={(e) => updatePrescriptionField(rx.id, 'frequency', e.target.value)}
                        className="w-full rounded-xl border border-edge bg-cardsurface px-3 py-2 text-xs text-ink focus:border-vital focus:outline-none"
                      >
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="Every 8 hours">Every 8 hours</option>
                        <option value="As needed (PRN)">As needed (PRN)</option>
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Duration (e.g. 7 days)"
                        value={rx.duration}
                        onChange={(e) => updatePrescriptionField(rx.id, 'duration', e.target.value)}
                        className="w-full rounded-xl border border-edge bg-cardsurface px-3 py-2 text-xs text-ink placeholder:text-mist focus:border-vital focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Instructions / Notes (e.g. Take with meals after breakfast)"
                        value={rx.notes}
                        onChange={(e) => updatePrescriptionField(rx.id, 'notes', e.target.value)}
                        className="w-full rounded-xl border border-edge bg-cardsurface px-3 py-2 text-xs text-ink placeholder:text-mist focus:border-vital focus:outline-none"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={submitting}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold text-white shadow-md disabled:opacity-50 transition-all ${
            entryType === 'visit' ? 'bg-ai shadow-glow-ai' : 'bg-vital shadow-glow'
          }`}
        >
          <ClipboardPlus size={16} />
          {submitting ? 'Saving to Database...' : entryType === 'visit' ? 'Save Clinical Visit Note' : 'Commit & Sign Prescription'}
        </motion.button>
      </form>
    </div>
  )
}
