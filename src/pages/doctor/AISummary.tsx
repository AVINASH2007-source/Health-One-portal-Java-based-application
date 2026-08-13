import { motion } from 'framer-motion'
import { Sparkles, AlertTriangle, ClipboardPlus, PenLine } from 'lucide-react'
import Card from '../../components/ui/Card'
import AIThinking from '../../components/ui/AIThinking'

const warnings = [
  'Possible interaction: Warfarin + newly prescribed Ibuprofen',
  'Duplicate test flagged: Lipid panel already run 3 days ago',
]

export default function AISummary() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">AI Medical Summary</h1>
        <p className="text-sm text-mist">Condensed patient history, generated for faster clinical decisions.</p>
      </div>

      <AIThinking label="Summarizing 128 records into key clinical points…" />

      <Card className="p-5" delay={0.1} glow="ai">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={15} className="text-ai" />
          <p className="text-sm font-medium text-ink">Summary</p>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-sm leading-relaxed text-mist"
        >
          Placeholder — this panel will stream a plain-language summary of the patient's
          chronic conditions, recent visits, active medications, and anything the doctor
          should know before this appointment.
        </motion.p>
        <p className="mt-3 text-[11px] text-mist/70">
          AI-generated — assistive only, not a substitute for clinical judgment.
        </p>
      </Card>

      <Card className="p-5" delay={0.2} glow="emergency">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle size={15} className="text-emergency" />
          <p className="text-sm font-medium text-ink">Drug interaction checker</p>
        </div>
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <motion.div
              key={w}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="rounded-lg border border-emergency/30 bg-emergency-soft px-3 py-2 text-xs text-ink"
            >
              {w}
            </motion.div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-mist/70">
          AI-generated from available records — always verify against a licensed drug
          reference before prescribing.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5" delay={0.25} hover={false}>
          <div className="mb-2 flex items-center gap-2">
            <PenLine size={15} className="text-ai" />
            <p className="text-sm font-medium text-ink">Clinical notes</p>
          </div>
          <p className="text-xs text-mist">Placeholder — free-text visit notes, saved to this patient's timeline.</p>
        </Card>
        <Card className="p-5" delay={0.3} hover={false}>
          <div className="mb-2 flex items-center gap-2">
            <ClipboardPlus size={15} className="text-vital" />
            <p className="text-sm font-medium text-ink">Prescription builder</p>
          </div>
          <p className="text-xs text-mist">Placeholder — build a prescription with built-in interaction checks.</p>
        </Card>
      </div>
    </div>
  )
}
