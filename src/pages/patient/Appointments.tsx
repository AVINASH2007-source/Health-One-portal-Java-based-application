import { useState, useEffect, FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  UserCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Stethoscope,
  Trash2,
  CalendarPlus,
  Filter,
} from 'lucide-react'
import Card from '../../components/ui/Card'
import StatCard from '../../components/ui/StatCard'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../lib/AuthContext'
import {
  getAvailableDoctors,
  getPatientAppointments,
  createAppointmentRequest,
  updateAppointmentStatusToCancelled,
  DoctorProfile,
  Appointment,
} from '../../lib/api/patientAppointments'

export default function PatientAppointments() {
  const { user } = useAuth()
  const patientId = user?.id || 'demo-patient'

  // Doctors List & Appointments State
  const [doctors, setDoctors] = useState<DoctorProfile[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  // Form State & Banners (formSuccess / formError pattern)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Form Fields
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [appointmentDate, setAppointmentDate] = useState<string>(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  )
  const [appointmentTime, setAppointmentTime] = useState<string>('10:30')
  const [reasonNotes, setReasonNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Filter Tab
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'scheduled' | 'cancelled'>('all')

  useEffect(() => {
    loadData()
  }, [patientId])

  const loadData = async () => {
    setLoading(true)
    setFormError(null)
    try {
      const [docList, apptList] = await Promise.all([
        getAvailableDoctors(),
        getPatientAppointments(patientId),
      ])
      setDoctors(docList)
      if (docList.length > 0) {
        setSelectedDoctorId(docList[0].id)
      }
      setAppointments(apptList)
    } catch (err) {
      console.error('Failed to load appointments data:', err)
      setFormError(err instanceof Error ? err.message : 'Unable to load doctors and appointments.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitRequest = async (e: FormEvent) => {
    e.preventDefault()
    setFormSuccess(null)
    setFormError(null)

    if (!selectedDoctorId) {
      setFormError('Please select a doctor for your appointment.')
      return
    }

    if (!reasonNotes.trim()) {
      setFormError('Please enter the reason or symptoms for your appointment request.')
      return
    }

    setSubmitting(true)

    try {
      const selectedDoc = doctors.find((d) => d.id === selectedDoctorId)
      const fullIsoTime = new Date(`${appointmentDate}T${appointmentTime}:00`).toISOString()

      const newAppt = await createAppointmentRequest(patientId, {
        doctor_id: selectedDoctorId,
        doctor_name: selectedDoc?.full_name || 'Doctor',
        specialization: selectedDoc?.specialty || 'General Specialist',
        time: fullIsoTime,
        reason: reasonNotes.trim(),
      })

      setAppointments([newAppt, ...appointments])
      setFormSuccess(`Appointment request sent to ${selectedDoc?.full_name || 'the doctor'}! Status is now pending confirmation.`)
      setReasonNotes('')

      // Auto hide banner after 5 seconds
      setTimeout(() => setFormSuccess(null), 5000)
    } catch (err) {
      console.error('Failed to submit appointment:', err)
      setFormError(err instanceof Error ? err.message : 'Failed to record appointment request.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelAppointment = async (apptId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment request?')) return
    setFormSuccess(null)
    setFormError(null)

    try {
      await updateAppointmentStatusToCancelled(patientId, apptId)
      setAppointments((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status: 'cancelled' } : a))
      )
      setFormSuccess('Appointment request status updated to cancelled.')
      setTimeout(() => setSuccessMsgNull(), 3000)
    } catch (err) {
      console.error('Failed to cancel appointment:', err)
      setFormError(err instanceof Error ? err.message : 'Failed to cancel appointment.')
    }
  }

  const setSuccessMsgNull = () => setFormSuccess(null)

  // Filtered Appointments List
  const filteredAppointments = appointments.filter((a) => {
    if (activeTab === 'pending') return a.status === 'pending'
    if (activeTab === 'scheduled') return a.status === 'scheduled' || a.status === 'confirmed'
    if (activeTab === 'cancelled') return a.status === 'cancelled' || a.status === 'rejected' || a.status === 'declined'
    return true
  })

  // Badges Specification:
  // pending = amber, scheduled = green, rejected = red, cancelled = gray, completed = blue
  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
          <Clock size={12} className="animate-spin-slow" /> Pending Review
        </span>
      )
    }
    if (s === 'scheduled' || s === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-vital/30 bg-vital-soft px-2.5 py-0.5 text-xs font-semibold text-vital">
          <CheckCircle2 size={12} /> Scheduled (Confirmed)
        </span>
      )
    }
    if (s === 'rejected' || s === 'declined') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emergency/30 bg-emergency-soft px-2.5 py-0.5 text-xs font-semibold text-emergency">
          <AlertCircle size={12} /> Rejected / Reschedule Required
        </span>
      )
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-edge bg-panel2 px-2.5 py-0.5 text-xs font-medium text-mist">
          Cancelled
        </span>
      )
    }
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-ai/30 bg-ai-soft px-2.5 py-0.5 text-xs font-semibold text-ai">
          <CheckCircle2 size={12} /> Completed Visit
        </span>
      )
    }
    return (
      <span className="rounded-full bg-panel2 px-2.5 py-0.5 text-xs text-mist capitalize">
        {status}
      </span>
    )
  }

  const formatDateTime = (timeStr: string): { date: string; time: string } => {
    try {
      const dt = new Date(timeStr)
      if (isNaN(dt.getTime())) return { date: timeStr, time: '' }
      return {
        date: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }
    } catch {
      return { date: timeStr, time: '' }
    }
  }

  const pendingCount = appointments.filter((a) => a.status === 'pending').length
  const scheduledCount = appointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed').length
  const cancelledCount = appointments.filter((a) => a.status === 'cancelled' || a.status === 'rejected' || a.status === 'declined').length

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"
      >
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
            <CalendarPlus className="text-vital" size={26} /> Appointments
          </h1>
          <p className="mt-1 text-xs text-mist">
            Book appointment requests with doctors. The doctor reviews your request and approves or reschedules your visit.
          </p>
        </div>
      </motion.div>

      {/* Action Messages (formSuccess / formError pattern matching NewEntry.tsx) */}
      {formSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-vital/30 bg-vital-soft p-3.5 text-xs font-medium text-ink"
        >
          <CheckCircle2 size={16} className="text-vital shrink-0" />
          <span>{formSuccess}</span>
        </motion.div>
      )}

      {formError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-emergency/30 bg-emergency-soft/30 p-4 text-xs text-emergency"
        >
          <AlertCircle size={16} className="shrink-0" />
          <span>{formError}</span>
        </motion.div>
      )}

      {/* Section 1: Appointment Request Form (Top of Page as specified) */}
      <Card className="p-5 border border-edge/80 shadow-lg space-y-4" hover={false}>
        <div className="flex items-center justify-between border-b border-edge/60 pb-3">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-vital" />
            <h2 className="text-sm font-semibold text-ink">Request New Appointment</h2>
          </div>
          <span className="text-[11px] text-mist font-medium">Status initialized as 'pending'</span>
        </div>

        <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* 1. Doctor Selection Dropdown (populated from profiles where role = 'doctor') */}
            <div>
              <label className="block font-medium text-ink mb-1">
                Select Doctor <span className="text-vital">*</span>
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                disabled={doctors.length === 0}
                className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none disabled:opacity-60"
              >
                {loading ? (
                  <option value="">Loading registered doctors...</option>
                ) : doctors.length === 0 ? (
                  <option value="">No registered doctors available — sign up as a doctor to test</option>
                ) : (
                  doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.full_name} — {doc.specialty || 'General Practitioner'}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Date/Time Picker */}
            <div>
              <label className="block font-medium text-ink mb-1">
                Requested Date <span className="text-vital">*</span>
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-ink mb-1">
                Requested Time <span className="text-vital">*</span>
              </label>
              <input
                type="time"
                required
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Reason / Notes Field */}
          <div>
            <label className="block font-medium text-ink mb-1">
              Reason for Visit / Clinical Notes <span className="text-vital">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="Describe your symptoms, main complaints, or checkup reason..."
              value={reasonNotes}
              onChange={(e) => setReasonNotes(e.target.value)}
              className="w-full rounded-xl border border-edge bg-panel2 p-2.5 text-xs text-ink focus:border-vital focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-xl bg-vital px-5 py-2.5 text-xs font-semibold text-void hover:brightness-110 disabled:opacity-50 shadow-glow transition-all"
            >
              {submitting ? 'Submitting Request...' : 'Submit Appointment Request'}
            </button>
          </div>
        </form>
      </Card>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Total Requests" value={appointments.length} icon={Calendar} accent="ai" delay={0} />
        <StatCard label="Pending Review" value={pendingCount} icon={Clock} accent="ai" delay={0.05} />
        <StatCard label="Scheduled Visits" value={scheduledCount} icon={CheckCircle2} accent="vital" delay={0.1} />
        <StatCard label="Cancelled / Rejected" value={cancelledCount} icon={UserCheck} accent="ai" delay={0.15} />
      </div>

      {/* Section 2: Appointment List (Below the form as specified) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-edge/60 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-mist" />
            <h2 className="text-sm font-semibold text-ink">My Appointment History</h2>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-panel p-1 border border-edge">
            <button
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                activeTab === 'all' ? 'bg-vital text-void shadow-sm' : 'text-mist hover:text-ink'
              }`}
            >
              All ({appointments.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                activeTab === 'pending' ? 'bg-vital text-void shadow-sm' : 'text-mist hover:text-ink'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                activeTab === 'scheduled' ? 'bg-vital text-void shadow-sm' : 'text-mist hover:text-ink'
              }`}
            >
              Scheduled ({scheduledCount})
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                activeTab === 'cancelled' ? 'bg-vital text-void shadow-sm' : 'text-mist hover:text-ink'
              }`}
            >
              Cancelled ({cancelledCount})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <Card className="p-8 text-center" hover={false}>
            <Calendar size={32} className="mx-auto mb-2 text-mist/60" />
            <h3 className="text-sm font-semibold text-ink">No appointment records found</h3>
            <p className="mt-1 text-xs text-mist">
              Fill out the form above to submit a new appointment request to a doctor.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredAppointments.map((appt, i) => {
              const dtFormatted = formatDateTime(appt.time)
              return (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="p-4 flex flex-col justify-between" delay={0}>
                    <div>
                      <div className="flex items-start justify-between gap-2 border-b border-edge/40 pb-2.5">
                        <div className="flex items-start gap-2.5">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-vital-soft border border-vital/30 text-vital font-semibold text-xs">
                            <Stethoscope size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-ink">{appt.doctor_name || 'Doctor'}</h3>
                            {appt.specialization && (
                              <p className="text-xs text-vital font-medium">{appt.specialization}</p>
                            )}
                          </div>
                        </div>

                        {/* Status Badges: pending = amber, scheduled = green, rejected = red, cancelled = gray, completed = blue */}
                        <div className="shrink-0">{renderStatusBadge(appt.status)}</div>
                      </div>

                      <div className="mt-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between rounded-xl bg-panel2 p-2 border border-edge/60 text-xs">
                          <div className="flex items-center gap-1.5 text-ink font-medium">
                            <Calendar size={13} className="text-vital" />
                            <span>{dtFormatted.date}</span>
                          </div>
                          {dtFormatted.time && (
                            <div className="flex items-center gap-1 text-vital font-semibold">
                              <Clock size={13} />
                              <span>{dtFormatted.time}</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="font-medium text-ink">Reason / Notes:</span>
                          <p className="text-mist text-xs mt-0.5 leading-relaxed italic bg-panel2/50 p-2 rounded-lg border border-edge/30">
                            "{appt.reason}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Cancel Button for pending status (Updates status to 'cancelled') */}
                    {appt.status.toLowerCase() === 'pending' && (
                      <div className="mt-3 flex items-center justify-end border-t border-edge/40 pt-2">
                        <button
                          onClick={() => handleCancelAppointment(appt.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-mist hover:text-emergency transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} /> Cancel Appointment Request
                        </button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
