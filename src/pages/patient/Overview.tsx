import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Pill, Sparkles, FileText, Activity, ShieldAlert, ChevronRight, Clock, Plus, FolderKanban } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import VitalMini from '../../components/ui/VitalMini'
import Card from '../../components/ui/Card'
import HealthRing from '../../components/ui/HealthRing'
import AIAssistantBubble from '../../components/ui/AIAssistantBubble'
import StatCard from '../../components/ui/StatCard'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { generateHealthInsight } from '../../lib/gemini'

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

type Medication = {
  id: string
  name: string
  dosage: string
  frequency: string
  start_date: string
  end_date: string | null
  notes: string | null
}

const bpData = [
  { day: 'Mon', bp: 118 }, { day: 'Tue', bp: 121 }, { day: 'Wed', bp: 117 },
  { day: 'Thu', bp: 123 }, { day: 'Fri', bp: 119 }, { day: 'Sat', bp: 116 }, { day: 'Sun', bp: 120 },
]

export default function Overview() {
  const navigate = useNavigate()
  const { session, name } = useAuth()
  const [loading, setLoading] = useState(true)
  const [totalRecords, setTotalRecords] = useState<number>(0)
  const [activeMedsCount, setActiveMedsCount] = useState<number>(0)
  const [recentRecords, setRecentRecords] = useState<MedicalRecord[]>([])
  const [activeMedsList, setActiveMedsList] = useState<Medication[]>([])
  const [aiInsight, setAiInsight] = useState<string>('')

  useEffect(() => {
    if (!session?.user?.id) return

    let isMounted = true
    const fetchData = async () => {
      setLoading(true)
      const todayISO = new Date().toISOString().split('T')[0]

      // 1. Total records count
      const { count: recCount } = await supabase
        .from('records')
        .select('*', { count: 'exact', head: true })
        .eq('patient_id', session.user.id)

      // 2. Active medications count
      const { count: medCount, data: meds } = await supabase
        .from('medications')
        .select('*', { count: 'exact' })
        .eq('patient_id', session.user.id)
        .or(`end_date.is.null,end_date.gte.${todayISO}`)
        .order('created_at', { ascending: false })

      // 3. Recent 5 records
      const { data: recs } = await supabase
        .from('records')
        .select('*')
        .eq('patient_id', session.user.id)
        .order('occurred_at', { ascending: false })
        .limit(5)

      if (isMounted) {
        const totalRecs = recCount ?? 0
        const activeMeds = medCount ?? 0
        const recentTitles = (recs || []).map((r) => r.title)

        setTotalRecords(totalRecs)
        setActiveMedsCount(activeMeds)
        setActiveMedsList(meds ?? [])
        setRecentRecords(recs ?? [])
        setLoading(false)

        // Generate Gemini AI Insight
        generateHealthInsight({
          patientName: name,
          recordsCount: totalRecs,
          activeMedsCount: activeMeds,
          recentTitles,
        }).then((insight) => {
          if (isMounted) setAiInsight(insight)
        })
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [session?.user?.id, name])

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
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

      {/* Top metrics summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={FileText}
          label="Total Records"
          value={totalRecords}
          trend="Medical history entries"
          accent="vital"
          delay={0}
        />
        <StatCard
          icon={Pill}
          label="Active Medications"
          value={activeMedsCount}
          trend="Currently prescribed"
          accent="ai"
          delay={0.05}
        />
        <StatCard
          icon={Activity}
          label="Recent Activity"
          value={recentRecords.length}
          trend="Last 30 days"
          accent="emergency"
          delay={0.1}
        />
      </div>

      {/* Health score + AI assistant */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card delay={0.15} className="flex flex-col items-center justify-center p-6 lg:col-span-1" hover={false}>
          <HealthRing score={85} />
          <p className="mt-3 text-center text-xs text-mist">Trending steady based on active health metrics</p>
        </Card>

        <Card delay={0.2} className="p-5 lg:col-span-2" hover={false}>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={15} className="text-ai" />
            <p className="text-sm font-medium text-ink">Today's Gemini AI Insight</p>
          </div>
          <AIAssistantBubble
            message={
              aiInsight ||
              `Generating AI health evaluation for ${name || 'Patient'} based on longitudinal medical history...`
            }
          />
        </Card>
      </div>

      {/* Blood pressure trend & Active Medications preview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card delay={0.25} className="p-5 lg:col-span-2" hover={false}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Vitals — Blood Pressure (Systolic)</p>
            <span className="text-xs text-mist">7-day avg: 119 mmHg</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={bpData}>
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
        </Card>

        <Card delay={0.3} className="p-5 flex flex-col justify-between" hover={false}>
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
            ) : activeMedsList.length === 0 ? (
              <div className="py-6 text-center text-xs text-mist">
                No active medications recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {activeMedsList.slice(0, 3).map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center justify-between rounded-xl border border-edge bg-panel2 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{m.name}</p>
                      <p className="text-xs text-mist">{m.dosage} · {m.frequency}</p>
                    </div>
                    <span className="rounded-md bg-vital-soft px-2 py-0.5 text-[11px] font-medium text-vital">Active</span>
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

      {/* Recent Activity Timeline & Emergency Card Quick Access */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card delay={0.35} className="p-5 lg:col-span-2" hover={false}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-ai" />
              <p className="text-sm font-medium text-ink">Recent Medical Activity</p>
            </div>
            <button
              onClick={() => navigate('/patient/timeline')}
              className="flex items-center gap-1 text-xs text-vital hover:underline font-medium"
            >
              Full timeline <ChevronRight size={13} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : recentRecords.length === 0 ? (
            <div className="py-8 text-center text-sm text-mist flex flex-col items-center gap-2">
              <FolderKanban size={24} className="text-mist/60" />
              <p>No medical records yet.</p>
              <button
                onClick={() => navigate('/patient/records')}
                className="mt-1 rounded-lg bg-panel2 px-3 py-1.5 text-xs text-vital border border-edge hover:bg-panel"
              >
                Upload your first document
              </button>
            </div>
          ) : (
            <div className="relative space-y-4 border-l border-edge pl-5 ml-2">
              {recentRecords.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="relative"
                >
                  <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-void bg-vital" />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">{r.title}</p>
                      {r.description && <p className="text-xs text-mist line-clamp-1">{r.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-mist">{formatDate(r.occurred_at)}</span>
                      {r.uploaded_by && (
                        <span className="ml-2 rounded-full bg-ai-soft px-2 py-0.5 text-[10px] text-ai font-medium">
                          Self-uploaded
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        <Card delay={0.4} className="flex flex-col justify-between p-5" glow="emergency">
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
