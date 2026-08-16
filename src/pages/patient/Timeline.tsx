import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Stethoscope,
  FlaskConical,
  Pill,
  Syringe,
  Scissors,
  Activity,
  FileText,
  Calendar,
  AlertCircle,
  ChevronDown,
  Building2,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import { getPatientTimeline, TimelineEvent } from '../../lib/api/patientTimeline'

const PAGE_SIZE = 10

const categoryIconMap: Record<TimelineEvent['category'], any> = {
  visit: Stethoscope,
  lab: FlaskConical,
  prescription: Pill,
  vaccination: Syringe,
  surgery: Scissors,
}

const categoryLabelMap: Record<TimelineEvent['category'], string> = {
  visit: 'Visit',
  lab: 'Lab Report',
  prescription: 'Prescription',
  vaccination: 'Vaccination',
  surgery: 'Surgery',
}

export default function Timeline() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    let active = true
    const fetchInitialTimeline = async () => {
      setLoading(true)
      setError(null)
      try {
        const initialData = await getPatientTimeline(userId, PAGE_SIZE, 0)
        if (active) {
          setEvents(initialData)
          setOffset(initialData.length)
          setHasMore(initialData.length === PAGE_SIZE)
          setLoading(false)
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load patient timeline:', err)
          setError(err instanceof Error ? err.message : 'Unable to load timeline data.')
          setLoading(false)
        }
      }
    }

    fetchInitialTimeline()

    return () => {
      active = false
    }
  }, [session?.user?.id])

  const handleLoadMore = async () => {
    const userId = session?.user?.id
    if (!userId || loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const nextBatch = await getPatientTimeline(userId, PAGE_SIZE, offset)
      setEvents((prev) => [...prev, ...nextBatch])
      setOffset((prev) => prev + nextBatch.length)
      if (nextBatch.length < PAGE_SIZE) {
        setHasMore(false)
      }
    } catch (err) {
      console.error('Failed to load more timeline events:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Group events chronologically by Year & Month for timeline sections
  const groupedEvents = events.reduce((acc, ev) => {
    const groupTitle = ev.event_date
      ? new Date(ev.event_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Medical History'
    if (!acc[groupTitle]) acc[groupTitle] = []
    acc[groupTitle].push(ev)
    return acc
  }, {} as Record<string, TimelineEvent[]>)

  return (
    <div className="max-w-4xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-2xl font-semibold text-ink">Medical Timeline</h1>
        <p className="mb-6 text-sm text-mist">Every visit, test, vaccination, and surgery — in one continuous history.</p>
      </motion.div>

      {/* Error state alert */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emergency/30 bg-emergency-soft/30 p-4 text-xs text-emergency">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="relative pl-6 space-y-6">
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-edge" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : events.length === 0 ? (
        <Card className="p-8 text-center" hover={false}>
          <FileText size={32} className="mx-auto mb-3 text-mist/60" />
          <p className="text-sm font-medium text-ink">No medical records found</p>
          <p className="mt-1 text-xs text-mist">
            Your timeline will populate automatically as visits, lab reports, prescriptions, vaccinations, and procedures are recorded.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([groupTitle, groupItems]) => (
            <div key={groupTitle} className="space-y-4">
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-void/80 py-1.5 backdrop-blur-md">
                <Calendar size={14} className="text-vital" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-mist">{groupTitle}</h2>
                <div className="h-px flex-1 bg-edge" />
              </div>

              <div className="relative pl-6">
                <div className="absolute left-[9px] top-2 bottom-2 w-px bg-edge" />
                <div className="space-y-4">
                  {groupItems.map((item, i) => {
                    const IconComponent = categoryIconMap[item.category] || Activity
                    const badgeLabel = categoryLabelMap[item.category] || item.category

                    return (
                      <motion.div
                        key={item.id}
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
                              <p className="text-sm font-semibold text-ink">{item.title}</p>
                              {item.place && (
                                <p className="mt-1 flex items-center gap-1.5 text-xs text-mist">
                                  <Building2 size={12} className="shrink-0 text-vital" />
                                  <span>{item.place}</span>
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 rounded-full bg-panel2 px-2.5 py-1 text-[11px] font-medium text-vital border border-edge">
                              {badgeLabel}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-edge/60 pt-2 text-[11px] text-mist">
                            <span>Date: {formatDate(item.event_date)}</span>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-4 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-edge bg-panel2 px-5 py-2.5 text-xs font-semibold text-ink hover:bg-panel transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <span>Loading history...</span>
                ) : (
                  <>
                    <span>Load earlier medical events</span>
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
