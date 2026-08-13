import { motion } from 'framer-motion'
import { Search, AlertTriangle, Calendar, Activity, Sparkles, ChevronRight } from 'lucide-react'
import Card from '../../components/ui/Card'
import StatCard from '../../components/ui/StatCard'
import { useNavigate } from 'react-router-dom'

const criticalAlerts = [
  { patient: 'R. Menon', note: 'Potassium levels critical — flagged 12 min ago' },
]

const appointments = [
  { patient: 'Avinash K.', time: '10:30 AM', reason: 'Follow-up · Diabetes management' },
  { patient: 'S. Priya', time: '11:15 AM', reason: 'New patient · Cardiology referral' },
  { patient: 'R. Menon', time: '1:00 PM', reason: 'Urgent · Lab result review' },
]

const activity = [
  { text: 'Lab result uploaded for Avinash K.', time: '4 min ago' },
  { text: 'AI summary generated for S. Priya', time: '22 min ago' },
  { text: 'Prescription renewed for R. Menon', time: '1 hr ago' },
]

export default function DoctorHome() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Good morning, Dr. Iyer</h1>
        <p className="text-sm text-mist">3 appointments today · 1 critical alert needs review.</p>
      </div>

      {criticalAlerts.map((a) => (
        <motion.div
          key={a.patient}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-2xl border border-emergency/30 bg-emergency-soft px-4 py-3"
        >
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
            <AlertTriangle size={18} className="text-emergency" />
          </motion.div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">{a.patient} — critical alert</p>
            <p className="text-xs text-mist">{a.note}</p>
          </div>
          <ChevronRight size={16} className="text-emergency" />
        </motion.div>
      ))}

      <div className="flex items-center gap-2 rounded-2xl border border-edge bg-cardsurface/90 px-4 py-3 shadow-card">
        <Search size={17} className="text-mist" />
        <input
          placeholder="Search patients by name, ID, or condition…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-mist focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Today's appointments" value={3} icon={Calendar} accent="ai" delay={0} />
        <StatCard label="Patients this week" value={26} icon={Activity} accent="vital" delay={0.05} />
        <StatCard label="AI summaries generated" value={19} icon={Sparkles} accent="ai" delay={0.1} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card delay={0.15} className="p-5" hover={false}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Today's schedule</p>
            <Calendar size={15} className="text-mist" />
          </div>
          <div className="space-y-3">
            {appointments.map((a, i) => (
              <motion.button
                key={a.patient + i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                onClick={() => navigate('/doctor/ai-summary')}
                className="flex w-full items-center justify-between rounded-xl border border-edge bg-panel2 px-3 py-2.5 text-left hover:border-ai/30"
              >
                <div>
                  <p className="text-sm text-ink">{a.patient}</p>
                  <p className="text-xs text-mist">{a.reason}</p>
                </div>
                <span className="text-xs font-medium text-ai">{a.time}</span>
              </motion.button>
            ))}
          </div>
        </Card>

        <Card delay={0.2} className="p-5" hover={false}>
          <div className="mb-4 flex items-center gap-2">
            <Activity size={15} className="text-vital" />
            <p className="text-sm font-medium text-ink">Live activity</p>
          </div>
          <div className="space-y-4 border-l border-edge pl-4">
            {activity.map((a, i) => (
              <motion.div
                key={a.text}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
                className="relative"
              >
                <span className="absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-vital" />
                <p className="text-sm text-ink">{a.text}</p>
                <p className="text-xs text-mist">{a.time}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
