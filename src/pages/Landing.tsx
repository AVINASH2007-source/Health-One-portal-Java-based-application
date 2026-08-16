import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import {
  HeartPulse, ArrowRight, ShieldAlert, Sparkles, Share2, Activity,
  Building2, Stethoscope, FlaskConical, FileText, Pill, Cloud, QrCode,
} from 'lucide-react'
import VitalLine from '../components/ui/VitalLine'
import AnimatedCounter from '../components/ui/AnimatedCounter'
import { roleThemes } from '../lib/roleTheme'

const features = [
  {
    icon: Activity,
    title: 'One lifetime timeline',
    body: "Every visit, prescription, and report from every hospital you've ever been to, in a single continuous history.",
    accent: '#22D3EE',
  },
  {
    icon: ShieldAlert,
    title: 'Emergency access',
    body: 'Unconscious and unidentified? Verified responders can pull blood type, allergies, and chronic conditions in seconds.',
    accent: '#EF4444',
  },
  {
    icon: Sparkles,
    title: 'AI-assisted care',
    body: 'AI summaries condense hundreds of pages into what a doctor actually needs to know before your appointment.',
    accent: '#2563EB',
  },
  {
    icon: Share2,
    title: 'You control access',
    body: "Nothing is shared without your consent — and every access is logged, so you always know who looked.",
    accent: '#3B82F6',
  },
]

const steps = [
  { title: 'Every visit, captured automatically', body: 'Hospitals and labs push records straight into your timeline the moment care happens.' },
  { title: "AI reads it so doctors don't have to", body: 'A concise, plain-language summary is ready before every appointment.' },
  { title: 'One tap, verified access', body: 'You approve who sees what — or emergency responders unlock life-critical fields only.' },
]

const floatIcons = [
  { icon: Building2, pos: 'left-20 top-16', accent: '#3B82F6' },
  { icon: Stethoscope, pos: 'right-20 top-16', accent: '#2563EB' },
  { icon: FlaskConical, pos: 'left-0 bottom-0', accent: '#22D3EE' },
  { icon: Pill, pos: 'right-0 bottom-0', accent: '#60A5FA' },
  { icon: FileText, pos: 'left-1/2 -top-4', accent: '#60A5FA' },
]

