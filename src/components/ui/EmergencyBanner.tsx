import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

export default function EmergencyBanner({
  title = 'Emergency access mode active',
  message = 'This session is logged. Only life-critical fields are visible.',
}: {
  title?: string
  message?: string
}) {
  const [open, setOpen] = useState(true)
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-emergency/40 bg-emergency-soft px-4 py-3"
        >
          <motion.div
            className="absolute inset-0 -z-10 bg-emergency/10"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          />
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            <AlertTriangle size={18} className="mt-0.5 text-emergency" />
          </motion.div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="text-xs text-mist">{message}</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-mist hover:text-ink">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
