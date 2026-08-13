import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Upload, Filter, Download, Trash2, ExternalLink, Plus, X,
  FileCheck, AlertCircle, CheckCircle2, UserCheck, ShieldCheck, Search, Image as ImageIcon,
  Sparkles, Brain, Pill, Wand2
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { analyzeMedicalDocument, ExtractedDocData } from '../../lib/gemini'

type MedicalRecord = {
  id: string
  patient_id: string
  doctor_id: string | null
  record_type: string
  title: string
  description: string | null
  occurred_at: string
  created_at: string
  attachment_path: string | null
  uploaded_by: string | null
}

const RECORD_TYPES = [
  { key: 'all', label: 'All Types' },
  { key: 'patient_upload', label: 'Patient Uploads' },
  { key: 'lab_report', label: 'Lab Reports' },
  { key: 'prescription', label: 'Prescriptions' },
  { key: 'consultation', label: 'Consultations' },
  { key: 'vaccination', label: 'Vaccinations' },
]

export default function Records() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Upload Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [recordType, setRecordType] = useState<string>('patient_upload')
  const [description, setDescription] = useState('')
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().split('T')[0])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Gemini AI Extraction state
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [extractedMeds, setExtractedMeds] = useState<ExtractedDocData['medications']>([])
  const [aiExtractedNotice, setAiExtractedNotice] = useState<string | null>(null)

  // Document Viewing & Signed URL state
  const [loadingSignedUrl, setLoadingSignedUrl] = useState<string | null>(null)

  // Delete Action state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const fetchRecords = async () => {
    if (!session?.user?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('patient_id', session.user.id)
      .order('occurred_at', { ascending: false })

    if (!error && data) {
      setRecords(data)
    } else if (error) {
      console.error('Failed to fetch records:', error.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRecords()
  }, [session?.user?.id])

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0]
      setUploadFile(selected)
      setExtractedMeds([])
      setAiExtractedNotice(null)

      // Auto-fill title fallback
      const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))

      // Trigger Gemini AI Document Analysis
      setAiAnalyzing(true)
      try {
        const extracted = await analyzeMedicalDocument(selected)
        if (extracted.title) setTitle(extracted.title)
        if (extracted.record_type) setRecordType(extracted.record_type)
        if (extracted.occurred_at) setOccurredAt(extracted.occurred_at)
        if (extracted.summary) setDescription(extracted.summary)

        if (extracted.medications && extracted.medications.length > 0) {
          setExtractedMeds(extracted.medications)
          setAiExtractedNotice(
            `Gemini AI detected ${extracted.medications.length} medication(s) in this document! They will be auto-synced to your Medications list.`
          )
        } else {
          setAiExtractedNotice('Gemini AI scanned document and auto-populated title & summary.')
        }
      } catch (err) {
        console.warn('AI analysis skipped:', err)
      } finally {
        setAiAnalyzing(false)
      }
    }
  }

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) return
    if (!uploadFile) {
      setUploadError('Please select a file to upload (PDF or Image).')
      return
    }
    if (!title.trim()) {
      setUploadError('Please enter a document title.')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      // 1. Upload to Supabase Storage: bucket 'medical-documents'
      const sanitizedFileName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${session.user.id}/${Date.now()}_${sanitizedFileName}`

      const { error: storageErr } = await supabase.storage
        .from('medical-documents')
        .upload(storagePath, uploadFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (storageErr) {
        throw new Error(`Storage upload failed: ${storageErr.message}`)
      }

      // 2. Insert row into records table
      const { error: dbErr } = await supabase.from('records').insert({
        patient_id: session.user.id,
        uploaded_by: session.user.id,
        doctor_id: null,
        record_type: recordType,
        title: title.trim(),
        description: description.trim() || null,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
        attachment_path: storagePath,
      })

      if (dbErr) {
        await supabase.storage.from('medical-documents').remove([storagePath])
        throw new Error(`Database record creation failed: ${dbErr.message}`)
      }

      // 3. If Gemini AI detected medications, auto-insert them with source='ai_extracted' and status='unconfirmed'
      if (extractedMeds.length > 0) {
        const medRows = extractedMeds.map((m) => ({
          patient_id: session.user.id,
          name: m.name,
          dosage: m.dosage || 'As prescribed',
          frequency: m.frequency || 'Daily',
          duration: m.duration || null,
          source: 'ai_extracted',
          status: 'unconfirmed',
          notes: m.notes || `Extracted by Gemini AI from ${title.trim()}`,
          start_date: occurredAt || new Date().toISOString().split('T')[0],
        }))

        const { error: medErr } = await supabase.from('medications').insert(medRows)
        if (medErr) {
          console.warn('Full medication insert failed, executing legacy schema fallback:', medErr.message)
          const fallbackMedRows = extractedMeds.map((m) => ({
            patient_id: session.user.id,
            name: m.name,
            dosage: m.dosage || 'As prescribed',
            frequency: m.frequency || 'Daily',
            notes: `🤖 AI Extracted (Unconfirmed): ${m.notes || 'From ' + title.trim()}`,
            start_date: occurredAt || new Date().toISOString().split('T')[0],
          }))
          await supabase.from('medications').insert(fallbackMedRows)
        }
      }

      // 4. Save AI Summary into ai_summaries table if description present
      if (description.trim()) {
        await supabase.from('ai_summaries').insert({
          patient_id: session.user.id,
          summary: `Summary of ${title.trim()}: ${description.trim()}`,
        })
      }

      setActionSuccess(
        `Medical document uploaded and ${
          extractedMeds.length > 0 ? `${extractedMeds.length} medication(s) auto-synced to your dashboard!` : 'synced to timeline!'
        }`
      )
      setIsUploadOpen(false)
      setUploadFile(null)
      setTitle('')
      setDescription('')
      setExtractedMeds([])
      setAiExtractedNotice(null)
      fetchRecords()
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document.')
    } finally {
      setUploading(false)
    }
  }

  const handleOpenDocument = async (record: MedicalRecord) => {
    if (!record.attachment_path) return
    setLoadingSignedUrl(record.id)
    try {
      const { data, error } = await supabase.storage
        .from('medical-documents')
        .createSignedUrl(record.attachment_path, 300)

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Unable to generate signed URL.')
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      setActionError(`Could not access document: ${err.message}`)
    } finally {
      setLoadingSignedUrl(null)
    }
  }

  const handleDeleteRecord = async (record: MedicalRecord) => {
    if (!session?.user?.id) return
    if (record.uploaded_by !== session.user.id) {
      setActionError('You can only delete records that you uploaded yourself.')
      return
    }

    if (!window.confirm(`Are you sure you want to delete "${record.title}"?`)) {
      return
    }

    setDeletingId(record.id)
    setActionError(null)

    try {
      if (record.attachment_path) {
        await supabase.storage.from('medical-documents').remove([record.attachment_path])
      }

      const { error } = await supabase
        .from('records')
        .delete()
        .eq('id', record.id)
        .eq('uploaded_by', session.user.id)

      if (error) throw new Error(error.message)

      setActionSuccess('Record deleted successfully.')
      setRecords((prev) => prev.filter((r) => r.id !== record.id))
    } catch (err: any) {
      setActionError(`Failed to delete record: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const filteredRecords = records.filter((r) => {
    const matchesType = filterType === 'all' || r.record_type === filterType
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesType && matchesSearch
  })

  const formatDate = (dateStr: string) => {
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
      {/* Header & Main Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Medical Records</h1>
          <p className="text-sm text-mist">
            View doctor-authored records or upload files with automated Gemini AI extraction.
          </p>
        </div>
        <button
          onClick={() => {
            setUploadError(null)
            setIsUploadOpen(true)
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-vital px-4 py-2.5 text-xs font-semibold text-void shadow-glow transition-all hover:brightness-110 shrink-0"
        >
          <Plus size={16} /> Upload & AI Auto-Extract
        </button>
      </motion.div>

      {/* Notifications */}
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

      {/* Filters and Search Bar */}
      <Card className="p-4" hover={false}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            <input
              type="text"
              placeholder="Search records by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-edge bg-panel2 py-2 pl-9 pr-4 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Filter size={14} className="text-mist shrink-0 mr-1" />
            {RECORD_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterType(t.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                  filterType === t.key
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

      {/* Records List */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card className="p-10 text-center" hover={false}>
          <FileText size={36} className="mx-auto mb-3 text-mist/50" />
          <p className="text-sm font-semibold text-ink">No records found</p>
          <p className="mt-1 text-xs text-mist">
            {searchQuery || filterType !== 'all'
              ? 'No medical records match your current filter or search criteria.'
              : 'You have no medical records stored yet. Click "Upload & AI Auto-Extract" to add your first report.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRecords.map((rec, i) => {
            const isSelfUpload = rec.uploaded_by === session?.user?.id
            const isDoctorAuthored = !!rec.doctor_id

            return (
              <Card key={rec.id} delay={i * 0.03} className="p-5" hover={false}>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-ink">{rec.title}</h3>
                      {isDoctorAuthored && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-vital-soft px-2.5 py-0.5 text-[11px] font-medium text-vital">
                          <UserCheck size={11} /> Doctor Authored
                        </span>
                      )}
                      {isSelfUpload && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ai-soft px-2.5 py-0.5 text-[11px] font-medium text-ai">
                          <Upload size={11} /> Uploaded by you
                        </span>
                      )}
                      <span className="rounded-full bg-panel2 border border-edge/80 px-2 py-0.5 text-[10px] text-mist capitalize">
                        {rec.record_type.replace('_', ' ')}
                      </span>
                    </div>

                    {rec.description && (
                      <p className="text-xs text-mist leading-relaxed">{rec.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-mist">
                      <span>Occurred: <strong className="text-ink font-medium">{formatDate(rec.occurred_at)}</strong></span>
                      <span>Added: {formatDate(rec.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-2 shrink-0 border-t border-edge/60 pt-3 sm:border-t-0 sm:pt-0">
                    {rec.attachment_path && (
                      <button
                        onClick={() => handleOpenDocument(rec)}
                        disabled={loadingSignedUrl === rec.id}
                        className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel2 px-3 py-1.5 text-xs font-medium text-ink hover:bg-vital/10 hover:border-vital/40 transition-all disabled:opacity-50"
                      >
                        {loadingSignedUrl === rec.id ? (
                          <span className="animate-spin text-vital">...</span>
                        ) : (
                          <>
                            <ExternalLink size={13} className="text-vital" />
                            View Document
                          </>
                        )}
                      </button>
                    )}

                    {isSelfUpload && (
                      <button
                        onClick={() => handleDeleteRecord(rec)}
                        disabled={deletingId === rec.id}
                        title="Delete this record"
                        className="flex items-center justify-center rounded-xl border border-edge bg-panel2 p-2 text-mist hover:border-emergency/40 hover:bg-emergency-soft hover:text-emergency transition-all disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-edge bg-panel p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-edge pb-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-vital-soft">
                    <Sparkles size={18} className="text-vital" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-ink">Upload & Gemini AI Auto-Extract</h2>
                    <p className="text-xs text-mist">Upload reports to auto-extract medications & history.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUploadOpen(false)}
                  className="rounded-lg p-1 text-mist hover:bg-panel2 hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
                {uploadError && (
                  <div className="flex items-start gap-2 rounded-xl border border-emergency/30 bg-emergency-soft p-3 text-xs text-emergency">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* File picker drop area */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">Medical Document (PDF or Image)</label>
                  <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-edge bg-panel2 p-6 text-center transition-all hover:border-vital/50">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                    {uploadFile ? (
                      <div className="flex flex-col items-center gap-1.5 text-xs font-medium text-vital">
                        <FileCheck size={24} />
                        <span className="truncate max-w-[240px] font-bold">{uploadFile.name}</span>
                        <span className="text-mist text-[11px]">({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="mb-2 text-mist" />
                        <p className="text-xs font-medium text-ink">Click or drag file to upload</p>
                        <p className="text-[11px] text-mist mt-0.5">Supports PDF, PNG, JPG (Gemini Vision Auto-Scans)</p>
                      </>
                    )}
                  </div>
                </div>

                {/* AI Extraction Banner */}
                {aiAnalyzing && (
                  <div className="flex items-center gap-2 rounded-xl bg-ai-soft p-3 border border-ai/30 text-xs text-ai font-medium">
                    <Wand2 size={16} className="animate-spin" />
                    <span>Gemini AI is analyzing document text and medications...</span>
                  </div>
                )}

                {aiExtractedNotice && (
                  <div className="flex items-start gap-2 rounded-xl bg-vital-soft p-3 border border-vital/30 text-xs text-ink">
                    <Sparkles size={16} className="text-vital shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-vital">Gemini AI Auto-Extracted</p>
                      <p className="text-mist text-[11px] mt-0.5">{aiExtractedNotice}</p>
                    </div>
                  </div>
                )}

                {/* Document Title */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Document Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Blood Test — Aug 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
                  />
                </div>

                {/* Record Type Select */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Record Type</label>
                  <select
                    value={recordType}
                    onChange={(e) => setRecordType(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink focus:border-vital focus:outline-none capitalize"
                  >
                    <option value="patient_upload">Patient Upload</option>
                    <option value="lab_report">Lab Report</option>
                    <option value="prescription">Prescription</option>
                    <option value="consultation">Doctor Consultation</option>
                    <option value="vaccination">Vaccination</option>
                  </select>
                </div>

                {/* Date Occurred */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Date of Test / Record</label>
                  <input
                    type="date"
                    value={occurredAt}
                    onChange={(e) => setOccurredAt(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                {/* Description / Summary */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">AI Summary / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Auto-extracted document summary or additional notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none resize-none"
                  />
                </div>

                {/* Detected Medications Preview */}
                {extractedMeds.length > 0 && (
                  <div className="rounded-2xl border border-vital/30 bg-panel2 p-3 text-xs">
                    <p className="font-semibold text-ink flex items-center gap-1.5 mb-2">
                      <Pill size={14} className="text-vital" /> Auto-Detected Medications ({extractedMeds.length})
                    </p>
                    <div className="space-y-1.5">
                      {extractedMeds.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg bg-panel p-2 border border-edge">
                          <div>
                            <p className="font-bold text-ink">{m.name}</p>
                            <p className="text-[11px] text-mist">{m.dosage} · {m.frequency}</p>
                          </div>
                          <span className="rounded bg-vital-soft px-1.5 py-0.5 text-[10px] text-vital font-semibold">Auto-Sync</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                  <button
                    type="button"
                    onClick={() => setIsUploadOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-mist hover:bg-panel2 hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || aiAnalyzing}
                    className="flex items-center gap-1.5 rounded-xl bg-vital px-5 py-2 text-xs font-semibold text-void hover:brightness-110 disabled:opacity-50 shadow-glow"
                  >
                    {uploading ? 'Uploading & Syncing...' : 'Save, Sync & Upload'}
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
