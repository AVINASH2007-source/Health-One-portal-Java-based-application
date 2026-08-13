import { motion } from 'framer-motion'
import { Users, BedDouble, Siren, Stethoscope, Building2, Activity } from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts'
import Card from '../../components/ui/Card'
import StatCard from '../../components/ui/StatCard'

const departments = [
  { name: 'Cardiology', doctors: 12, load: 78 },
  { name: 'Endocrinology', doctors: 7, load: 54 },
  { name: 'Emergency', doctors: 15, load: 91 },
  { name: 'Radiology', doctors: 6, load: 40 },
]

const admissionsData = [
  { day: 'Mon', admissions: 22 }, { day: 'Tue', admissions: 27 }, { day: 'Wed', admissions: 19 },
  { day: 'Thu', admissions: 31 }, { day: 'Fri', admissions: 26 }, { day: 'Sat', admissions: 18 }, { day: 'Sun', admissions: 14 },
]

const activity = [
  { text: 'Dr. Iyer verified and onboarded — Cardiology', time: '18 min ago' },
  { text: 'Emergency access used for patient #4821', time: '52 min ago' },
  { text: 'Radiology department synced 142 new reports', time: '2 hr ago' },
]

export default function HospitalHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Apollo Hospital, Chennai</h1>
        <p className="text-sm text-mist">Live overview across all departments.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Active admissions" value={214} icon={BedDouble} accent="ai" delay={0} />
        <StatCard label="Bed occupancy" value={82} suffix="%" icon={Building2} accent="vital" delay={0.05} />
        <StatCard label="Emergency cases today" value={9} icon={Siren} accent="emergency" delay={0.1} />
        <StatCard label="Verified doctors" value={64} icon={Stethoscope} accent="ai" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card delay={0.2} className="p-5 lg:col-span-2" hover={false}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Admissions — last 7 days</p>
            <span className="text-xs text-mist">All departments</span>
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
            <p className="text-sm font-medium text-ink">Staff overview</p>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Doctors', value: '64' },
              { label: 'Nurses', value: '212' },
              { label: 'On leave today', value: '8' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between rounded-xl border border-edge bg-panel2 px-3 py-2.5">
                <span className="text-mist">{s.label}</span>
                <span className="font-medium text-ink">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card delay={0.3} className="p-5" hover={false}>
        <p className="mb-4 text-sm font-medium text-ink">Departments</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {departments.map((d, i) => (
            <motion.div
              key={d.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.06 }}
              className="rounded-xl border border-edge bg-panel2 p-4"
            >
              <p className="text-sm font-medium text-ink">{d.name}</p>
              <p className="mt-0.5 text-xs text-mist">{d.doctors} doctors</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-edge">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${d.load}%` }}
                  transition={{ delay: 0.5 + i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-vital to-ai"
                />
              </div>
              <p className="mt-1 text-[11px] text-mist">{d.load}% capacity</p>
            </motion.div>
          ))}
        </div>
      </Card>

      <Card delay={0.4} className="p-5" hover={false}>
        <div className="mb-4 flex items-center gap-2">
          <Activity size={15} className="text-ai" />
          <p className="text-sm font-medium text-ink">Activity feed</p>
        </div>
        <div className="space-y-4 border-l border-edge pl-4">
          {activity.map((a, i) => (
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
