import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Stethoscope, FlaskConical, Pill, Syringe, Activity, FileText, UserCheck, Upload, Calendar } from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

type MedicalRecord = {
  id: string
  record_type: string
  title: string
  description: string | null
  occurred_at: string
  doctor_id: string | null
  uploaded_by: string | null
  attachment_path: string | null
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

export default function Timeline() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<MedicalRecord[]>([])

  useEffect(() => {
    if (!session?.user?.id) return

    let active = true
    const fetchTimeline = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('records')
        .select('*')
        .eq('patient_id', session.user.id)
        .order('occurred_at', { ascending: false })

      if (active) {
        if (!error && data) {
          setRecords(data)
        }
        setLoading(false)
      }
    }

    fetchTimeline()

    return () => {
      active = false
    }
  }, [session?.user?.id])

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Group records by year/month for a structured timeline view
  const groupedRecords = records.reduce((acc, rec) => {
    const yearMonth = rec.occurred_at
      ? new Date(rec.occurred_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Recent'
    if (!acc[yearMonth]) acc[yearMonth] = []
    acc[yearMonth].push(rec)
    return acc
  }, {} as Record<string, MedicalRecord[]>)

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-2xl font-semibold text-ink">Medical Timeline</h1>
        <p className="mb-6 text-sm text-mist">Every visit, test, and prescription — in one continuous history.</p>
      </motion.div>

      {loading ? (
        <div className="space-y-4 pl-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : records.length === 0 ? (
        <Card className="p-8 text-center" hover={false}>
          <FileText size={32} className="mx-auto mb-3 text-mist/60" />
          <p className="text-sm font-medium text-ink">No medical records found</p>
          <p className="mt-1 text-xs text-mist">
            Your timeline will populate automatically as doctors create entries or when you upload documents under Records.
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
                                {rec.doctor_id ? (
                                  <span className="flex items-center gap-1 rounded-full bg-vital-soft px-2 py-0.5 text-[10px] font-medium text-vital">
                                    <UserCheck size={10} /> Doctor Authored
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
  )
}
