import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pill,
  ShieldAlert,
  Scissors,
  Activity,
  Syringe,
  AlertCircle,
  Calendar,
  Building2,
  UserCheck,
  FileText,
  Plus,
  UploadCloud,
  X,
  Trash2,
  ExternalLink,
  CheckCircle2,
  FolderArchive,
  File,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import {
  getPatientRecords,
  getUploadedRecords,
  uploadPatientDocument,
  deleteUploadedRecord,
  addPrescription,
  deletePrescription,
  addAllergy,
  deleteAllergy,
  addSurgery,
  deleteSurgery,
  addDisease,
  deleteDisease,
  addVaccination,
  deleteVaccination,
  Allergy,
  Disease,
  Surgery,
  Vaccination,
  UploadedRecord,
} from '../../lib/api/patientRecords'
import { Prescription } from '../../lib/api/patientOverview'

export default function Records() {
  const { session } = useAuth()
  const patientId = session?.user?.id || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [surgeries, setSurgeries] = useState<Surgery[]>([])
  const [diseases, setDiseases] = useState<Disease[]>([])
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [uploadedRecords, setUploadedRecords] = useState<UploadedRecord[]>([])

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [previewModalFile, setPreviewModalFile] = useState<{ url: string; title: string } | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [docTitle, setDocTitle] = useState('')
  const [docType, setDocType] = useState('lab_report')
  const [docDescription, setDocDescription] = useState('')
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0])
  const [uploading, setUploading] = useState(false)

  // Surgery Modal State
  const [isSurgeryModalOpen, setIsSurgeryModalOpen] = useState(false)
  const [surgType, setSurgType] = useState('')
  const [surgHospital, setSurgHospital] = useState('')
  const [surgSurgeon, setSurgSurgeon] = useState('')
  const [surgDate, setSurgDate] = useState(new Date().toISOString().split('T')[0])
  const [surgNotes, setSurgNotes] = useState('')
  const [savingSurgery, setSavingSurgery] = useState(false)

  const handleAddSurgery = async (e: FormEvent) => {
    e.preventDefault()
    if (!patientId || !surgType.trim()) return

    setSavingSurgery(true)
    setError(null)

    try {
      const newSurg = await addSurgery(patientId, {
        surgery_type: surgType.trim(),
        hospital_name: surgHospital.trim(),
        surgeon: surgSurgeon.trim(),
        surgery_date: surgDate,
        notes: surgNotes.trim(),
      })

      setSurgeries([newSurg, ...surgeries])
      setIsSurgeryModalOpen(false)
      setSurgType('')
      setSurgHospital('')
      setSurgSurgeon('')
      setSurgNotes('')
      setSuccessMsg('Surgery procedure recorded in medical history and timeline!')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record surgery.')
    } finally {
      setSavingSurgery(false)
    }
  }

  const handleDeleteSurgeryRecord = async (surgId: string) => {
    if (!patientId) return
    const confirmed = window.confirm('Are you sure you want to delete this surgery procedure from your history?')
    if (!confirmed) return

    try {
      await deleteSurgery(patientId, surgId)
      setSurgeries(surgeries.filter((s) => s.id !== surgId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete surgery record.')
    }
  }

  // Prescriptions Modal State
  const [isRxModalOpen, setIsRxModalOpen] = useState(false)
  const [rxName, setRxName] = useState('')
  const [rxDose, setRxDose] = useState('')
  const [rxFreq, setRxFreq] = useState('')
  const [rxDuration, setRxDuration] = useState('30 days')
  const [rxDoctor, setRxDoctor] = useState('')
  const [rxDate, setRxDate] = useState(new Date().toISOString().split('T')[0])
  const [savingRx, setSavingRx] = useState(false)

  // Allergy Modal State
  const [isAllergyModalOpen, setIsAllergyModalOpen] = useState(false)
  const [allergenName, setAllergenName] = useState('')
  const [allergyCategory, setAllergyCategory] = useState('Medication')
  const [allergySeverity, setAllergySeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate')
  const [allergyNotes, setAllergyNotes] = useState('')
  const [savingAllergy, setSavingAllergy] = useState(false)

  // Disease Modal State
  const [isDiseaseModalOpen, setIsDiseaseModalOpen] = useState(false)
  const [diseaseName, setDiseaseName] = useState('')
  const [diseaseStatus, setDiseaseStatus] = useState('active')
  const [diseaseDate, setDiseaseDate] = useState(new Date().toISOString().split('T')[0])
  const [diseaseNotes, setDiseaseNotes] = useState('')
  const [savingDisease, setSavingDisease] = useState(false)

  // Vaccination Modal State
  const [isVacModalOpen, setIsVacModalOpen] = useState(false)
  const [vacName, setVacName] = useState('')
  const [vacDoseNum, setVacDoseNum] = useState<number>(1)
  const [vacDate, setVacDate] = useState(new Date().toISOString().split('T')[0])
  const [vacFacility, setVacFacility] = useState('')
  const [savingVac, setSavingVac] = useState(false)

  // Handlers
  const handleAddPrescription = async (e: FormEvent) => {
    e.preventDefault()
    if (!patientId || !rxName.trim()) return
    setSavingRx(true)
    try {
      const newRx = await addPrescription(patientId, {
        medicine_name: rxName.trim(),
        dosage: rxDose.trim() || '500 mg',
        frequency: rxFreq.trim() || 'Once daily',
        duration: rxDuration.trim(),
        doctor_name: rxDoctor.trim(),
        start_date: rxDate,
      })
      setPrescriptions([newRx, ...prescriptions])
      setIsRxModalOpen(false)
      setRxName(''); setRxDose(''); setRxFreq(''); setRxDoctor('')
      setSuccessMsg('Prescription recorded successfully and active medications updated!')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record prescription.')
    } finally {
      setSavingRx(false)
    }
  }

  const handleDeleteRxRecord = async (rxId: string) => {
    if (!patientId) return
    if (!window.confirm('Delete this prescription record?')) return
    try {
      await deletePrescription(patientId, rxId)
      setPrescriptions(prescriptions.filter((r) => r.id !== rxId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prescription.')
    }
  }

  const handleAddAllergy = async (e: FormEvent) => {
    e.preventDefault()
    if (!patientId || !allergenName.trim()) return
    setSavingAllergy(true)
    try {
      const newAlg = await addAllergy(patientId, {
        allergen: allergenName.trim(),
        category: allergyCategory,
        severity: allergySeverity,
        reaction_notes: allergyNotes.trim(),
      })
      setAllergies([newAlg, ...allergies])
      setIsAllergyModalOpen(false)
      setAllergenName(''); setAllergyNotes('')
      setSuccessMsg('Allergy added to medical record!')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add allergy.')
    } finally {
      setSavingAllergy(false)
    }
  }

  const handleDeleteAllergyRecord = async (algId: string) => {
    if (!patientId) return
    if (!window.confirm('Delete this allergy record?')) return
    try {
      await deleteAllergy(patientId, algId)
      setAllergies(allergies.filter((a) => a.id !== algId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete allergy.')
    }
  }

  const handleAddDisease = async (e: FormEvent) => {
    e.preventDefault()
    if (!patientId || !diseaseName.trim()) return
    setSavingDisease(true)
    try {
      const newDis = await addDisease(patientId, {
        condition_name: diseaseName.trim(),
        diagnosed_date: diseaseDate,
        status: diseaseStatus,
        notes: diseaseNotes.trim(),
      })
      setDiseases([newDis, ...diseases])
      setIsDiseaseModalOpen(false)
      setDiseaseName(''); setDiseaseNotes('')
      setSuccessMsg('Medical condition recorded successfully!')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record condition.')
    } finally {
      setSavingDisease(false)
    }
  }

  const handleDeleteDiseaseRecord = async (disId: string) => {
    if (!patientId) return
    if (!window.confirm('Delete this medical condition record?')) return
    try {
      await deleteDisease(patientId, disId)
      setDiseases(diseases.filter((d) => d.id !== disId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete condition.')
    }
  }

  const handleAddVaccination = async (e: FormEvent) => {
    e.preventDefault()
    if (!patientId || !vacName.trim()) return
    setSavingVac(true)
    try {
      const newVac = await addVaccination(patientId, {
        vaccine_name: vacName.trim(),
        dose_number: vacDoseNum,
        administered_date: vacDate,
        administered_at: vacFacility.trim(),
      })
      setVaccinations([newVac, ...vaccinations])
      setIsVacModalOpen(false)
      setVacName(''); setVacFacility('')
      setSuccessMsg('Vaccination record added!')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record vaccination.')
    } finally {
      setSavingVac(false)
    }
  }

  const handleDeleteVacRecord = async (vacId: string) => {
    if (!patientId) return
    if (!window.confirm('Delete this vaccination record?')) return
    try {
      await deleteVaccination(patientId, vacId)
      setVaccinations(vaccinations.filter((v) => v.id !== vacId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vaccination.')
    }
  }

  const loadData = async () => {
    if (!patientId) return
    setLoading(true)
    setError(null)

    try {
      const [recordsData, uploads] = await Promise.all([
        getPatientRecords(patientId),
        getUploadedRecords(patientId),
      ])

      setPrescriptions(recordsData.prescriptions)
      setAllergies(recordsData.allergies)
      setSurgeries(recordsData.surgeries)
      setDiseases(recordsData.diseases)
      setVaccinations(recordsData.vaccinations)
      setUploadedRecords(uploads)
      setLoading(false)
    } catch (err) {
      console.error('Failed to load patient records:', err)
      setError(err instanceof Error ? err.message : 'Unable to load medical records.')
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [patientId])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleOpenUploadModal = () => {
    setSelectedFile(null)
    setDocTitle('')
    setDocType('lab_report')
    setDocDescription('')
    setDocDate(new Date().toISOString().split('T')[0])
    setError(null)
    setIsModalOpen(true)
  }

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!patientId || !selectedFile || !docTitle.trim()) {
      setError('Please select a file and enter a title for the document.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const newRecord = await uploadPatientDocument(patientId, selectedFile, {
        title: docTitle.trim(),
        record_type: docType,
        description: docDescription.trim(),
        occurred_at: docDate,
      })

      setUploadedRecords([newRecord, ...uploadedRecords])
      setSuccessMsg(`Document "${docTitle.trim()}" uploaded successfully!`)
      setIsModalOpen(false)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document.')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteUploadedRecord = async (record: UploadedRecord) => {
    if (!patientId) return
    const confirmed = window.confirm(`Are you sure you want to delete "${record.title}"?`)
    if (!confirmed) return

    try {
      await deleteUploadedRecord(patientId, record.id)
      setUploadedRecords(uploadedRecords.filter((r) => r.id !== record.id))
      setSuccessMsg(`Deleted "${record.title}".`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record.')
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const getSeverityBadgeClass = (severity: string) => {
    const s = severity.toLowerCase()
    if (s === 'severe') return 'bg-emergency-soft text-emergency border-emergency/30'
    if (s === 'moderate') return 'bg-ai-soft text-ai border-ai/30'
    return 'bg-vital-soft text-vital border-vital/30'
  }

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'active') return 'bg-emergency-soft text-emergency border-emergency/30'
    if (s === 'managed') return 'bg-ai-soft text-ai border-ai/30'
    return 'bg-vital-soft text-vital border-vital/30'
  }

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header & Upload Action */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Medical Records</h1>
          <p className="text-sm text-mist">
            Your complete browsable medical file repository and clinical history grouped by category.
          </p>
        </div>
        <button
          onClick={handleOpenUploadModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-vital px-4 py-2.5 text-xs font-semibold text-void shadow-glow transition-all hover:brightness-110 shrink-0"
        >
          <Plus size={16} /> Upload Document
        </button>
      </motion.div>

      {/* Action Banners */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-vital/30 bg-vital-soft p-3.5 text-xs font-medium text-ink"
        >
          <CheckCircle2 size={16} className="text-vital shrink-0" />
          <div>
            <p className="font-semibold">{successMsg}</p>
            <p className="text-[11px] text-mist mt-0.5">
              Tesseract OCR parsed vitals, medications & health events — Overview Vitals, Timeline, and Analytics have been updated in real-time.
            </p>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-emergency/30 bg-emergency-soft/30 p-4 text-xs text-emergency">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 0. Uploaded Documents Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-edge/60 pb-2">
          <div className="flex items-center gap-2">
            <FolderArchive size={18} className="text-vital" />
            <h2 className="text-base font-semibold text-ink">Uploaded Documents & Files</h2>
            <span className="rounded-full bg-vital-soft px-2.5 py-0.5 text-xs font-semibold text-vital">
              {uploadedRecords.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : uploadedRecords.length === 0 ? (
          <Card className="p-6 text-center" hover={false}>
            <UploadCloud size={28} className="mx-auto mb-2 text-mist/60" />
            <p className="text-xs font-semibold text-ink">No uploaded documents yet</p>
            <p className="mt-0.5 text-[11px] text-mist">
              Upload lab reports, X-rays, discharge summaries, or prescriptions to store them securely.
            </p>
            <button
              onClick={handleOpenUploadModal}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-vital/40 bg-vital-soft px-3.5 py-1.5 text-xs font-semibold text-vital hover:bg-vital/20"
            >
              <Plus size={14} /> Upload First File
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {uploadedRecords.map((rec, i) => (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="p-4 flex flex-col justify-between" delay={0}>
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-panel2 border border-edge text-vital">
                          <File size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-ink">{rec.title}</h3>
                          <span className="inline-block mt-0.5 rounded-md bg-vital-soft px-2 py-0.5 text-[10px] font-semibold text-vital capitalize">
                            {rec.record_type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteUploadedRecord(rec)}
                        title="Delete file record"
                        className="rounded-lg p-1 text-mist hover:text-emergency hover:bg-emergency-soft shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {rec.description && (
                      <p className="mt-2 text-xs text-mist leading-relaxed bg-panel2 p-2 rounded-lg border border-edge/40">
                        {rec.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-edge/40 pt-2 text-[11px] text-mist">
                    <span>Date: {formatDate(rec.occurred_at)}</span>
                    {rec.attachment_path ? (
                      <button
                        type="button"
                        onClick={() => setPreviewModalFile({ url: rec.attachment_path!, title: rec.title })}
                        className="flex items-center gap-1 font-semibold text-vital hover:underline cursor-pointer"
                      >
                        <ExternalLink size={12} /> View File
                      </button>
                    ) : (
                      <span className="italic text-mist/60">No attachment</span>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* 1. Prescriptions Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-edge/60 pb-2">
          <div className="flex items-center gap-2">
            <Pill size={18} className="text-vital" />
            <h2 className="text-base font-semibold text-ink">Prescriptions</h2>
            <span className="rounded-full bg-vital-soft px-2.5 py-0.5 text-xs font-semibold text-vital">
              {prescriptions.length}
            </span>
          </div>
          <button
            onClick={() => setIsRxModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-vital px-3.5 py-1.5 text-xs font-semibold text-void hover:brightness-110 shadow-glow"
          >
            <Plus size={14} /> Add Prescription
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : prescriptions.length === 0 ? (
          <Card className="p-6 text-center" hover={false}>
            <FileText size={24} className="mx-auto mb-2 text-mist/60" />
            <p className="text-xs font-medium text-ink">No prescriptions recorded</p>
            <p className="mt-0.5 text-[11px] text-mist mb-3">Record active or past prescriptions manually or upload doctor receipts.</p>
            <button
              onClick={() => setIsRxModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-vital px-4 py-2 text-xs font-semibold text-void hover:brightness-110 shadow-glow"
            >
              <Plus size={14} /> Add First Prescription
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {prescriptions.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="p-4" delay={0}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{p.medicine_name}</h3>
                      <p className="text-xs text-mist">{p.dosage || 'Standard Dosage'} · {p.frequency || 'Daily'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded-md bg-panel2 border border-edge/80 px-2 py-0.5 text-[11px] font-medium text-vital capitalize">
                        {p.status || 'Active'}
                      </span>
                      <button
                        onClick={() => handleDeleteRxRecord(p.id)}
                        title="Delete prescription"
                        className="rounded-lg p-1 text-mist hover:text-emergency hover:bg-emergency-soft shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {p.doctor_name && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-mist">
                      <UserCheck size={12} className="text-vital shrink-0" />
                      <span>Prescribed by {p.doctor_name}</span>
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between border-t border-edge/40 pt-2 text-[11px] text-mist">
                    <span>Start: {formatDate(p.start_date)}</span>
                    {p.duration && <span>Duration: {p.duration}</span>}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Allergies Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-edge/60 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-emergency" />
            <h2 className="text-base font-semibold text-ink">Allergies & Sensitivities</h2>
            <span className="rounded-full bg-emergency-soft px-2.5 py-0.5 text-xs font-semibold text-emergency">
              {allergies.length}
            </span>
          </div>
          <button
            onClick={() => setIsAllergyModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emergency px-3.5 py-1.5 text-xs font-semibold text-void hover:brightness-110 shadow-glow"
          >
            <Plus size={14} /> Add Allergy
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : allergies.length === 0 ? (
          <Card className="p-6 text-center" hover={false}>
            <ShieldAlert size={24} className="mx-auto mb-2 text-mist/60" />
            <p className="text-xs font-medium text-ink">No known allergies on record</p>
            <p className="mt-0.5 text-[11px] text-mist mb-3">Known drug, food, or environmental allergies will be displayed here for care providers.</p>
            <button
              onClick={() => setIsAllergyModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emergency px-4 py-2 text-xs font-semibold text-void hover:brightness-110 shadow-glow"
            >
              <Plus size={14} /> Add First Allergy
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {allergies.map((alg, i) => (
              <motion.div
                key={alg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="p-4" delay={0}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{alg.allergen}</h3>
                      {alg.category && (
                        <p className="text-xs text-mist capitalize">{alg.category} allergy</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getSeverityBadgeClass(alg.severity)}`}>
                        {alg.severity}
                      </span>
                      <button
                        onClick={() => handleDeleteAllergyRecord(alg.id)}
                        title="Delete allergy"
                        className="rounded-lg p-1 text-mist hover:text-emergency hover:bg-emergency-soft shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {alg.reaction_notes && (
                    <p className="mt-2 text-xs text-mist leading-relaxed italic bg-panel2 p-2 rounded-lg border border-edge/40">
                      "{alg.reaction_notes}"
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Surgeries Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-edge/60 pb-2">
          <div className="flex items-center gap-2">
            <Scissors size={18} className="text-vital" />
            <h2 className="text-base font-semibold text-ink">Surgical History & Procedures</h2>
            <span className="rounded-full bg-vital-soft px-2.5 py-0.5 text-xs font-semibold text-vital">
              {surgeries.length}
            </span>
          </div>
          <button
            onClick={() => setIsSurgeryModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-vital px-3.5 py-1.5 text-xs font-semibold text-void hover:brightness-110 shadow-glow"
          >
            <Plus size={14} /> Record Surgery
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : surgeries.length === 0 ? (
          <Card className="p-6 text-center" hover={false}>
            <Scissors size={24} className="mx-auto mb-2 text-mist/60" />
            <p className="text-xs font-medium text-ink">No surgeries or surgical procedures recorded</p>
            <p className="mt-0.5 text-[11px] text-mist mb-3">Record surgical history manually or upload discharge summaries.</p>
            <button
              onClick={() => setIsSurgeryModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-vital px-4 py-2 text-xs font-semibold text-void hover:brightness-110 shadow-glow"
            >
              <Plus size={14} /> Record First Surgery
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {surgeries.map((surg, i) => (
              <motion.div
                key={surg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="p-4" delay={0}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{surg.surgery_type}</h3>
                      {surg.surgeon && <p className="text-xs text-mist mt-0.5">Surgeon: {surg.surgeon}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded-full bg-panel2 border border-edge/80 px-2.5 py-0.5 text-[11px] font-medium text-mist">
                        {formatDate(surg.surgery_date)}
                      </span>
                      <button
                        onClick={() => handleDeleteSurgeryRecord(surg.id)}
                        title="Delete surgery record"
                        className="rounded-lg p-1 text-mist hover:text-emergency hover:bg-emergency-soft shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {surg.hospital_name && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-mist">
                      <Building2 size={12} className="text-vital shrink-0" />
                      <span>{surg.hospital_name}</span>
                    </p>
                  )}
                  {surg.notes && (
                    <p className="mt-2 text-xs text-mist leading-relaxed bg-panel2/60 p-2 rounded-lg border border-edge/40">
                      {surg.notes}
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Diseases & Conditions Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-edge/60 pb-2">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-ai" />
            <h2 className="text-base font-semibold text-ink">Diseases & Conditions</h2>
            <span className="rounded-full bg-ai-soft px-2.5 py-0.5 text-xs font-semibold text-ai">
              {diseases.length}
            </span>
          </div>
          <button
            onClick={() => setIsDiseaseModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-ai px-3.5 py-1.5 text-xs font-semibold text-void hover:brightness-110 shadow-glow"
          >
            <Plus size={14} /> Add Condition
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : diseases.length === 0 ? (
          <Card className="p-6 text-center" hover={false}>
            <Activity size={24} className="mx-auto mb-2 text-mist/60" />
            <p className="text-xs font-medium text-ink">No medical conditions recorded</p>
            <p className="mt-0.5 text-[11px] text-mist mb-3">Diagnosed medical conditions and chronic illnesses will appear here.</p>
            <button
              onClick={() => setIsDiseaseModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-ai px-4 py-2 text-xs font-semibold text-void hover:brightness-110 shadow-glow"
            >
              <Plus size={14} /> Add First Condition
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {diseases.map((dis, i) => (
              <motion.div
                key={dis.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="p-4" delay={0}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{dis.condition_name}</h3>
                      {dis.diagnosed_date && (
                        <p className="text-xs text-mist flex items-center gap-1 mt-0.5">
                          <Calendar size={11} className="text-vital shrink-0" />
                          <span>Diagnosed: {formatDate(dis.diagnosed_date)}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize ${getStatusBadgeClass(dis.status)}`}>
                        {dis.status}
                      </span>
                      <button
                        onClick={() => handleDeleteDiseaseRecord(dis.id)}
                        title="Delete condition"
                        className="rounded-lg p-1 text-mist hover:text-emergency hover:bg-emergency-soft shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {dis.notes && (
                    <p className="mt-2 text-xs text-mist leading-relaxed bg-panel2/60 p-2 rounded-lg border border-edge/40">
                      {dis.notes}
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Vaccinations Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-edge/60 pb-2">
          <div className="flex items-center gap-2">
            <Syringe size={18} className="text-vital" />
            <h2 className="text-base font-semibold text-ink">Immunizations & Vaccinations</h2>
            <span className="rounded-full bg-vital-soft px-2.5 py-0.5 text-xs font-semibold text-vital">
              {vaccinations.length}
            </span>
          </div>
          <button
            onClick={() => setIsVacModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-vital px-3.5 py-1.5 text-xs font-semibold text-void hover:brightness-110 shadow-glow"
          >
            <Plus size={14} /> Add Vaccination
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : vaccinations.length === 0 ? (
          <Card className="p-6 text-center" hover={false}>
            <Syringe size={24} className="mx-auto mb-2 text-mist/60" />
            <p className="text-xs font-medium text-ink">No immunization records found</p>
            <p className="mt-0.5 text-[11px] text-mist mb-3">Vaccines and booster history will be recorded here.</p>
            <button
              onClick={() => setIsVacModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-vital px-4 py-2 text-xs font-semibold text-void hover:brightness-110 shadow-glow"
            >
              <Plus size={14} /> Add First Vaccination
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {vaccinations.map((vac, i) => (
              <motion.div
                key={vac.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="p-4" delay={0}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{vac.vaccine_name}</h3>
                      {vac.dose_number && (
                        <p className="text-xs text-mist font-medium">Dose #{vac.dose_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="rounded-full bg-panel2 border border-edge/80 px-2.5 py-0.5 text-[11px] font-medium text-mist">
                        {formatDate(vac.administered_date)}
                      </span>
                      <button
                        onClick={() => handleDeleteVacRecord(vac.id)}
                        title="Delete vaccination"
                        className="rounded-lg p-1 text-mist hover:text-emergency hover:bg-emergency-soft shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {vac.administered_at && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-mist">
                      <Building2 size={12} className="text-vital shrink-0" />
                      <span>{vac.administered_at}</span>
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Upload Document Modal */}
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
                    <UploadCloud size={18} className="text-vital" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-ink">Upload Medical Document</h2>
                    <p className="text-xs text-mist">Store reports, prescriptions, or medical files securely.</p>
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
                {/* File Picker Zone */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Select Medical File *</label>
                  <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-edge/80 bg-panel2 p-5 text-center hover:border-vital/50 transition-all">
                    <UploadCloud size={28} className="text-vital mb-2" />
                    <p className="text-xs font-medium text-ink">
                      {selectedFile ? selectedFile.name : 'Click to choose file or drag & drop'}
                    </p>
                    <p className="text-[11px] text-mist mt-0.5">Supports PDF, PNG, JPG, JPEG, WebP</p>
                    <input
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Document Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Blood Test Results, Cardiology Checkup"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink placeholder-mist focus:border-vital focus:outline-none"
                  />
                </div>

                {/* Category & Date */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Document Type *</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink focus:border-vital focus:outline-none"
                    >
                      <option value="lab_report">Lab Report</option>
                      <option value="prescription">Prescription</option>
                      <option value="discharge_summary">Discharge Summary</option>
                      <option value="vaccination">Vaccination Record</option>
                      <option value="patient_upload">General Medical File</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">Document Date *</label>
                    <input
                      type="date"
                      required
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink focus:border-vital focus:outline-none"
                    />
                  </div>
                </div>

                {/* Description / Notes */}
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Description / Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Annual health checkup report from City General Hospital..."
                    value={docDescription}
                    onChange={(e) => setDocDescription(e.target.value)}
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
                    disabled={uploading}
                    className="flex items-center gap-1.5 rounded-xl bg-vital px-5 py-2 text-xs font-semibold text-void hover:brightness-110 disabled:opacity-50 shadow-glow"
                  >
                    {uploading ? 'Tesseract OCR Scanning & Syncing...' : 'Upload & Process with Tesseract OCR'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewModalFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl rounded-2xl border border-edge bg-panel p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div className="flex items-center gap-2">
                  <FileText size={20} className="text-vital" />
                  <h2 className="text-base font-semibold text-ink">{previewModalFile.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewModalFile.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="flex items-center gap-1.5 rounded-xl bg-vital-soft px-3 py-1.5 text-xs font-semibold text-vital hover:bg-vital/20"
                  >
                    <ExternalLink size={13} /> Open / Download Original
                  </a>
                  <button
                    onClick={() => setPreviewModalFile(null)}
                    className="rounded-xl p-1.5 text-mist hover:bg-panel2 hover:text-ink cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto flex items-center justify-center bg-panel2/50 rounded-xl p-3 border border-edge/40 min-h-[350px]">
                {previewModalFile.url.startsWith('data:image') || previewModalFile.url.match(/\.(png|jpg|jpeg|webp|gif)/i) ? (
                  <img
                    src={previewModalFile.url}
                    alt={previewModalFile.title}
                    className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-lg"
                  />
                ) : (
                  <iframe
                    src={previewModalFile.url}
                    title={previewModalFile.title}
                    className="w-full h-[65vh] rounded-lg border-0"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Surgery Entry Modal */}
      <AnimatePresence>
        {isSurgeryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-edge bg-panel p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div className="flex items-center gap-2">
                  <Scissors size={18} className="text-vital" />
                  <h2 className="text-sm font-semibold text-ink">Record Surgical Procedure</h2>
                </div>
                <button
                  onClick={() => setIsSurgeryModalOpen(false)}
                  className="rounded-xl p-1 text-mist hover:bg-panel2 hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddSurgery} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-ink mb-1">
                    Procedure / Surgery Name <span className="text-vital">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Appendectomy, Knee Replacement"
                    value={surgType}
                    onChange={(e) => setSurgType(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-ink mb-1">Hospital / Clinic</label>
                    <input
                      type="text"
                      placeholder="e.g. Apollo Hospitals"
                      value={surgHospital}
                      onChange={(e) => setSurgHospital(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-ink mb-1">Surgeon Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. S. Ramesh"
                      value={surgSurgeon}
                      onChange={(e) => setSurgSurgeon(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">Surgery Date</label>
                  <input
                    type="date"
                    required
                    value={surgDate}
                    onChange={(e) => setSurgDate(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">Notes & Surgical Details</label>
                  <textarea
                    rows={3}
                    placeholder="Anesthesia details, postoperative recovery notes, implants..."
                    value={surgNotes}
                    onChange={(e) => setSurgNotes(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                  <button
                    type="button"
                    onClick={() => setIsSurgeryModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-medium text-mist hover:bg-panel2 hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSurgery}
                    className="flex items-center gap-1.5 rounded-xl bg-vital px-5 py-2 text-xs font-semibold text-void hover:brightness-110 disabled:opacity-50 shadow-glow"
                  >
                    {savingSurgery ? 'Recording...' : 'Save Surgery Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Prescription Entry Modal */}
      <AnimatePresence>
        {isRxModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-edge bg-panel p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div className="flex items-center gap-2">
                  <Pill size={18} className="text-vital" />
                  <h2 className="text-sm font-semibold text-ink">Record Prescription</h2>
                </div>
                <button onClick={() => setIsRxModalOpen(false)} className="rounded-xl p-1 text-mist hover:bg-panel2 hover:text-ink">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddPrescription} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-ink mb-1">Medication Name <span className="text-vital">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metformin 500 mg, Telmisartan 40 mg"
                    value={rxName}
                    onChange={(e) => setRxName(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-ink mb-1">Dosage / Strength</label>
                    <input
                      type="text"
                      placeholder="e.g. 500 mg, 1 tablet"
                      value={rxDose}
                      onChange={(e) => setRxDose(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-ink mb-1">Frequency</label>
                    <input
                      type="text"
                      placeholder="e.g. Twice daily (Morning & Night)"
                      value={rxFreq}
                      onChange={(e) => setRxFreq(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-ink mb-1">Prescribing Doctor</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. R. Kumar"
                      value={rxDoctor}
                      onChange={(e) => setRxDoctor(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-ink mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={rxDate}
                      onChange={(e) => setRxDate(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">Duration / Course</label>
                  <input
                    type="text"
                    placeholder="e.g. 30 days, 3 months, Ongoing"
                    value={rxDuration}
                    onChange={(e) => setRxDuration(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                  <button type="button" onClick={() => setIsRxModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-medium text-mist hover:bg-panel2 hover:text-ink">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingRx} className="flex items-center gap-1.5 rounded-xl bg-vital px-5 py-2 text-xs font-semibold text-void hover:brightness-110 disabled:opacity-50 shadow-glow">
                    {savingRx ? 'Saving...' : 'Save Prescription'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Allergy Entry Modal */}
      <AnimatePresence>
        {isAllergyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-edge bg-panel p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={18} className="text-emergency" />
                  <h2 className="text-sm font-semibold text-ink">Record Allergy / Sensitivity</h2>
                </div>
                <button onClick={() => setIsAllergyModalOpen(false)} className="rounded-xl p-1 text-mist hover:bg-panel2 hover:text-ink">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddAllergy} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-ink mb-1">Allergen Name <span className="text-vital">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Penicillin, Peanuts, Latex, Sulfa"
                    value={allergenName}
                    onChange={(e) => setAllergenName(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-ink mb-1">Category</label>
                    <select
                      value={allergyCategory}
                      onChange={(e) => setAllergyCategory(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    >
                      <option value="Medication">Medication</option>
                      <option value="Food">Food</option>
                      <option value="Environmental">Environmental</option>
                      <option value="Insect/Latex">Insect / Latex</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-ink mb-1">Severity Level</label>
                    <select
                      value={allergySeverity}
                      onChange={(e) => setAllergySeverity(e.target.value as any)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe (Anaphylactic Risk)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">Reaction Notes & Symptoms</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Hives, difficulty breathing, rash..."
                    value={allergyNotes}
                    onChange={(e) => setAllergyNotes(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                  <button type="button" onClick={() => setIsAllergyModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-medium text-mist hover:bg-panel2 hover:text-ink">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingAllergy} className="flex items-center gap-1.5 rounded-xl bg-emergency px-5 py-2 text-xs font-semibold text-void hover:brightness-110 disabled:opacity-50 shadow-glow">
                    {savingAllergy ? 'Saving...' : 'Save Allergy Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Disease / Condition Entry Modal */}
      <AnimatePresence>
        {isDiseaseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-edge bg-panel p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-ai" />
                  <h2 className="text-sm font-semibold text-ink">Record Medical Condition</h2>
                </div>
                <button onClick={() => setIsDiseaseModalOpen(false)} className="rounded-xl p-1 text-mist hover:bg-panel2 hover:text-ink">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddDisease} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-ink mb-1">Condition / Disease Name <span className="text-vital">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
                    value={diseaseName}
                    onChange={(e) => setDiseaseName(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-ink mb-1">Current Status</label>
                    <select
                      value={diseaseStatus}
                      onChange={(e) => setDiseaseStatus(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="managed">Managed</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-ink mb-1">Diagnosis Date</label>
                    <input
                      type="date"
                      value={diseaseDate}
                      onChange={(e) => setDiseaseDate(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">Clinical Notes & Observations</label>
                  <textarea
                    rows={3}
                    placeholder="Physician notes, HbA1c values, ongoing treatment management..."
                    value={diseaseNotes}
                    onChange={(e) => setDiseaseNotes(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                  <button type="button" onClick={() => setIsDiseaseModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-medium text-mist hover:bg-panel2 hover:text-ink">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingDisease} className="flex items-center gap-1.5 rounded-xl bg-ai px-5 py-2 text-xs font-semibold text-void hover:brightness-110 disabled:opacity-50 shadow-glow">
                    {savingDisease ? 'Saving...' : 'Save Condition Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Vaccination Entry Modal */}
      <AnimatePresence>
        {isVacModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-edge bg-panel p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div className="flex items-center gap-2">
                  <Syringe size={18} className="text-vital" />
                  <h2 className="text-sm font-semibold text-ink">Record Immunization / Vaccine</h2>
                </div>
                <button onClick={() => setIsVacModalOpen(false)} className="rounded-xl p-1 text-mist hover:bg-panel2 hover:text-ink">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddVaccination} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-ink mb-1">Vaccine Name <span className="text-vital">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hepatitis B, COVID-19 Booster, Tdap, MMR"
                    value={vacName}
                    onChange={(e) => setVacName(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-ink mb-1">Dose Number</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={vacDoseNum}
                      onChange={(e) => setVacDoseNum(parseInt(e.target.value, 10) || 1)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-ink mb-1">Administered Date</label>
                    <input
                      type="date"
                      required
                      value={vacDate}
                      onChange={(e) => setVacDate(e.target.value)}
                      className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-ink mb-1">Facility / Health Center</label>
                  <input
                    type="text"
                    placeholder="e.g. Apollo Medical Center, City Health Clinic"
                    value={vacFacility}
                    onChange={(e) => setVacFacility(e.target.value)}
                    className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge">
                  <button type="button" onClick={() => setIsVacModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-medium text-mist hover:bg-panel2 hover:text-ink">
                    Cancel
                  </button>
                  <button type="submit" disabled={savingVac} className="flex items-center gap-1.5 rounded-xl bg-vital px-5 py-2 text-xs font-semibold text-void hover:brightness-110 disabled:opacity-50 shadow-glow">
                    {savingVac ? 'Saving...' : 'Save Vaccine Record'}
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
