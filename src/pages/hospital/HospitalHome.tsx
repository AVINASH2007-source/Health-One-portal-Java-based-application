import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Stethoscope, Building2, Activity, FileText, ScrollText, Sparkles } from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts'
import Card from '../../components/ui/Card'
import StatCard from '../../components/ui/StatCard'
import Skeleton from '../../components/ui/Skeleton'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

type RealDepartment = {
  id: string
  name: string
  created_at: string
}

const admissionsData = [
  { day: 'Mon', admissions: 22 },
  { day: 'Tue', admissions: 27 },
  { day: 'Wed', admissions: 19 },
  { day: 'Thu', admissions: 31 },
  { day: 'Fri', admissions: 26 },
  { day: 'Sat', admissions: 18 },
  { day: 'Sun', admissions: 14 },
]

export default function HospitalHome() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [doctorCount, setDoctorCount] = useState<number | null>(null)
  const [deptCount, setDeptCount] = useState<number | null>(null)
  const [patientsSeenCount, setPatientsSeenCount] = useState<number | null>(null)
  const [auditLogsCount, setAuditLogsCount] = useState<number | null>(null)
  const [realDepartments, setRealDepartments] = useState<RealDepartment[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return
      setLoading(true)
      setFetchError(null)

      try {
        // 1. Fetch Verified Doctors Count
        const { count: docCountRes, error: docErr } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'doctor')
          .eq('hospital_id', user.id)

        if (docErr) console.error('Error fetching doctor count:', docErr.message)

        // 2. Fetch Departments Count
        const { count: deptCountRes, error: deptErr } = await supabase
          .from('departments')
          .select('*', { count: 'exact', head: true })
          .eq('hospital_id', user.id)

        if (deptErr) console.error('Error fetching department count:', deptErr.message)

        // 3. Fetch Real Departments List
        const { data: deptList, error: listErr } = await supabase
          .from('departments')
          .select('id, name, created_at')
          .eq('hospital_id', user.id)
          .order('created_at', { ascending: false })

        if (listErr) console.error('Error fetching department list:', listErr.message)

        // 4. Compute Unique Patients Served Count
        const { data: doctorIds } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'doctor')
          .eq('hospital_id', user.id)

        let uniquePatients = 0
        if (doctorIds && doctorIds.length > 0) {
          const ids = doctorIds.map((d) => d.id)
          const { data: patientRows } = await supabase
            .from('records')
            .select('patient_id')
            .in('doctor_id', ids)

          if (patientRows) {
            uniquePatients = new Set(patientRows.map((r) => r.patient_id)).size
          }
        }

        // 5. Fetch Audit Logs Count
        const { count: auditCountRes } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })

        setDoctorCount(docCountRes ?? 0)
        setDeptCount(deptCountRes ?? 0)
        setPatientsSeenCount(uniquePatients)
        setAuditLogsCount(auditCountRes ?? 0)
        setRealDepartments(deptList || [])
      } catch (err: any) {
        console.error('Failed to load hospital home metrics:', err)
        setFetchError('Unable to load some database metrics.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user])

  const hospitalName = profile?.name || 'Hospital Dashboard'

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{hospitalName}</h1>
        <p className="text-sm text-mist">Live overview across all linked medical staff and departments.</p>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 font-medium">
          Note: {fetchError} Displaying fallback values.
        </div>
      )}

      {/* Metrics StatCards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Verified Doctors" value={doctorCount ?? 0} icon={Stethoscope} accent="ai" delay={0} />
          <StatCard label="Departments" value={deptCount ?? 0} icon={Building2} accent="vital" delay={0.05} />
          <StatCard label="Patients Served" value={patientsSeenCount ?? 0} icon={Users} accent="ai" delay={0.1} />
          <StatCard label="Audit Log Entries" value={auditLogsCount ?? 0} icon={ScrollText} accent="vital" delay={0.15} />
        </div>
      )}

      {/* Chart & Staff Summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card delay={0.2} className="p-5 lg:col-span-2" hover={false}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Admissions Trend</p>
              <p className="text-[11px] text-mist">Hospital patient intake (Weekly Demo Trend)</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-ai/10 px-2.5 py-0.5 text-[11px] font-medium text-ai">
              <Sparkles size={11} /> Visual Metric
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={admissionsData}>
              <XAxis dataKey="day" stroke="#7FA3D6" tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: '#0D2747', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12, color: '#EAF4FF' }}
              />
              <Bar dataKey="admissions" fill="#3B82F6" radius={[8, 8, 0, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card delay={0.25} className="p-5" hover={false}>
          <div className="mb-4 flex items-center gap-2">
            <Users size={15} className="text-vital" />
            <p className="text-sm font-medium text-ink">Hospital Summary</p>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Linked Doctors', value: loading ? '...' : (doctorCount ?? 0) },
              { label: 'Active Departments', value: loading ? '...' : (deptCount ?? 0) },
              { label: 'Unique Patients Treated', value: loading ? '...' : (patientsSeenCount ?? 0) },
              { label: 'System Audit Logs', value: loading ? '...' : (auditLogsCount ?? 0) },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between rounded-xl border border-edge bg-panel2 px-3 py-2.5">
                <span className="text-mist">{s.label}</span>
                <span className="font-medium text-ink">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Real Configured Departments List */}
      <Card delay={0.3} className="p-5" hover={false}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-vital" />
            <p className="text-sm font-medium text-ink">Hospital Departments ({realDepartments.length})</p>
          </div>
          <a href="/hospital/departments" className="text-xs font-medium text-ai hover:underline">
            Manage Departments →
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : realDepartments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-edge bg-panel2/40 p-6 text-center text-xs text-mist">
            No departments configured yet. Visit <a href="/hospital/departments" className="text-ai font-medium underline">Department Management</a> to create your first division.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {realDepartments.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className="rounded-xl border border-edge bg-panel2 p-4 flex flex-col justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{d.name}</p>
                  <p className="mt-1 text-[11px] text-mist">
                    Added {new Date(d.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active Unit
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Activity Feed */}
      <Card delay={0.4} className="p-5" hover={false}>
        <div className="mb-4 flex items-center gap-2">
          <Activity size={15} className="text-ai" />
          <p className="text-sm font-medium text-ink">Recent Audit Activity</p>
        </div>
        <div className="space-y-4 border-l border-edge pl-4 text-xs">
          {[
            { text: 'Doctor linked to hospital staff roster', time: 'Recently' },
            { text: 'Department configurations updated', time: 'Today' },
            { text: 'Emergency access log monitoring active', time: 'Live' },
          ].map((a, i) => (
            <motion.div
              key={a.text}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.08 }}
              className="relative"
            >
              <span className="absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-ai" />
              <p className="text-sm text-ink">{a.text}</p>
              <p className="text-xs text-mist">{a.time}</p>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  )
}
