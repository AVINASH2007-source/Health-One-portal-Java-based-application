import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export default function Card({
  children,
  className = '',
  hover = true,
  delay = 0,
  glow,
  onClick,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
  delay?: number
  glow?: 'vital' | 'ai' | 'emergency'
  onClick?: () => void
}) {
  const glowClass =
    glow === 'vital' ? 'hover:shadow-glow' :
    glow === 'ai' ? 'hover:shadow-glow-ai' :
    glow === 'emergency' ? 'hover:shadow-glow-em' : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover ? { y: -6 } : undefined}
      onClick={onClick}
      className={`rounded-[20px] border border-edge bg-cardsurface/90 backdrop-blur-xl shadow-card transition-shadow duration-300 hover:bg-cardhover/90 ${glowClass} ${className}`}
    >
      {children}
    </motion.div>
  )
}
