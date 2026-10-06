import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Stethoscope, FlaskConical, Pill, Syringe, Activity, FileText, UserCheck, Upload, Calendar, Lock, ShieldCheck, User, Plus, Sparkles, AlertTriangle, Loader2, X, Check } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { generateDoctorClinicalSummary, ClinicalAISummaryResult } from '../../lib/gemini'

type PatientOption = {
  id: string
  name: string
  email: string
}

type MedicalRecord = {
  id: string
  record_type: string
  title: string
  description: string | null
  occurred_at: string
  doctor_id: string | null
  uploaded_by: string | null
  attachment_path: string | null
  doctor_name?: string
}

const typeIconMap: Record<string, any> = {
  consultation: Stethoscope,
  lab_report: FlaskConical,
  prescription: Pill,
  vaccination: Syringe,
  patient_upload: Upload,
  visit: Activity,
}

const typeLabelMap: Record<string, string> = {
  consultation: 'Doctor Visit',
  lab_report: 'Lab Result',
  prescription: 'Prescription',
  vaccination: 'Vaccination',
  patient_upload: 'Self Upload',
  visit: 'Hospital Visit',
}

export default function DoctorPatientTimeline() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialPatientId = searchParams.get('patientId') || ''

  const [patients, setPatients] = useState<PatientOption[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId)
  const [selectedPatientName, setSelectedPatientName] = useState<string>('Patient')

  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  // AI Summary Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummaryData, setAiSummaryData] = useState<ClinicalAISummaryResult | null>(null)

  // 1. Fetch available patients list
  useEffect(() => {
    let active = true
    const fetchPatients = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'patient')
        .limit(25)

      if (active) {
        if (data && data.length > 0) {
          setPatients(data)
          if (!selectedPatientId) {
            setSelectedPatientId(data[0].id)
            setSelectedPatientName(data[0].name)
          } else {
            const matched = data.find(p => p.id === selectedPatientId)
            if (matched) setSelectedPatientName(matched.name)
          }
        } else {
          setLoading(false)
        }
      }
    }
    fetchPatients()
    return () => { active = false }
  }, [])

  // 2. Fetch patient records (governed by DB RLS access_grants policies)
  useEffect(() => {
    if (!selectedPatientId) {
      setLoading(false)
      return
    }
    let active = true

    const fetchTimeline = async () => {
      setLoading(true)
      setHasAccess(null)

      try {
        // Fetch patient profile name
        const { data: pData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', selectedPatientId)
          .single()

        if (pData?.name) setSelectedPatientName(pData.name)

        // Query records for this patient
        const { data, error } = await supabase
          .from('records')
          .select('id, title, record_type, description, occurred_at, doctor_id, uploaded_by, attachment_path, profiles:doctor_id (name)')
          .eq('patient_id', selectedPatientId)
          .order('occurred_at', { ascending: false })

        if (error) {
          console.warn('RLS query blocked record fetch:', error.message)
          if (active) setHasAccess(false)
        } else if (active) {
          setHasAccess(true)
          const mapped = (data || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            record_type: r.record_type,
            description: r.description,
            occurred_at: r.occurred_at,
            doctor_id: r.doctor_id,
            uploaded_by: r.uploaded_by,
            attachment_path: r.attachment_path,
            doctor_name: r.profiles?.name || undefined,
          }))
          setRecords(mapped)
        }
      } catch (err) {
        console.error('Error fetching doctor patient timeline:', err)
        if (active) setHasAccess(false)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchTimeline()
    return () => { active = false }
  }, [selectedPatientId])

  const handlePatientSelect = (pId: string) => {
    setSelectedPatientId(pId)
    setSearchParams({ patientId: pId })
    const p = patients.find(x => x.id === pId)
    if (p) setSelectedPatientName(p.name)
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const runAiSummary = async () => {
    if (!selectedPatientId) return
    setAiModalOpen(true)
    setAiLoading(true)

    try {
      // 1. Fetch patient's active medications
      const { data: meds } = await supabase
        .from('medications')
        .select('name, dosage, frequency, duration, source')
        .eq('patient_id', selectedPatientId)

      // 2. Fetch emergency card data (blood group, allergies, conditions)
      const { data: ec } = await supabase
        .from('emergency_cards')
        .select('blood_type, allergies, conditions')
        .eq('patient_id', selectedPatientId)
        .maybeSingle()

      // 3. Call AI Clinical Synthesis (Groq LPU / Gemini Flash)
      const res = await generateDoctorClinicalSummary({
        patientName: selectedPatientName,
        records: records.map(r => ({
          title: r.title,
          record_type: r.record_type,
          description: r.description || '',
          occurred_at: r.occurred_at,
        })),
        medications: (meds || []).map(m => ({
          name: m.name,
          dosage: m.dosage || '',
          frequency: m.frequency || '',
          duration: m.duration || '',
          source: m.source || ''
        })),
        emergencyCard: ec ? {
          blood_type: ec.blood_type,
          allergies: ec.allergies,
          conditions: ec.conditions,
        } : undefined,
      })

      setAiSummaryData(res)
    } catch (err) {
      console.error('Failed to run clinical AI summary:', err)
    } finally {
      setAiLoading(false)
    }
  }

  // Auto-trigger if navigated with ?ai=true query parameter
  useEffect(() => {
    if (searchParams.get('ai') === 'true' && selectedPatientId && records.length > 0 && !aiModalOpen) {
      runAiSummary()
    }
  }, [searchParams, selectedPatientId, records.length])

  // Group records by month & year
  const groupedRecords = records.reduce((acc, rec) => {
    const yearMonth = rec.occurred_at
      ? new Date(rec.occurred_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Recent'
    if (!acc[yearMonth]) acc[yearMonth] = []
    acc[yearMonth].push(rec)
    return acc
  }, {} as Record<string, MedicalRecord[]>)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header & Patient Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Patient Timeline (Doctor View)</h1>
          <p className="text-sm text-mist">Read-only view of patient medical records, gated by access_grants.</p>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="flex items-center gap-2">
          <User size={16} className="text-ai" />
          <select
            value={selectedPatientId}
            onChange={(e) => handlePatientSelect(e.target.value)}
            className="rounded-xl border border-edge bg-cardsurface px-3 py-2 text-xs font-medium text-ink focus:border-ai focus:outline-none"
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

      {/* RLS Access Denied Alert */}
      {hasAccess === false && (
        <Card className="p-8 border-emergency/30 bg-emergency-soft text-center" hover={false}>
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-emergency/20 text-emergency">
            <Lock size={24} />
          </div>
          <h2 className="font-display text-base font-bold text-ink">Access Control Restricted</h2>
          <p className="mt-1 text-xs text-mist max-w-md mx-auto leading-relaxed">
            You do not have active access grants to view <span className="font-semibold text-ink">{selectedPatientName}</span>'s records.
            The patient must delegate access through their portal or an emergency override must be logged.
          </p>
        </Card>
      )}

      {/* Authorized Timeline View */}
      {hasAccess !== false && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between rounded-2xl border border-edge bg-cardsurface/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-vital-soft px-3 py-1 text-xs font-semibold text-vital">
                <ShieldCheck size={14} /> Access Verified
              </span>
              <span className="text-xs text-mist">{selectedPatientName}'s Medical History ({records.length} items)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/doctor/new-entry?patientId=${selectedPatientId}`)}
                className="flex items-center gap-1.5 rounded-xl bg-vital px-3 py-1.5 text-xs font-semibold text-white shadow-glow hover:bg-vital/90 transition-all"
              >
                <Plus size={14} /> Add Entry
              </button>

              <button
                onClick={runAiSummary}
                className="flex items-center gap-1.5 rounded-xl bg-ai px-3 py-1.5 text-xs font-semibold text-white shadow-glow-ai hover:bg-ai/90 transition-all cursor-pointer"
              >
                <Sparkles size={14} /> AI Clinical Brief
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 pl-6">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : records.length === 0 ? (
            <Card className="p-8 text-center" hover={false}>
              <FileText size={32} className="mx-auto mb-3 text-mist/60" />
              <p className="text-sm font-medium text-ink">No medical records found for {selectedPatientName}</p>
              <p className="mt-1 text-xs text-mist">
                Click "Add Entry" above to add new consultation notes or prescriptions to this patient's timeline.
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedRecords).map(([groupTitle, groupItems]) => (
                <div key={groupTitle} className="space-y-4">
                  <div className="sticky top-0 z-10 flex items-center gap-2 bg-void/80 py-1.5 backdrop-blur-md">
                    <Calendar size={14} className="text-vital" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-mist">{groupTitle}</h2>
                    <div className="h-px flex-1 bg-edge" />
                  </div>

                  <div className="relative pl-6">
                    <div className="absolute left-[9px] top-2 bottom-2 w-px bg-edge" />
                    <div className="space-y-4">
                      {groupItems.map((rec, i) => {
                        const IconComponent = typeIconMap[rec.record_type] || FileText
                        const badgeLabel = typeLabelMap[rec.record_type] || rec.record_type

                        return (
                          <motion.div
                            key={rec.id}
                            initial={{ opacity: 0, x: -16 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ duration: 0.3, delay: i * 0.04 }}
                            className="relative"
                          >
                            <span className="absolute -left-6 top-4 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-void bg-vital">
                              <IconComponent size={10} className="text-void" />
                            </span>
                            <Card className="p-4" delay={0}>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-ink">{rec.title}</p>
                                    {rec.doctor_name ? (
                                      <span className="flex items-center gap-1 rounded-full bg-vital-soft px-2 py-0.5 text-[10px] font-medium text-vital">
                                        <UserCheck size={10} /> Dr. {rec.doctor_name}
                                      </span>
                                    ) : rec.uploaded_by ? (
                                      <span className="flex items-center gap-1 rounded-full bg-ai-soft px-2 py-0.5 text-[10px] font-medium text-ai">
                                        <Upload size={10} /> Patient Upload
                                      </span>
                                    ) : null}
                                  </div>
                                  {rec.description && (
                                    <p className="mt-1 text-xs text-mist leading-relaxed">{rec.description}</p>
                                  )}
                                </div>
                                <span className="shrink-0 rounded-full bg-panel2 px-2.5 py-1 text-[11px] font-medium text-mist">
                                  {badgeLabel}
                                </span>
                              </div>
                              <div className="mt-3 flex items-center justify-between border-t border-edge/60 pt-2 text-[11px] text-mist">
                                <span>Occurred: {formatDate(rec.occurred_at)}</span>
                                {rec.attachment_path && (
                                  <span className="font-medium text-ai">Has Attachment</span>
                                )}
                              </div>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clinical AI Summary Modal */}
      <AnimatePresence>
        {aiModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setAiModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-edge bg-cardsurface p-6 shadow-card-lg sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-edge/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-ai/10 text-ai">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">
                      AI Clinical Diagnostic Brief
                    </h3>
                    <p className="text-xs text-mist">
                      Patient: <span className="font-medium text-ink">{selectedPatientName}</span> · Multi-LLM Analysis (Groq & Gemini)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAiModalOpen(false)}
                  className="rounded-lg p-1.5 text-mist hover:bg-panel2 hover:text-ink transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {aiLoading ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 size={32} className="mx-auto animate-spin text-ai" />
                  <p className="text-sm font-medium text-ink">Analyzing medical history & drug interactions...</p>
                  <p className="text-xs text-mist">Synthesizing clinical notes, lab reports, and allergy profiles.</p>
                </div>
              ) : aiSummaryData ? (
                <div className="mt-5 space-y-5">
                  {/* Clinical Synthesis */}
                  <div className="rounded-2xl border border-edge/80 bg-panel2/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-mist mb-1">
                      Clinical Status Overview
                    </p>
                    <p className="text-sm text-ink leading-relaxed">{aiSummaryData.summary}</p>
                  </div>

                  {/* Drug Interactions & Contraindication Warnings */}
                  {aiSummaryData.warnings && aiSummaryData.warnings.length > 0 && (
                    <div className="rounded-2xl border border-emergency/30 bg-emergency-soft/70 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-emergency text-xs font-semibold uppercase tracking-wider">
                        <AlertTriangle size={15} />
                        <span>Contraindication & Allergy Warnings</span>
                      </div>
                      <ul className="space-y-1 text-xs text-ink">
                        {aiSummaryData.warnings.map((w, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emergency font-bold mt-0.5">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Observations */}
                  {aiSummaryData.keyObservations && aiSummaryData.keyObservations.length > 0 && (
                    <div className="rounded-2xl border border-edge/80 bg-cardsurface p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-mist">
                        Key Clinical Observations & Metrics
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {aiSummaryData.keyObservations.map((obs, idx) => (
                          <div key={idx} className="rounded-xl border border-edge/60 bg-panel2/40 p-2.5 text-xs text-ink">
                            {obs}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-edge/60">
                    <button
                      onClick={() => setAiModalOpen(false)}
                      className="rounded-xl border border-edge bg-panel2 px-4 py-2 text-xs font-medium text-ink hover:bg-edge/40 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setAiModalOpen(false)
                        navigate(`/doctor/new-entry?patientId=${selectedPatientId}`)
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-vital px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-vital/90 transition-all cursor-pointer"
                    >
                      <Plus size={14} /> Add Clinical Note / Rx
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
