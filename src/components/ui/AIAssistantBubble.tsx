import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function AIAssistantBubble({
  message = "You're due for a lipid panel refresh, and your blood pressure trend looks stable this week.",
}: {
  message?: string
}) {
  const [shown, setShown] = useState('')

  useEffect(() => {
    setShown('')
    let i = 0
    const id = setInterval(() => {
      i += 2
      setShown(message.slice(0, i))
      if (i >= message.length) clearInterval(id)
    }, 18)
    return () => clearInterval(id)
  }, [message])

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-ai/20 bg-ai-soft p-4">
      <motion.div
        animate={{ boxShadow: ['0 0 0 0 #3B82F633', '0 0 0 8px #3B82F600'] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ai text-white"
      >
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}>
          <Sparkles size={15} />
        </motion.div>
      </motion.div>
      <div className="flex-1">
        <p className="text-xs font-medium text-ai">Health-One AI Assistant</p>
        <p className="mt-1 min-h-[2.5rem] text-sm leading-relaxed text-ink">
          {shown}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-ai align-middle"
          />
        </p>
      </div>
    </div>
  )
}
