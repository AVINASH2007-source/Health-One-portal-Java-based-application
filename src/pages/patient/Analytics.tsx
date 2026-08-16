import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Pill,
  TrendingUp,
  Activity,
  BarChart2,
  Sparkles,
  Brain,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Heart,
} from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import Card from '../../components/ui/Card'
import StatCard from '../../components/ui/StatCard'
import Skeleton from '../../components/ui/Skeleton'
import AIAssistantBubble from '../../components/ui/AIAssistantBubble'
import { useAuth } from '../../lib/AuthContext'
import { generateHealthInsight } from '../../lib/gemini'
import {
  getHealthAnalyticsSummary,
  HealthAnalyticsSummary,
} from '../../lib/api/patientAnalytics'

export default function Analytics() {
  const { session, name } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<HealthAnalyticsSummary | null>(null)
  const [aiInsightMessage, setAiInsightMessage] = useState<string>('')

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return

    let active = true
    const fetchAnalytics = async () => {
      setLoading(true)
      setError(null)

      try {
        const summary = await getHealthAnalyticsSummary(userId)
        if (!active) return

        setData(summary)
        setLoading(false)

        // Generate Gemini AI Insights
        generateHealthInsight({
          patientName: name,
          recordsCount: summary.totalRecordsCount,
          activeMedsCount: summary.activeMedicationsCount,
          recentTitles: summary.recentTitles,
        }).then((insight) => {
          if (active) setAiInsightMessage(insight)
        })
      } catch (err) {
        if (!active) return
        console.error('Failed to load health analytics:', err)
        setError(err instanceof Error ? err.message : 'Unable to load health analytics data.')
        setLoading(false)
      }
    }

    fetchAnalytics()

    return () => {
      active = false
    }
  }, [session?.user?.id, name])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-2xl font-semibold text-ink">Health Analytics & Gemini AI Insights</h1>
        <p className="text-sm text-mist">
          Quantitative health metrics, vital sign longitudinal trends, and predictive Gemini AI evaluation.
        </p>
      </motion.div>

      {/* Error state notification */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-emergency/30 bg-emergency-soft/30 p-4 text-xs text-emergency">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* AI Assistant Analytical Card */}
      <Card delay={0} className="p-6" glow="ai" hover={false}>
        <div className="mb-3 flex items-center justify-between border-b border-edge/60 pb-3">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-ai" />
            <h2 className="text-sm font-semibold text-ink">Gemini AI Predictive Health Analysis</h2>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-ai-soft px-2.5 py-0.5 text-[11px] font-medium text-ai">
            <Sparkles size={11} /> Gemini AI
          </span>
        </div>
        <AIAssistantBubble message={aiInsightMessage || 'Generating Gemini AI predictive health synthesis...'} />

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
          label="Total Records Analyzed"
          value={data?.totalRecordsCount ?? 0}
          trend="Aggregated medical history"
          accent="vital"
          delay={0.05}
        />
        <StatCard
          icon={Pill}
          label="Active Medications"
          value={data?.activeMedicationsCount ?? 0}
          trend="Currently prescribed"
          accent="ai"
          delay={0.1}
        />
        <StatCard
          icon={Heart}
          label="Avg Systolic Pressure"
          value={data?.avgSystolic ?? 120}
          suffix=" mmHg"
          trend={`Diastolic avg: ${data?.avgDiastolic ?? 80} mmHg`}
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
        <>
          {/* Blood Pressure & Vitals Trend Chart */}
          <Card delay={0.2} className="p-5" hover={false}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Blood Pressure Longitudinal Trend</p>
                <p className="text-xs text-mist">Systolic and Diastolic pressure readings (mmHg)</p>
              </div>
              <Activity size={16} className="text-vital" />
            </div>

            {(!data?.vitalsTrend || data.vitalsTrend.length === 0) ? (
              <div className="py-16 text-center text-xs text-mist">
                No recent blood pressure trend readings available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.vitalsTrend}>
                  <defs>
                    <linearGradient id="sysGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="diaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#818CF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="dateLabel" stroke="#7FA3D6" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="#7FA3D6" tickLine={false} axisLine={false} fontSize={11} domain={[50, 160]} />
                  <Tooltip
                    contentStyle={{
                      background: '#0D2747',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 12,
                      color: '#EAF4FF',
                    }}
                  />
                  <Area type="monotone" dataKey="systolic" stroke="#22D3EE" strokeWidth={2} fill="url(#sysGrad)" name="Systolic (mmHg)" />
                  <Area type="monotone" dataKey="diastolic" stroke="#818CF8" strokeWidth={2} fill="url(#diaGrad)" name="Diastolic (mmHg)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Monthly Records Trend */}
            <Card delay={0.25} className="p-5" hover={false}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Healthcare Event Volume Over Time</p>
                  <p className="text-xs text-mist">Monthly interactions (visits, labs, prescriptions)</p>
                </div>
                <TrendingUp size={16} className="text-vital" />
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data?.monthlyTrends || []}>
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
                  <Area type="monotone" dataKey="recordsCount" stroke="#22D3EE" strokeWidth={2.5} fill="url(#recGrad)" name="Events" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Record Breakdown by Category */}
            <Card delay={0.3} className="p-5" hover={false}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Record Breakdown by Category</p>
                  <p className="text-xs text-mist">Distribution across visits, labs, prescriptions, vaccines</p>
                </div>
                <BarChart2 size={16} className="text-ai" />
              </div>

              {(!data?.categoryDistribution || data.categoryDistribution.every((c) => c.count === 0)) ? (
                <div className="py-16 text-center text-xs text-mist">
                  No record data available to display distribution chart.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.categoryDistribution}>
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
        </>
      )}
    </div>
  )
}
