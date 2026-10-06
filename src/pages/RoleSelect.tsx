import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { HeartPulse, ArrowLeft, Loader2 } from 'lucide-react'
import { roleThemes } from '../lib/roleTheme'
import { useAuth } from '../lib/AuthContext'
import { Role } from '../lib/navConfig'
import { supabase } from '../lib/supabase'

export default function RoleSelect() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session, user, profile, role: activeRole, loading, confirmUserRole } = useAuth()
  const mode = params.get('mode') === 'signup' ? 'signup' : 'signin'
  const [selectingRole, setSelectingRole] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && session && activeRole && profile?.role_confirmed !== false) {
      navigate(`/${activeRole.toLowerCase()}`, { replace: true })
    }
  }, [loading, session, activeRole, profile, navigate])

  const handleSelectRole = async (selectedRole: Role) => {
    if (session && user) {
      setSelectingRole(selectedRole)
      try {
        await confirmUserRole(selectedRole)
      } catch (err) {
        console.error('Error confirming role:', err)
      } finally {
        setSelectingRole(null)
        navigate(`/${selectedRole}`, { replace: true })
      }
    } else {
      navigate(`/login/${selectedRole}?mode=${mode}`)
    }
  }

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
              Select Your Portal Role
            </p>
            <p className="text-sm text-mist">Choose the portal role to complete your account setup.</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
          {roleThemes.map((roleItem, i) => (
            <motion.button
              key={roleItem.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -5 }}
              disabled={selectingRole !== null}
              onClick={() => handleSelectRole(roleItem.key as Role)}
              className="group rounded-2xl border border-edge bg-cardsurface/90 p-6 text-left shadow-card transition-shadow hover:shadow-card-lg disabled:opacity-50 cursor-pointer"
            >
              <div
                className="grid h-12 w-12 place-items-center rounded-xl transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${roleItem.accent}18` }}
              >
                {selectingRole === roleItem.key ? (
                  <Loader2 size={22} className="animate-spin text-vital" />
                ) : (
                  <roleItem.icon size={22} style={{ color: roleItem.accent }} />
                )}
              </div>
              <p className="mt-4 font-display text-base font-semibold text-ink">{roleItem.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-mist">{roleItem.description}</p>
              <p className="mt-3 text-xs font-medium" style={{ color: roleItem.accent }}>
                Select {roleItem.label} →
              </p>
            </motion.button>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-mist">
          Already have an account?{' '}
          <button onClick={() => navigate(`/login?mode=signin`)} className="font-medium text-vital hover:underline cursor-pointer">
            Sign in instead
          </button>
        </p>
      </div>
    </div>
  )
}