export default function Landing() {
  const navigate = useNavigate()
  const heroRef = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-40, 40], [6, -6]), { stiffness: 120, damping: 20 })
  const ry = useSpring(useTransform(mx, [-40, 40], [-6, 6]), { stiffness: 120, damping: 20 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = heroRef.current?.getBoundingClientRect()
    if (!rect) return
    mx.set(e.clientX - rect.left - rect.width / 2)
    my.set(e.clientY - rect.top - rect.height / 2)
  }

  return (
    <div className="relative overflow-hidden">
      <header className="glass relative z-20 mx-auto flex max-w-6xl items-center justify-between rounded-b-2xl border-b border-edge px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-vital-soft">
            <HeartPulse size={18} className="text-vital" />
          </div>
          <span className="font-display text-base font-semibold text-white">Health-One</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login?mode=signin')} className="text-sm text-navtext hover:text-white">
            Sign in
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login?mode=signup')}
            className="rounded-xl bg-[linear-gradient(90deg,#22D3EE,#3B82F6)] px-4 py-2 text-sm font-semibold text-white shadow-glow transition-transform"
          >
            Get started
          </motion.button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-16 pt-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-edge px-4 py-1.5 text-xs text-navtext"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-vital" />
          One record, from birth to old age
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-4xl font-semibold leading-[1.1] text-white sm:text-6xl"
        >
          Your health history<br />
          <span className="bg-gradient-to-r from-vital via-sky to-ai bg-clip-text text-transparent brightness-125">
            should never get lost.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-5 max-w-xl text-sm text-body sm:text-base"
        >
          Health-One unifies every hospital visit, prescription, and lab report into a single
          lifetime record — owned by you, shareable in seconds, and instantly readable in an
          emergency.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login?mode=signup')}
            className="flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#22D3EE,#3B82F6)] px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform"
          >
            Create your record <ArrowRight size={16} />
          </motion.button>
          <button
            onClick={() => navigate('/login?mode=signin')}
            className="glass rounded-xl border border-[rgba(255,255,255,0.15)] px-6 py-3 text-sm font-medium text-white hover:bg-[rgba(255,255,255,0.08)]"
          >
            Sign in
          </button>
        </motion.div>

        <motion.div
          ref={heroRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { mx.set(0); my.set(0) }}
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ rotateX: rx, rotateY: ry, perspective: 1000 }}
          className="glass-card relative mx-auto mt-16 max-w-2xl p-6 text-left"
        >
          {floatIcons.map((f, i) => (
            <motion.div
              key={i}
              className={`glass absolute ${f.pos} hidden h-10 w-10 place-items-center rounded-xl border border-edge sm:grid`}
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3 + i * 0.4, delay: i * 0.3 }}
              style={{ transform: 'translateZ(40px)' }}
            >
              <f.icon size={16} style={{ color: f.accent }} />
            </motion.div>
          ))}

          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-mist">
              <Cloud size={14} />
              <span className="text-xs">Secure sync in progress</span>
            </div>
            <QrCode size={16} className="text-mist" />
          </div>
          <VitalLine height={40} className="mb-4 opacity-80" />
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Records synced', value: 128 },
              { label: 'Hospitals linked', value: 6 },
              { label: 'Emergency logs', value: 3 },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-edge bg-panel2 p-3">
                <p className="font-display text-lg font-semibold text-ink">
                  <AnimatedCounter value={s.value} />
                </p>
                <p className="text-[11px] text-mist">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16">
        <div className="glass-card grid grid-cols-2 gap-6 p-6 sm:grid-cols-4">
          {[
            { label: 'Patients onboarded', value: 24000, suffix: '+' },
            { label: 'Hospitals connected', value: 180, suffix: '+' },
            { label: 'Records unified', value: 3200000, suffix: '+' },
            { label: 'Avg. summary time', value: 8, suffix: 's' },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <p className="font-display text-2xl font-semibold text-ink sm:text-3xl">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-xs text-mist">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className="glass-card p-6 transition-shadow hover:shadow-card-lg"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ backgroundColor: `${f.accent}18` }}>
                <f.icon size={20} style={{ color: f.accent }} />
              </div>
              <p className="mt-4 font-display text-base font-semibold text-white">{f.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-body">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-20">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center font-display text-2xl font-semibold text-white sm:text-3xl"
        >
          How Health-One works
        </motion.h2>
        <div className="relative pl-8">
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top' }}
            className="absolute left-[11px] top-1 bottom-1 w-px bg-gradient-to-b from-vital via-sky to-ai"
          />
          <div className="space-y-10">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative"
              >
                <span className="absolute -left-8 top-0 grid h-6 w-6 place-items-center rounded-full bg-vital text-[11px] font-semibold text-white">
                  {i + 1}
                </span>
                <p className="font-display text-base font-semibold text-white">{s.title}</p>
                <p className="mt-1 text-sm text-body">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center"
        >
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">Built for every side of care</h2>
          <p className="mt-2 text-sm text-body">Patients, doctors, and hospitals each get a dedicated, role-aware portal.</p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {roleThemes.map((r, i) => (
            <motion.button
              key={r.key}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              onClick={() => navigate(`/login/${r.key}?mode=signin`)}
              className="glass-card p-6 text-left transition-shadow hover:shadow-card-lg"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl" style={{ backgroundColor: `${r.accent}18` }}>
                <r.icon size={20} style={{ color: r.accent }} />
              </div>
              <p className="mt-4 font-display text-base font-semibold text-white">{r.label}</p>
              <p className="mt-1 text-xs text-body">{r.tagline}</p>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-6 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-3xl bg-gradient-to-br from-vital/10 via-transparent to-ai/10 p-10"
        >
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">Start your lifetime record today</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-body">
            Free to create. Encrypted end to end. Yours for life.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login?mode=signup')}
            className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-[linear-gradient(90deg,#22D3EE,#3B82F6)] px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform"
          >
            Get started free <ArrowRight size={16} />
          </motion.button>
        </motion.div>
      </section>

      <footer className="relative z-10 border-t border-edge px-6 py-8 text-center text-xs text-mist">
        Health-One — AI-Powered Lifetime Digital Health Record & Emergency Access System.
      </footer>
    </div>
  )
}
