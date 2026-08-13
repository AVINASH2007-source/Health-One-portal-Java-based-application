import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function AIThinking({ label = 'Health-One is analyzing…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ai/30 bg-ai-soft px-4 py-3">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
      >
        <Sparkles size={16} className="text-ai" />
      </motion.div>
      <span className="text-sm text-mist">{label}</span>
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-ai"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18 }}
          />
        ))}
      </span>
    </div>
  )
}
