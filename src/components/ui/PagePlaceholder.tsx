import { motion } from 'framer-motion'
import { LucideIcon, Construction } from 'lucide-react'
import Card from './Card'

export default function PagePlaceholder({
  title,
  description,
  owner,
  icon: Icon = Construction,
  checklist = [],
}: {
  title: string
  description: string
  owner?: string
  icon?: LucideIcon
  checklist?: string[]
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="mb-2 flex items-center gap-2 text-mist">
          <Icon size={16} />
          <span className="text-xs uppercase tracking-wide">Module skeleton</span>
        </div>
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-mist">{description}</p>
      </motion.div>

      <Card delay={0.1} className="p-6" hover={false}>
        <div className="flex items-center justify-between border-b border-edge pb-4">
          <p className="text-sm text-mist">Assigned to</p>
          <span className="rounded-full bg-vital-soft px-3 py-1 text-xs font-medium text-vital">
            {owner ?? 'Unassigned'}
          </span>
        </div>
        {checklist.length > 0 && (
          <ul className="mt-4 space-y-2">
            {checklist.map((item, i) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="flex items-center gap-2 text-sm text-mist"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-edge" />
                {item}
              </motion.li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
