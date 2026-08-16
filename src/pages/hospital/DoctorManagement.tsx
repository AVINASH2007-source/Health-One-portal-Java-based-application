import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Stethoscope, UserPlus, Mail, Calendar, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

type DoctorProfile = {
  id: string
  name: string
  email: string
  created_at: string
  hospital_id?: string | null
}

export default function DoctorManagement() {
  const { user } = useAuth()
  const [doctors, setDoctors] = useState<DoctorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchDoctors = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, created_at, hospital_id')
        .eq('role', 'doctor')
        .eq('hospital_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching doctors:', error.message)
      } else {
        setDoctors(data || [])
      }
    } catch (err) {
      console.error('Failed to load doctors:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctors()
  }, [user])

  const handleLinkDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    const cleanEmail = emailInput.trim().toLowerCase()
    if (!cleanEmail) return

    if (!user) {
      setMessage({ type: 'error', text: 'You must be signed in as a hospital to link a doctor.' })
      return
    }

    setSubmitting(true)
    try {
      // 1. Look up the doctor profile by email
      const { data: doc, error: lookupError } = await supabase
        .from('profiles')
        .select('id, name, email, hospital_id, role')
        .eq('email', cleanEmail)
        .eq('role', 'doctor')
        .maybeSingle()

      if (lookupError || !doc) {
        setMessage({ type: 'error', text: 'No doctor account found with that email.' })
        setSubmitting(false)
        return
      }

      // 2. Check if doctor is already linked
      if (doc.hospital_id) {
        if (doc.hospital_id === user.id) {
          setMessage({ type: 'error', text: 'This doctor is already linked to your hospital.' })
        } else {
          setMessage({ type: 'error', text: 'This doctor is already linked to another hospital.' })
        }
        setSubmitting(false)
        return
      }

      // 3. Update hospital_id to link doctor to this hospital
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ hospital_id: user.id })
        .eq('id', doc.id)

      if (updateError) {
        setMessage({ type: 'error', text: `Failed to link doctor: ${updateError.message}` })
        setSubmitting(false)
        return
      }

      setMessage({
        type: 'success',
        text: `Dr. ${doc.name} (${doc.email}) has been successfully linked to your hospital.`,
      })
      setEmailInput('')
      await fetchDoctors()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'An error occurred while linking the doctor.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Doctor Management</h1>
          <p className="text-sm text-mist">Onboard, verify, and manage doctors assigned to your hospital.</p>
        </div>
        <button
          onClick={fetchDoctors}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-edge bg-panel px-3.5 py-2 text-xs font-medium text-ink hover:bg-panel2 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh List
        </button>
      </div>

      {/* Linked Doctors Section */}
      <Card className="p-6" hover={false}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ai/10 text-ai">
              <Stethoscope size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Linked Medical Staff</h2>
              <p className="text-xs text-mist">{doctors.length} doctor{doctors.length === 1 ? '' : 's'} linked to your institution</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="my-4 rounded-xl border border-dashed border-edge bg-panel2/50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ai/10 text-ai mb-3">
              <Stethoscope size={24} />
            </div>
            <p className="text-sm font-medium text-ink">No doctors linked yet</p>
            <p className="mt-1 text-xs text-mist">Use the form below to link an existing doctor account by their registered email address.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge text-xs font-medium text-mist">
                  <th className="pb-3 pl-2">Doctor Name</th>
                  <th className="pb-3">Email Address</th>
                  <th className="pb-3">Date Joined</th>
                  <th className="pb-3 pr-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {doctors.map((doc, idx) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group hover:bg-panel2/50 transition-colors"
                  >
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ai/10 text-xs font-semibold text-ai">
                          {doc.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-ink">Dr. {doc.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-mist">
                      <div className="flex items-center gap-1.5">
                        <Mail size={13} className="text-mist/70" />
                        <span>{doc.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-mist">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-mist/70" />
                        <span>{new Date(doc.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                        <CheckCircle2 size={12} />
                        Linked
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Link a Doctor Form */}
      <Card className="p-6" hover={false}>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-vital/10 text-vital">
            <UserPlus size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Link a Doctor by Email</h2>
            <p className="text-xs text-mist">Enter the email address of a registered doctor to assign them to your hospital.</p>
          </div>
        </div>

        <form onSubmit={handleLinkDoctor} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">Doctor's Account Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mist pointer-events-none" size={16} />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="doctor@example.com"
                className="w-full rounded-xl border border-edge bg-panel2 pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-mist/60 focus:border-ai focus:outline-none focus:ring-1 focus:ring-ai"
              />
            </div>
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2.5 rounded-xl p-3 text-xs font-medium ${
                message.type === 'success'
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
                  : 'border border-red-500/20 bg-red-500/10 text-red-600'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={submitting || !emailInput.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-ai px-4 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-ai/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Linking Doctor...
              </>
            ) : (
              <>
                <UserPlus size={14} />
                Link Doctor to Hospital
              </>
            )}
          </button>
        </form>
      </Card>
    </div>
  )
}
