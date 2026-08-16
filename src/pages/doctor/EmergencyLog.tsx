import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { History, ShieldAlert, User, Calendar, Search, ShieldCheck } from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

type EmergencyLogEntry = {
  id: string
  patient_id: string
  patient_name: string
  patient_email: string
  responder_name?: string
  access_reason: string
  created_at: string
}

export default function DoctorEmergencyLog() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<EmergencyLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')

  useEffect(() => {
    let active = true

    const fetchEmergencyLogs = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('emergency_access_log')
          .select('id, patient_id, accessed_by, access_reason, created_at, profiles:patient_id (name, email), responder:accessed_by (name)')
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error

        if (active && data) {
          const mapped = data.map((l: any) => ({
            id: l.id,
            patient_id: l.patient_id,
            patient_name: l.profiles?.name || 'Patient',
            patient_email: l.profiles?.email || '',
            responder_name: l.responder?.name || 'Doctor',
            access_reason: l.access_reason,
            created_at: l.created_at,
          }))
          setLogs(mapped)
        }
      } catch (err) {
        console.error('Error loading emergency access log:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchEmergencyLogs()
    return () => { active = false }
  }, [user])

  const filteredLogs = logs.filter(l =>
    l.patient_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    l.access_reason.toLowerCase().includes(searchFilter.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Emergency Access Audit Log</h1>
        <p className="text-sm text-mist">Doctor-facing audit view of all emergency profile overrides & justifications.</p>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 rounded-2xl border border-edge bg-cardsurface/90 px-4 py-3 shadow-card">
        <Search size={17} className="text-mist" />
        <input
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Filter emergency logs by patient name or reason…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
        />
      </div>

      {/* Logs Table */}
      <Card className="p-6" hover={false}>
        <div className="mb-4 flex items-center justify-between border-b border-edge/60 pb-3">
          <div className="flex items-center gap-2">
            <History size={18} className="text-emergency" />
            <h2 className="font-display text-base font-semibold text-ink">Audit Log Trail ({filteredLogs.length} events)</h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emergency-soft px-3 py-1 text-xs font-semibold text-emergency">
            <ShieldAlert size={13} /> Immutable Audit Logs
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-mist">
            No emergency access log entries recorded.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-edge bg-panel2/70 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emergency-soft text-emergency mt-0.5">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink flex items-center gap-2">
                      Target: {log.patient_name}
                      <span className="text-xs text-mist font-normal">({log.patient_email})</span>
                    </p>
                    <p className="text-xs text-mist mt-0.5">
                      <span className="font-semibold text-ink">Reason:</span> "{log.access_reason}"
                    </p>
                    <p className="text-[11px] text-mist/80 mt-1">
                      Accessed by: <span className="text-ink font-medium">Dr. {log.responder_name}</span>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-xs font-mono text-mist bg-cardsurface px-2.5 py-1 rounded-full border border-edge">
                    {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
