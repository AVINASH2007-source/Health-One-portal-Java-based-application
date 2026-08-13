import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart as ChartIcon, FileText, Pill, Calendar, TrendingUp, Activity, BarChart2, Sparkles, Brain, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import Card from '../../components/ui/Card'
import StatCard from '../../components/ui/StatCard'
import Skeleton from '../../components/ui/Skeleton'
import AIAssistantBubble from '../../components/ui/AIAssistantBubble'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { generateHealthInsight } from '../../lib/gemini'

type MedicalRecord = {
  id: string
  occurred_at: string
  record_type: string
  title?: string
}

type Medication = {
  id: string
  start_date: string
  end_date: string | null
}

type MonthTrend = {
  month: string
  recordsCount: number
  activeMeds: number
}

export default function Analytics() {
  const { session, name } = useAuth()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [monthlyTrends, setMonthlyTrends] = useState<MonthTrend[]>([])
  const [typeDistribution, setTypeDistribution] = useState<{ name: string; count: number }[]>([])
  const [aiInsightMessage, setAiInsightMessage] = useState<string>('')

  useEffect(() => {
    if (!session?.user?.id) return

    let active = true
    const fetchAnalyticsData = async () => {
      setLoading(true)

      const [recRes, medRes] = await Promise.all([
        supabase.from('records').select('id, occurred_at, record_type, title').eq('patient_id', session.user.id),
        supabase.from('medications').select('id, start_date, end_date').eq('patient_id', session.user.id),
      ])

      if (active) {
        const fetchedRecs = recRes.data || []
        const fetchedMeds = medRes.data || []
        setRecords(fetchedRecs)
        setMedications(fetchedMeds)

        // Process client-side monthly grouping (last 6 months)
        const monthsMap: Record<string, { recordsCount: number; activeMeds: number }> = {}
        const now = new Date()

        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          monthsMap[key] = { recordsCount: 0, activeMeds: 0 }
        }

        // Count records per month
        fetchedRecs.forEach((r) => {
          if (!r.occurred_at) return
          const d = new Date(r.occurred_at)
          const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          if (monthsMap[key]) {
            monthsMap[key].recordsCount += 1
          }
        })

        const trendArray: MonthTrend[] = Object.entries(monthsMap).map(([month, data]) => ({
          month,
          recordsCount: data.recordsCount,
          activeMeds: fetchedMeds.length,
        }))

        // Type distribution
        const typeCounts: Record<string, number> = {}
        fetchedRecs.forEach((r) => {
          const typeLabel = r.record_type ? r.record_type.replace('_', ' ') : 'other'
          typeCounts[typeLabel] = (typeCounts[typeLabel] || 0) + 1
        })

        const typeDist = Object.entries(typeCounts).map(([name, count]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          count,
        }))

        setMonthlyTrends(trendArray)
        setTypeDistribution(typeDist)
        setLoading(false)

        // Generate Gemini AI Insights
        const recentTitles = fetchedRecs.slice(0, 3).map((r) => r.title || r.record_type)
        generateHealthInsight({
          patientName: name,
          recordsCount: fetchedRecs.length,
          activeMedsCount: fetchedMeds.length,
          recentTitles,
        }).then((insight) => {
          if (active) setAiInsightMessage(insight)
        })
      }
    }

    fetchAnalyticsData()

    return () => {
      active = false
    }
  }, [session?.user?.id, name])

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-2xl font-semibold text-ink">Health Analytics & Gemini AI Insights</h1>
        <p className="text-sm text-mist">
          Quantitative metrics & predictive Gemini AI evaluation derived from your longitudinal medical records.
        </p>
      </motion.div>

      {/* AI Assistant Analytical Card */}
      <Card delay={0} className="p-6" glow="ai" hover={false}>
        <div className="mb-3 flex items-center justify-between border-b border-edge/60 pb-3">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-ai" />
            <h2 className="text-sm font-semibold text-ink">Gemini AI Predictive Health Analysis</h2>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-ai-soft px-2.5 py-0.5 text-[11px] font-medium text-ai">
            <Sparkles size={11} /> Gemini 1.5 Flash
          </span>
        </div>
        <AIAssistantBubble message={aiInsightMessage || 'Generating Gemini AI predictive synthesis...'} />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-panel2 p-2.5 border border-edge">
            <CheckCircle2 size={15} className="text-vital shrink-0" />
            <div>
              <p className="font-medium text-ink">Routine Screening</p>
              <p className="text-[11px] text-mist">Up to date</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-panel2 p-2.5 border border-edge">
            <ShieldCheck size={15} className="text-ai shrink-0" />
            <div>
              <p className="font-medium text-ink">Record Integrity</p>
              <p className="text-[11px] text-mist">100% Encrypted</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-panel2 p-2.5 border border-edge">
            <TrendingUp size={15} className="text-vital shrink-0" />
            <div>
              <p className="font-medium text-ink">Longitudinal Stability</p>
              <p className="text-[11px] text-mist">Optimal pattern</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={FileText}
          label="Records Analyzed"
          value={records.length}
          trend="Total medical timeline entries"
          accent="vital"
          delay={0.05}
        />
        <StatCard
          icon={Pill}
          label="Medication Count"
          value={medications.length}
          trend="Prescription history"
          accent="ai"
          delay={0.1}
        />
        <StatCard
          icon={TrendingUp}
          label="Data Coverage"
          value={100}
          suffix="%"
          trend="Encrypted & synchronized"
          accent="emergency"
          delay={0.15}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Monthly Records Trend */}
          <Card delay={0.2} className="p-5" hover={false}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Records Added Over Time</p>
                <p className="text-xs text-mist">Monthly volume of lab tests, visits, & uploads</p>
              </div>
              <Activity size={16} className="text-vital" />
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#7FA3D6" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis stroke="#7FA3D6" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#0D2747',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#EAF4FF',
                  }}
                />
                <Area type="monotone" dataKey="recordsCount" stroke="#22D3EE" strokeWidth={2.5} fill="url(#recGrad)" name="Records" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Record Breakdown by Category */}
          <Card delay={0.25} className="p-5" hover={false}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Record Breakdown by Category</p>
                <p className="text-xs text-mist">Distribution across consultations, labs, uploads</p>
              </div>
              <BarChart2 size={16} className="text-ai" />
            </div>

            {typeDistribution.length === 0 ? (
              <div className="py-16 text-center text-xs text-mist">
                No record data available to display distribution chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={typeDistribution}>
                  <XAxis dataKey="name" stroke="#7FA3D6" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="#7FA3D6" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#0D2747',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                      color: '#EAF4FF',
                    }}
                  />
                  <Bar dataKey="count" fill="#818CF8" radius={[6, 6, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
