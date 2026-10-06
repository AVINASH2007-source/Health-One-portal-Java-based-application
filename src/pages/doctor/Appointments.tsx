import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, CheckCircle2, XCircle, Stethoscope, RefreshCw, Check, X } from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'

type AppointmentStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rejected'

type AppointmentItem = {
  id: string
  patient_id: string
  patient_name: string
  patient_email: string
  time: string
  reason: string
  status: AppointmentStatus
  created_at: string
}

export default function DoctorAppointments() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<AppointmentStatus | 'all'>('pending')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Fetch doctor's appointments from Supabase
  const fetchAppointments = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let { data, error } = await supabase
        .from('appointments')
        .select('id, patient_id, time, reason, status, created_at, profiles:patient_id (name, email)')
        .eq('doctor_id', user.id)
        .order('time', { ascending: true })

      if (error) throw error

      if (!data || data.length === 0) {
        const { data: generalData } = await supabase
          .from('appointments')
          .select('id, patient_id, time, reason, status, created_at, profiles:patient_id (name, email)')
          .order('time', { ascending: true })
        if (generalData && generalData.length > 0) {
          data = generalData
        }
      }

      if (data) {
        const mapped: AppointmentItem[] = data.map((a: any) => ({
          id: a.id,
          patient_id: a.patient_id,
          patient_name: a.profiles?.name || 'Patient',
          patient_email: a.profiles?.email || '',
          time: a.time,
          reason: a.reason,
          status: a.status as AppointmentStatus,
          created_at: a.created_at,
        }))
        setAppointments(mapped)
      }
    } catch (err) {
      console.error('Error loading doctor appointments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [user?.id])

  // Handle Accept / Reject appointment request
  const handleUpdateStatus = async (appointmentId: string, newStatus: 'scheduled' | 'rejected') => {
    setActionLoadingId(appointmentId)
    setStatusMessage(null)

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)

      if (error) throw error

      const target = appointments.find(a => a.id === appointmentId)

      // Fire-and-forget audit_logs entry for Member 3
      if (user?.id && target) {
        const actionType = newStatus === 'scheduled' ? 'accepted_appointment' : 'rejected_appointment'
        void (async () => {
          try {
            const { error: auditErr } = await supabase
              .from('audit_logs')
              .insert({
                actor_id: user.id,
                patient_id: target.patient_id,
                action: actionType,
              })
            if (auditErr) {
              console.warn('Fire-and-forget audit_logs insert skipped:', auditErr.message)
            }
          } catch (err) {
            console.warn('Fire-and-forget audit_logs insert error:', err)
          }
        })()
      }

      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a)
      )

      setStatusMessage(
        newStatus === 'scheduled'
          ? `Appointment request for ${target?.patient_name || 'Patient'} accepted and scheduled!`
          : `Appointment request for ${target?.patient_name || 'Patient'} declined.`
      )
    } catch (err: any) {
      console.error('Error updating appointment status:', err)
      setStatusMessage(`Failed to update appointment: ${err.message}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Filter appointments by active tab
  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const scheduledCount = appointments.filter(a => a.status === 'scheduled').length
  const completedCount = appointments.filter(a => a.status === 'completed').length
  const cancelledCount = appointments.filter(a => a.status === 'cancelled' || a.status === 'rejected').length

  const filteredAppointments = appointments.filter(a => {
    if (activeTab === 'pending') return a.status === 'pending'
    if (activeTab === 'scheduled') return a.status === 'scheduled'
    if (activeTab === 'completed') return a.status === 'completed'
    if (activeTab === 'cancelled') return a.status === 'cancelled' || a.status === 'rejected'
    return true
  })

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    } catch {
      return { date: isoStr, time: '' }
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Appointment Management</h1>
          <p className="text-sm text-mist">Review patient consultation requests, manage schedule, and respond to appointments.</p>
        </div>

        <button
          onClick={fetchAppointments}
          className="flex items-center gap-1.5 rounded-xl border border-edge bg-cardsurface px-3 py-2 text-xs font-semibold text-ink hover:border-ai/40 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh List
        </button>
      </div>

      {/* Action Notification Banner */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-2xl border border-vital/30 bg-vital-soft p-4 text-xs font-semibold text-vital"
        >
          <CheckCircle2 size={16} />
          <span>{statusMessage}</span>
        </motion.div>
      )}

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap rounded-2xl border border-edge bg-cardsurface p-1.5 shadow-sm gap-1">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
            activeTab === 'pending' ? 'bg-ai text-white shadow-md' : 'text-mist hover:text-ink'
          }`}
        >
          <Clock size={14} /> Pending Requests
          {pendingCount > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('scheduled')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
            activeTab === 'scheduled' ? 'bg-vital text-white shadow-md' : 'text-mist hover:text-ink'
          }`}
        >
          <Calendar size={14} /> Scheduled
          {scheduledCount > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
              {scheduledCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
            activeTab === 'completed' ? 'bg-panel2 text-ink shadow-sm' : 'text-mist hover:text-ink'
          }`}
        >
          <CheckCircle2 size={14} /> Completed ({completedCount})
        </button>

        <button
          onClick={() => setActiveTab('cancelled')}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
            activeTab === 'cancelled' ? 'bg-emergency-soft text-emergency border border-emergency/30' : 'text-mist hover:text-ink'
          }`}
        >
          <XCircle size={14} /> Declined / Cancelled ({cancelledCount})
        </button>
      </div>

      {/* Appointments List */}
      <Card className="p-6" hover={false}>
        <div className="mb-4 flex items-center justify-between border-b border-edge/60 pb-3">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-ai" />
            <h2 className="font-display text-base font-semibold text-ink">
              {activeTab === 'pending' && `Pending Patient Requests (${filteredAppointments.length})`}
              {activeTab === 'scheduled' && `Scheduled Consultations (${filteredAppointments.length})`}
              {activeTab === 'completed' && `Completed Appointments (${filteredAppointments.length})`}
              {activeTab === 'cancelled' && `Declined / Cancelled Requests (${filteredAppointments.length})`}
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-12 text-center text-xs text-mist space-y-2">
            <Calendar size={32} className="mx-auto text-mist/60" />
            <p className="font-medium text-ink">No appointments in this category</p>
            <p className="text-mist">
              {activeTab === 'pending' && 'All patient consultation requests have been reviewed.'}
              {activeTab === 'scheduled' && 'No upcoming appointments scheduled.'}
              {activeTab === 'completed' && 'No completed appointments recorded.'}
              {activeTab === 'cancelled' && 'No declined or cancelled requests.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAppointments.map((appt, i) => {
              const dt = formatDateTime(appt.time)
              const isActioning = actionLoadingId === appt.id

              return (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-edge bg-panel2/70 p-4 hover:border-ai/30 transition-colors"
                >
                  {/* Patient Details & Reason */}
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ai/10 text-ai font-bold text-xs mt-0.5">
                      {appt.patient_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{appt.patient_name}</p>
                        <span className="text-xs text-mist font-normal">({appt.patient_email})</span>
                      </div>
                      <p className="text-xs text-mist mt-0.5">
                        <span className="font-medium text-ink">Reason:</span> "{appt.reason}"
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-mist/80 mt-1.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar size={12} className="text-vital" /> {dt.date} at {dt.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Action Buttons */}
                  <div className="shrink-0 flex items-center gap-2 sm:self-center">
                    {appt.status === 'pending' ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={isActioning}
                          onClick={() => handleUpdateStatus(appt.id, 'scheduled')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-xl bg-vital px-3.5 py-2 text-xs font-semibold text-white shadow-glow disabled:opacity-50 transition-all"
                        >
                          <Check size={14} /> {isActioning ? 'Updating…' : 'Accept'}
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          disabled={isActioning}
                          onClick={() => handleUpdateStatus(appt.id, 'rejected')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-xl border border-emergency/30 bg-emergency-soft px-3.5 py-2 text-xs font-semibold text-emergency hover:bg-emergency/20 disabled:opacity-50 transition-all"
                        >
                          <X size={14} /> {isActioning ? 'Updating…' : 'Reject'}
                        </motion.button>
                      </div>
                    ) : appt.status === 'scheduled' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-vital-soft px-3 py-1 text-xs font-semibold text-vital">
                        <CheckCircle2 size={13} /> Scheduled
                      </span>
                    ) : appt.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-panel2 px-3 py-1 text-xs font-medium text-mist border border-edge">
                        <CheckCircle2 size={13} /> Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emergency-soft px-3 py-1 text-xs font-semibold text-emergency">
                        <XCircle size={13} /> {appt.status === 'rejected' ? 'Declined' : 'Cancelled'}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
