import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

export default function HealthRing({
  score = 82,
  size = 160,
  stroke = 14,
  label = 'Health Score',
}: {
  score?: number
  size?: number
  stroke?: number
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div ref={ref} className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#174C80" strokeWidth={stroke} fill="none" />
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: inView ? offset : circumference }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 6 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="font-display text-3xl font-semibold text-ink"
        >
          {score}
        </motion.span>
        <span className="text-xs text-mist">{label}</span>
      </div>
    </div>
  )
}
