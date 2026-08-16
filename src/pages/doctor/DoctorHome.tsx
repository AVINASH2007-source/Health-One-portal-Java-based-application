import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, AlertTriangle, Calendar, Activity, Sparkles, ChevronRight, User, ShieldCheck, Lock, ExternalLink, FileText, Stethoscope } from 'lucide-react'
import Card from '../../components/ui/Card'
import StatCard from '../../components/ui/StatCard'
import Skeleton from '../../components/ui/Skeleton'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

type PatientProfile = {
  id: string
  name: string
  email: string
  created_at: string
  hasAccess?: boolean
}

type AppointmentItem = {
  id: string
  patient_id: string
  patient_name: string
  time: string
  reason: string
  status: string
}

type ActivityItem = {
  id: string
  text: string
  time: string
  type: string
}

type AlertItem = {
  id: string
  patient_id: string
  patient_name: string
  note: string
  time: string
}

export default function DoctorHome() {
  const navigate = useNavigate()
  const { name, user } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PatientProfile[]>([])
  const [searching, setSearching] = useState(false)
  
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [criticalAlerts, setCriticalAlerts] = useState<AlertItem[]>([])
  const [stats, setStats] = useState({ appointmentsCount: 0, patientsCount: 0, aiSummariesCount: 0 })
  const [loadingData, setLoadingData] = useState(true)

  // Fetch Dashboard Data (Appointments, Activity, Stats, Alerts)
  useEffect(() => {
    let active = true

    const fetchDashboard = async () => {
      setLoadingData(true)
      try {
        const doctorId = user?.id

        // 1. Fetch appointments for doctor
        let apptList: AppointmentItem[] = []
        if (doctorId) {
          const { data: apptsData } = await supabase
            .from('appointments')
            .select('id, patient_id, time, reason, status, profiles:patient_id (name)')
            .eq('doctor_id', doctorId)
            .order('time', { ascending: true })

          if (apptsData && apptsData.length > 0) {
            apptList = apptsData.map((a: any) => ({
              id: a.id,
              patient_id: a.patient_id,
              patient_name: a.profiles?.name || 'Patient',
              time: new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              reason: a.reason,
              status: a.status,
            }))
          }
        }

        // 2. Fetch recent activity (from records and emergency logs)
        let actList: ActivityItem[] = []
        const { data: recentRecords } = await supabase
          .from('records')
          .select('id, title, record_type, created_at, profiles:patient_id (name)')
          .order('created_at', { ascending: false })
          .limit(5)

        if (recentRecords && recentRecords.length > 0) {
          actList = recentRecords.map((r: any) => ({
            id: r.id,
            text: `${r.title} for ${r.profiles?.name || 'Patient'}`,
            time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: r.record_type,
          }))
        }

        // 3. Fetch emergency logs as critical alerts
        let alertList: AlertItem[] = []
        const { data: emLogs } = await supabase
          .from('emergency_access_log')
          .select('id, patient_id, access_reason, created_at, profiles:patient_id (name)')
          .order('created_at', { ascending: false })
          .limit(3)

        if (emLogs && emLogs.length > 0) {
          alertList = emLogs.map((l: any) => ({
            id: l.id,
            patient_id: l.patient_id,
            patient_name: l.profiles?.name || 'Emergency Patient',
            note: `Emergency Access: ${l.access_reason}`,
            time: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
        }

        // 4. Counts & Stats
        const { count: patientsCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'patient')

        const { count: aiCount } = await supabase
          .from('ai_summaries')
          .select('id', { count: 'exact', head: true })

        if (active) {
          setAppointments(apptList)
          setActivity(actList)
          setCriticalAlerts(alertList)
          setStats({
            appointmentsCount: apptList.length,
            patientsCount: patientsCount || 0,
            aiSummariesCount: aiCount || 0,
          })
        }
      } catch (err) {
        console.error('Error loading doctor home data:', err)
      } finally {
        if (active) setLoadingData(false)
      }
    }

    fetchDashboard()
    return () => { active = false }
  }, [user])

  // Live Patient Search with Access Control Enforcement
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }

    let active = true
    const searchPatients = async () => {
      setSearching(true)
      try {
        const query = searchQuery.trim().toLowerCase()

        // 1. Fetch matching patients from profiles table
        const { data: patients, error: pErr } = await supabase
          .from('profiles')
          .select('id, name, email, created_at')
          .eq('role', 'patient')
          .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(10)

        if (pErr) throw pErr

        // 2. Cross-reference with access_grants for active doctor user
        let doctorGrants = new Set<string>()
        if (user?.id) {
          const { data: grants } = await supabase
            .from('access_grants')
            .select('patient_id')
            .eq('doctor_id', user.id)

          if (grants) {
            grants.forEach((g: any) => doctorGrants.add(g.patient_id))
          }

          // Also add patients accessed via verified emergency log
          const { data: emergencyLogs } = await supabase
            .from('emergency_access_log')
            .select('patient_id')
            .eq('accessed_by', user.id)

          if (emergencyLogs) {
            emergencyLogs.forEach((el: any) => doctorGrants.add(el.patient_id))
          }
        }

        if (active && patients) {
          const mapped = patients.map((p: any) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            created_at: p.created_at,
            hasAccess: doctorGrants.has(p.id),
          }))
          setSearchResults(mapped)
        }
      } catch (err) {
        console.error('Error searching patients:', err)
      } finally {
        if (active) setSearching(false)
      }
    }

    const timer = setTimeout(searchPatients, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [searchQuery, user])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Good morning, {name ? `Dr. ${name}` : 'Doctor'}
        </h1>
        <p className="text-sm text-mist">
          {stats.appointmentsCount} appointments today · {criticalAlerts.length} critical alert needs review.
        </p>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.map((a) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate(`/emergency/${a.patient_id}`)}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-emergency/30 bg-emergency-soft px-4 py-3 hover:border-emergency/60 transition-colors"
        >
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
            <AlertTriangle size={18} className="text-emergency" />
          </motion.div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">{a.patient_name} — critical alert</p>
            <p className="text-xs text-mist">{a.note}</p>
          </div>
          <ChevronRight size={16} className="text-emergency" />
        </motion.div>
      ))}

      {/* Patient Search Bar */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-2xl border border-edge bg-cardsurface/90 px-4 py-3 shadow-card focus-within:border-ai/50 transition-all">
          <Search size={17} className="text-mist" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients by name, email, or ID…"
            className="w-full bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
          />
          {searching && <div className="h-4 w-4 animate-spin rounded-full border-2 border-ai border-t-transparent" />}
        </div>

        {/* Real-time Patient Search Dropdown Results */}
        <AnimatePresence>
          {searchQuery.trim() !== '' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute left-0 right-0 top-14 z-20 max-h-96 overflow-y-auto rounded-2xl border border-edge bg-cardsurface/95 p-3 shadow-card-lg backdrop-blur-md space-y-2"
            >
              {searchResults.length === 0 && !searching ? (
                <div className="p-6 text-center text-xs space-y-1">
                  <p className="font-semibold text-ink">No registered patient found matching "{searchQuery}"</p>
                  <p className="text-mist">Double check the patient's full name, email address, or Patient ID, or verify if the patient has registered an account.</p>
                </div>
              ) : (
                searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-edge/60 bg-panel2/80 p-3 hover:border-ai/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-ai/10 text-ai font-semibold text-xs">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink flex items-center gap-2">
                          {patient.name}
                          {patient.hasAccess ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-vital-soft px-2 py-0.5 text-[10px] font-semibold text-vital">
                              <ShieldCheck size={11} /> Granted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-edge/40 px-2 py-0.5 text-[10px] font-semibold text-mist">
                              <Lock size={11} /> Emergency / Unverified
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-mist">{patient.email} · ID: {patient.id.slice(0, 8)}...</p>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/doctor/patient-timeline?patientId=${patient.id}`)}
                        className="flex items-center gap-1 rounded-lg border border-edge bg-cardsurface px-2.5 py-1.5 text-xs text-ink hover:border-ai/40"
                        title="View Medical Timeline"
                      >
                        <Stethoscope size={13} className="text-ai" /> Timeline
                      </button>

                      <button
                        onClick={() => navigate(`/doctor/ai-summary?patientId=${patient.id}`)}
                        className="flex items-center gap-1 rounded-lg border border-edge bg-cardsurface px-2.5 py-1.5 text-xs text-ink hover:border-ai/40"
                        title="Generate AI Summary"
                      >
                        <Sparkles size={13} className="text-vital" /> AI Summary
                      </button>

                      <button
                        onClick={() => navigate(`/emergency/${patient.id}`)}
                        className="flex items-center gap-1 rounded-lg border border-emergency/30 bg-emergency-soft px-2.5 py-1.5 text-xs font-medium text-emergency hover:border-emergency/60"
                        title="Emergency Access Card"
                      >
                        <ExternalLink size={13} /> Emergency
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Key Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Today's appointments" value={stats.appointmentsCount} icon={Calendar} accent="ai" delay={0} />
        <StatCard label="Patients in database" value={stats.patientsCount} icon={Activity} accent="vital" delay={0.05} />
        <StatCard label="AI summaries generated" value={stats.aiSummariesCount} icon={Sparkles} accent="ai" delay={0.1} />
      </div>

      {/* Main Schedule & Activity Feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card delay={0.15} className="p-5" hover={false}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Today's schedule</p>
            <Calendar size={15} className="text-mist" />
          </div>
          <div className="space-y-3">
            {loadingData ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : appointments.length === 0 ? (
              <p className="py-6 text-center text-xs text-mist">No appointments scheduled for today.</p>
            ) : (
              appointments.map((a, i) => (
                <motion.button
                  key={a.id + i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  onClick={() => navigate(`/doctor/ai-summary?patientId=${a.patient_id}`)}
                  className="flex w-full items-center justify-between rounded-xl border border-edge bg-panel2 px-3 py-2.5 text-left hover:border-ai/30 transition-colors"
                >
                  <div>
                    <p className="text-sm text-ink font-medium">{a.patient_name}</p>
                    <p className="text-xs text-mist">{a.reason}</p>
                  </div>
                  <span className="text-xs font-medium text-ai rounded-full bg-ai/10 px-2.5 py-1">{a.time}</span>
                </motion.button>
              ))
            )}
          </div>
        </Card>

        {/* Live Activity Feed */}
        <Card delay={0.2} className="p-5" hover={false}>
          <div className="mb-4 flex items-center gap-2">
            <Activity size={15} className="text-vital" />
            <p className="text-sm font-medium text-ink">Live activity</p>
          </div>
          <div className="space-y-4 border-l border-edge pl-4">
            {loadingData ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : activity.length === 0 ? (
              <p className="py-6 text-center text-xs text-mist">No recent clinical activity logged.</p>
            ) : (
              activity.map((a, i) => (
                <motion.div
                  key={a.id + i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className="relative"
                >
                  <span className="absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-vital" />
                  <p className="text-sm text-ink">{a.text}</p>
                  <p className="text-xs text-mist">{a.time}</p>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
