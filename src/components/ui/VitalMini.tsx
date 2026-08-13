import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import Card from './Card'

export default function VitalMini({
  label,
  value,
  icon: Icon,
  accent = 'vital',
  delay = 0,
}: {
  label: string
  value: string
  icon: LucideIcon
  accent?: 'vital' | 'ai' | 'emergency'
  delay?: number
}) {
  const accentText = accent === 'vital' ? 'text-vital' : accent === 'ai' ? 'text-ai' : 'text-emergency'
  const accentBg = accent === 'vital' ? 'bg-vital-soft' : accent === 'ai' ? 'bg-ai-soft' : 'bg-emergency-soft'

  return (
    <Card delay={delay} glow={accent} className="p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${accentBg}`}>
        <Icon size={15} className={accentText} />
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.15 }}
        className="mt-3 font-display text-lg font-semibold text-ink"
      >
        {value}
      </motion.p>
      <p className="text-xs text-mist">{label}</p>
    </Card>
  )
}
