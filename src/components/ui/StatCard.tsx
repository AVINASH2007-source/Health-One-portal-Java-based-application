import { LucideIcon } from 'lucide-react'
import Card from './Card'
import AnimatedCounter from './AnimatedCounter'

export default function StatCard({
  label,
  value,
  suffix = '',
  icon: Icon,
  accent = 'vital',
  delay = 0,
  trend,
}: {
  label: string
  value: number
  suffix?: string
  icon: LucideIcon
  accent?: 'vital' | 'ai' | 'emergency'
  delay?: number
  trend?: string
}) {
  const accentText =
    accent === 'vital' ? 'text-vital' : accent === 'ai' ? 'text-ai' : 'text-emergency'
  const accentBg =
    accent === 'vital' ? 'bg-vital-soft' : accent === 'ai' ? 'bg-ai-soft' : 'bg-emergency-soft'

  return (
    <Card delay={delay} glow={accent} className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-mist">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">
            <AnimatedCounter value={value} suffix={suffix} />
          </p>
          {trend && <p className={`mt-1 text-xs ${accentText}`}>{trend}</p>}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${accentBg}`}>
          <Icon size={18} className={accentText} />
        </div>
      </div>
    </Card>
  )
}
