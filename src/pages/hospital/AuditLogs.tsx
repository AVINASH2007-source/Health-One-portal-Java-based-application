import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, Search, RefreshCw, Filter, ShieldCheck, UserCheck, Clock, AlertCircle } from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

type AuditLogRow = {
  id: string
  actor_id: string | null
  patient_id: string | null
  action: string
  created_at: string
  actor?: { name: string; email?: string; role?: string } | null
  patient?: { name: string; email?: string } | null
}

export default function AuditLogs() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')

  const fetchAuditLogs = async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      // 1. Try foreign key joined query
      let { data, error: joinErr } = await supabase
        .from('audit_logs')
        .select(`
          id,
          actor_id,
          patient_id,
          action,
          created_at,
          actor:profiles!audit_logs_actor_id_fkey(name, email, role),
          patient:profiles!audit_logs_patient_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      // 2. Fallback to manual profile map lookup if FK constraint name differs
      if (joinErr) {
        console.warn('FK join failed, using profile lookup fallback:', joinErr.message)
        const { data: flatLogs, error: flatErr } = await supabase
          .from('audit_logs')
          .select('id, actor_id, patient_id, action, created_at')
          .order('created_at', { ascending: false })
          .limit(100)

        if (flatErr) {
          setError(`Failed to load audit logs: ${flatErr.message}`)
          setLoading(false)
          return
        }

        if (flatLogs) {
          const profileIds = Array.from(
            new Set(
              flatLogs
                .flatMap((l) => [l.actor_id, l.patient_id])
                .filter(Boolean) as string[]
            )
          )

          const profileMap: Record<string, { name: string; email: string; role: string }> = {}
          if (profileIds.length > 0) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, name, email, role')
              .in('id', profileIds)

            if (profs) {
              profs.forEach((p) => {
                profileMap[p.id] = { name: p.name, email: p.email, role: p.role }
              })
            }
          }

          data = flatLogs.map((l) => ({
            ...l,
            actor: l.actor_id ? profileMap[l.actor_id] : null,
            patient: l.patient_id ? profileMap[l.patient_id] : null,
          })) as any
        }
      }

      setLogs((data as any[]) || [])
    } catch (err: any) {
      console.error('Error fetching audit logs:', err)
      setError(err?.message || 'Failed to retrieve system audit logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [user])

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase().trim()
      const actorName = log.actor?.name?.toLowerCase() || ''
      const patientName = log.patient?.name?.toLowerCase() || ''
      const actionText = log.action.toLowerCase()

      const matchesSearch =
        !q || actorName.includes(q) || patientName.includes(q) || actionText.includes(q)

      const matchesFilter =
        selectedFilter === 'all' || actionText.includes(selectedFilter.toLowerCase())

      return matchesSearch && matchesFilter
    })
  }, [logs, searchQuery, selectedFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">System Audit Logs</h1>
          <p className="text-sm text-mist">Compliance audit trail of medical record accesses, emergency overrides, and patient updates.</p>
        </div>
        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-edge bg-panel px-3.5 py-2 text-xs font-medium text-ink hover:bg-panel2 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Logs
        </button>
      </div>

      {/* Audit Log Container */}
      <Card className="p-6" hover={false}>
        {/* Controls Header: Search & Filter */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-edge/60 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-vital/10 text-vital">
              <ScrollText size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Access & Audit Events</h2>
              <p className="text-xs text-mist">{filteredLogs.length} event{filteredLogs.length === 1 ? '' : 's'} recorded</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist pointer-events-none" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search actor, patient, action..."
                className="w-full rounded-xl border border-edge bg-panel2 pl-9 pr-4 py-2 text-xs text-ink placeholder:text-mist/60 focus:border-ai focus:outline-none focus:ring-1 focus:ring-ai"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-panel2 p-1 rounded-xl border border-edge text-xs">
              <Filter size={13} className="text-mist ml-1.5 mr-0.5" />
              {[
                { id: 'all', label: 'All' },
                { id: 'emergency', label: 'Emergency' },
                { id: 'view', label: 'Views' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                    selectedFilter === f.id
                      ? 'bg-ai text-white shadow-sm'
                      : 'text-mist hover:text-ink'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Audit Table */}
        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="my-6 rounded-xl border border-dashed border-edge bg-panel2/40 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ai/10 text-ai mb-3">
              <ShieldCheck size={24} />
            </div>
            <p className="text-sm font-medium text-ink">No activity logged yet</p>
            <p className="mt-1 text-xs text-mist">
              System access events, emergency overrides, and medical updates will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge text-xs font-medium text-mist">
                  <th className="pb-3 pl-2">Actor (Performed By)</th>
                  <th className="pb-3">Action Description</th>
                  <th className="pb-3">Target Patient</th>
                  <th className="pb-3 pr-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {filteredLogs.map((log, idx) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="group hover:bg-panel2/50 transition-colors"
                  >
                    {/* Actor */}
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ai/10 text-xs font-semibold text-ai">
                          <UserCheck size={14} />
                        </div>
                        <div>
                          <p className="font-medium text-ink text-xs">
                            {log.actor?.name || log.actor_id?.slice(0, 8) || 'System / Unregistered'}
                          </p>
                          {log.actor?.role && (
                            <span className="inline-block text-[10px] text-mist capitalize">
                              {log.actor.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-panel2 border border-edge px-2.5 py-1 text-xs font-medium text-ink">
                        {log.action.toLowerCase().includes('emergency') ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-ai" />
                        )}
                        {log.action}
                      </span>
                    </td>

                    {/* Target Patient */}
                    <td className="py-3 text-mist text-xs">
                      {log.patient?.name ? (
                        <span className="font-medium text-ink">{log.patient.name}</span>
                      ) : log.patient_id ? (
                        <span className="font-mono text-[11px] text-mist">ID: {log.patient_id.slice(0, 8)}...</span>
                      ) : (
                        <span className="text-mist/70">—</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 pr-2 text-right">
                      <div className="inline-flex items-center gap-1 text-xs text-mist">
                        <Clock size={12} className="text-mist/70" />
                        <span>
                          {new Date(log.created_at).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
