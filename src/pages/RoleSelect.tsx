import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { HeartPulse, ArrowLeft } from 'lucide-react'
import { roleThemes } from '../lib/roleTheme'
import { useAuth } from '../lib/AuthContext'

export default function RoleSelect() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session, role: activeRole, loading } = useAuth()
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin'

  useEffect(() => {
    if (!loading && session && activeRole) {
      navigate(`/${activeRole.toLowerCase()}`, { replace: true })
    }
  }, [loading, session, activeRole, navigate])

  return (
    <div className="relative min-h-screen px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-mist hover:text-ink">
          <ArrowLeft size={15} /> Back to home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex items-center gap-3"
        >
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-vital-soft">
            <HeartPulse size={22} className="text-vital" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-ink">
              {mode === 'signup' ? 'Create your Health-One account' : 'Sign in to Health-One'}
            </p>
            <p className="text-sm text-mist">Choose the portal that matches your role.</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {roleThemes.map((role, i) => (
            <motion.button
              key={role.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -5 }}
              onClick={() => navigate(`/login/${role.key}?mode=${mode}`)}
              className="group rounded-2xl border border-edge bg-cardsurface/90 p-6 text-left shadow-card transition-shadow hover:shadow-card-lg"
            >
              <div
                className="grid h-12 w-12 place-items-center rounded-xl transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${role.accent}18` }}
              >
                <role.icon size={22} style={{ color: role.accent }} />
              </div>
              <p className="mt-4 font-display text-base font-semibold text-ink">{role.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-mist">{role.description}</p>
              <p className="mt-3 text-xs font-medium" style={{ color: role.accent }}>
                {mode === 'signup' ? 'Create account →' : 'Continue →'}
              </p>
            </motion.button>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-mist">
          {mode === 'signup' ? (
            <>Already have an account?{' '}
              <button onClick={() => navigate(`/login?mode=signin`)} className="font-medium text-vital hover:underline">
                Sign in instead
              </button>
            </>
          ) : (
            <>New to Health-One?{' '}
              <button onClick={() => navigate(`/login?mode=signup`)} className="font-medium text-vital hover:underline">
                Create an account
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
