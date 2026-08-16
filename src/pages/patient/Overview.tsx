import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Pill,
  Sparkles,
  Activity,
  ShieldAlert,
  ChevronRight,
  Clock,
  Plus,
  FolderKanban,
  Heart,
  Moon,
  Footprints,
  Calendar,
  AlertCircle,
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import VitalMini from '../../components/ui/VitalMini'
import Card from '../../components/ui/Card'
import HealthRing from '../../components/ui/HealthRing'
import AIAssistantBubble from '../../components/ui/AIAssistantBubble'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import { generateHealthInsight } from '../../lib/gemini'
import {
  getRecentVitals,
  getLatestVitalReading,
  getActiveMedications,
  getUpcomingAppointments,
  getRecentTimeline,
  VitalReading,
  Medication,
  Appointment,
  TimelineItem,
} from '../../lib/api/patientOverview'

interface BpPoint {
  day: string
  bp: number
}

export default function Overview() {
  const navigate = useNavigate()
  const { session, name } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [latestVital, setLatestVital] = useState<VitalReading | null>(null)
  const [bpTrend, setBpTrend] = useState<BpPoint[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [aiInsight, setAiInsight] = useState<string>('')

  // Placeholder heuristic score calculation:
  // Note: This is a placeholder heuristic formula based on recent vitals & active medications, not a validated clinical score.
  const calculateHealthScore = (
    latest: VitalReading | null,
    medsCount: number
  ): number => {
    let score = 100

    if (!latest) return 85 // Default sensible baseline if no vital readings yet

    // Deduct points if heart rate is out of normal range (60-100 bpm)
    if (latest.heart_rate && (latest.heart_rate < 60 || latest.heart_rate > 100)) {
      score -= 5
    }

    // Deduct points if SpO2 is below 95%
    if (latest.spo2 && latest.spo2 < 95) {
      score -= 10
    }

    // Deduct points if blood pressure systolic is elevated (>125 mmHg)
    if (latest.bp_systolic && latest.bp_systolic > 125) {
      score -= 5
    }

    // Deduct points for high medication load / missed items
    if (medsCount > 5) {
      score -= 5
    }

    return Math.max(0, Math.min(100, score))
  }

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    let isMounted = true

    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [vitalsList, latest, activeMeds, upcomingApps, recentEvents] = await Promise.all([
          getRecentVitals(userId),
          getLatestVitalReading(userId),
          getActiveMedications(userId),
          getUpcomingAppointments(userId),
          getRecentTimeline(userId),
        ])

        if (!isMounted) return

        setLatestVital(latest)
        setMedications(activeMeds)
        setAppointments(upcomingApps)
        setTimeline(recentEvents)

        // Map past 7 vital readings to blood pressure chart points
        const points: BpPoint[] = vitalsList.map((v) => {
          const dateObj = new Date(v.recorded_at)
          const dayName = isNaN(dateObj.getTime())
            ? 'Recent'
            : dateObj.toLocaleDateString('en-US', { weekday: 'short' })
          return {
            day: dayName,
            bp: v.bp_systolic ?? 120,
          }
        })
        setBpTrend(points)

        setLoading(false)

        // Trigger Gemini AI Insight calculation in background
        const recentTitles = recentEvents.map((item) => item.title)
        generateHealthInsight({
          patientName: name,
          recordsCount: recentEvents.length,
          activeMedsCount: activeMeds.length,
          recentTitles,
        }).then((insight) => {
          if (isMounted) setAiInsight(insight)
        })
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load Patient Overview data:', err)
        setError(err instanceof Error ? err.message : 'Unable to load health dashboard data.')
        setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [session?.user?.id, name])

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const healthScore = calculateHealthScore(latestVital, medications.length)

  // Formatting vital mini values
  const heartRateVal = latestVital?.heart_rate ? `${latestVital.heart_rate} bpm` : '-- bpm'
  const spo2Val = latestVital?.spo2 ? `${latestVital.spo2}%` : '--%'
  const sleepVal = latestVital?.sleep_minutes
    ? `${Math.floor(latestVital.sleep_minutes / 60)}h ${latestVital.sleep_minutes % 60}m`
    : '-- hrs'
  const stepsVal = latestVital?.steps ? `${latestVital.steps.toLocaleString()}` : '--'

  const avgBpSystolic =
    bpTrend.length > 0
      ? Math.round(bpTrend.reduce((acc, curr) => acc + curr.bp, 0) / bpTrend.length)
      : 120

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Welcome back, {name || 'Patient'}
          </h1>
          <p className="text-sm text-mist">Here's your live health snapshot & recent activity.</p>
        </div>
        <button
          onClick={() => navigate('/patient/records')}
          className="hidden sm:flex items-center gap-1.5 rounded-xl bg-vital px-4 py-2 text-xs font-semibold text-void hover:brightness-110"
        >
          <Plus size={14} /> Upload document
        </button>
      </motion.div>

      {/* Error state notification if data fetch fails */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-emergency/30 bg-emergency-soft/30 p-4 text-xs text-emergency">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 VitalMini cards grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </>
        ) : (
          <>
            <VitalMini
              icon={Heart}
              label="Heart Rate"
              value={heartRateVal}
              accent="vital"
              delay={0}
            />
            <VitalMini
              icon={Activity}
              label="Blood Oxygen (SpO2)"
              value={spo2Val}
              accent="vital"
              delay={0.05}
            />
            <VitalMini
              icon={Moon}
              label="Sleep Duration"
              value={sleepVal}
              accent="ai"
              delay={0.1}
            />
            <VitalMini
              icon={Footprints}
              label="Daily Steps"
              value={stepsVal}
              accent="vital"
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* Health score + AI assistant */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card delay={0.2} className="flex flex-col items-center justify-center p-6 lg:col-span-1" hover={false}>
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-32 w-32 rounded-full" />
              <Skeleton className="h-4 w-3/4 rounded-lg" />
            </div>
          ) : (
            <>
              <HealthRing score={healthScore} />
              <p className="mt-3 text-center text-xs text-mist">
                Trending steady based on active health metrics
              </p>
            </>
          )}
        </Card>

        <Card delay={0.25} className="p-5 lg:col-span-2" hover={false}>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={15} className="text-ai" />
            <p className="text-sm font-medium text-ink">Today's Gemini AI Insight</p>
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-5/6 rounded-lg" />
              <Skeleton className="h-4 w-2/3 rounded-lg" />
            </div>
          ) : (
            <AIAssistantBubble
              message={
                aiInsight ||
                `Generating AI health evaluation for ${name || 'Patient'} based on longitudinal medical history...`
              }
            />
          )}
        </Card>
      </div>

      {/* Blood pressure trend & Active Medications preview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card delay={0.3} className="p-5 lg:col-span-2" hover={false}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Vitals — Blood Pressure (Systolic)</p>
            <span className="text-xs text-mist">7-day avg: {avgBpSystolic} mmHg</span>
          </div>

          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-xl" />
          ) : bpTrend.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-xs text-mist">
              No blood pressure readings recorded for the past 7 days.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={bpTrend}>
                <defs>
                  <linearGradient id="bp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#7FA3D6" tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#0D2747',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#EAF4FF',
                    boxShadow: '0 8px 24px -12px rgba(0,0,0,0.5)',
                  }}
                />
                <Area type="monotone" dataKey="bp" stroke="#22D3EE" strokeWidth={2.5} fill="url(#bp)" animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Active Medications card */}
        <Card delay={0.35} className="p-5 flex flex-col justify-between" hover={false}>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill size={15} className="text-vital" />
                <p className="text-sm font-medium text-ink">Active Medications</p>
              </div>
              <button
                onClick={() => navigate('/patient/medications')}
                className="text-xs font-medium text-vital hover:underline"
              >
                View all
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : medications.length === 0 ? (
              <div className="py-6 text-center text-xs text-mist">
                No active medications recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {medications.slice(0, 3).map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="flex items-center justify-between rounded-xl border border-edge bg-panel2 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{m.name}</p>
                      <p className="text-xs text-mist">{m.dose || 'Standard dose'} · {m.frequency || 'Daily'}</p>
                    </div>
                    <span className="rounded-md bg-vital-soft px-2 py-0.5 text-[11px] font-medium text-vital">
                      Active
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-edge pt-3">
            <button
              onClick={() => navigate('/patient/medications')}
              className="flex w-full items-center justify-center gap-1 text-xs text-mist hover:text-ink transition-colors"
            >
              Manage medications <ChevronRight size={13} />
            </button>
          </div>
        </Card>
      </div>

      {/* Upcoming Appointments & Recent Activity Timeline & Emergency Card Quick Access */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Upcoming Appointments Card */}
        <Card delay={0.4} className="p-5" hover={false}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-vital" />
              <p className="text-sm font-medium text-ink">Upcoming Appointments</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-8 text-center text-xs text-mist flex flex-col items-center gap-1.5">
              <Calendar size={22} className="text-mist/60" />
              <p>No upcoming appointments scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((app, i) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="rounded-xl border border-edge bg-panel2 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">{app.doctor_name}</p>
                      {app.department && (
                        <p className="text-xs text-mist">{app.department}</p>
                      )}
                      {app.reason && (
                        <p className="mt-1 text-[11px] text-mist/80 italic">{app.reason}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="rounded-full bg-vital-soft px-2 py-0.5 text-[10px] text-vital font-medium">
                        {formatDate(app.time)}
                      </span>
                      {formatTime(app.time) && (
                        <p className="mt-1 text-[10px] text-mist">{formatTime(app.time)}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Medical Activity Timeline */}
        <Card delay={0.45} className="p-5" hover={false}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-ai" />
              <p className="text-sm font-medium text-ink">Recent Activity</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : timeline.length === 0 ? (
            <div className="py-8 text-center text-xs text-mist flex flex-col items-center gap-1.5">
              <FolderKanban size={22} className="text-mist/60" />
              <p>No recent activity recorded.</p>
            </div>
          ) : (
            <div className="relative space-y-3.5 border-l border-edge pl-4 ml-1">
              {timeline.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                  className="relative"
                >
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border-2 border-void bg-vital" />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-ink">{item.title}</p>
                      {item.subtitle && <p className="text-[11px] text-mist">{item.subtitle}</p>}
                    </div>
                    <span className="text-[10px] text-mist shrink-0">{formatDate(item.date)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Emergency Card Quick Access */}
        <Card delay={0.5} className="flex flex-col justify-between p-5" glow="emergency">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emergency-soft">
                <ShieldAlert size={18} className="text-emergency" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Emergency Health Card</p>
                <p className="text-xs text-mist">Instant life-critical info for first responders</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-mist leading-relaxed">
              Keep your emergency contact, blood group, drug allergies, and medical conditions updated for response teams.
            </p>
          </div>

          <button
            onClick={() => navigate('/patient/emergency-card')}
            className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emergency px-4 py-2.5 text-xs font-semibold text-void hover:brightness-110 transition-all shadow-glow-em"
          >
            Manage Emergency Card <ChevronRight size={14} />
          </button>
        </Card>
      </div>
    </div>
  )
}
