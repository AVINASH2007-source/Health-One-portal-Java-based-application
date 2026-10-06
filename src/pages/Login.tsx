import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Sparkles, ArrowRight, ArrowLeft, Activity, FileText, Pill, Loader2, KeyRound, CheckCircle2, Mail, Eye, EyeOff } from 'lucide-react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import VitalLine from '../components/ui/VitalLine'
import GoogleIcon from '../components/ui/GoogleIcon'
import { getRoleTheme } from '../lib/roleTheme'
import { useAuth } from '../lib/AuthContext'
import { Role } from '../lib/navConfig'
import { supabase } from '../lib/supabase'

const floatingStats = [
  { icon: Activity, label: 'Records synced', value: '128', pos: 'left-1/2 top-10' },
  { icon: Pill, label: 'Active meds tracked', value: '4', pos: 'right-2 top-40' },
  { icon: FileText, label: 'Hospitals connected', value: '6', pos: 'left-0 bottom-0' },
]

export default function Login() {
  const navigate = useNavigate()
  const { role: roleKey } = useParams()
  const [params, setParams] = useSearchParams()
  const {
    session,
    user,
    profile,
    role: activeRole,
    loading,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    resendVerificationEmail,
    resetPassword,
    updatePassword,
  } = useAuth()

  const role = getRoleTheme(roleKey)
  const modeParam = params.get('mode')
  const mode: 'signin' | 'signup' | 'forgot-password' | 'reset-password' =
    modeParam === 'signup'
      ? 'signup'
      : modeParam === 'forgot-password'
        ? 'forgot-password'
        : modeParam === 'reset-password'
          ? 'reset-password'
          : 'signin'

  // If user is already authenticated, check portal role matching
  useEffect(() => {
    if (!loading && session) {
      if (!activeRole || profile?.role_confirmed === false) {
        navigate('/select-role', { replace: true })
        return
      }

      const requestedPortal = roleKey?.toLowerCase() as Role | undefined
      const actualRole = activeRole.toLowerCase() as Role

      // Portal mismatch check (e.g. Patient logging into /login/doctor)
      if (requestedPortal && requestedPortal !== actualRole) {
        const actualCap = actualRole.charAt(0).toUpperCase() + actualRole.slice(1)
        setFormError(
          `This account is registered as a ${actualCap}. Redirecting you to your ${actualCap} portal...`
        )

        const timer = setTimeout(() => {
          navigate(`/${actualRole}`, { replace: true })
        }, 1800)
        return () => clearTimeout(timer)
      }

      navigate(`/${actualRole}`, { replace: true })
    }
  }, [loading, session, activeRole, profile, roleKey, navigate])

  const [signupRole, setSignupRole] = useState<Role>((roleKey as Role) || 'patient')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [medicalLicenseId, setMedicalLicenseId] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [hospitalAffiliation, setHospitalAffiliation] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [checkEmailNotice, setCheckEmailNotice] = useState(false)
  const [resending, setResending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const setMode = (m: 'signin' | 'signup' | 'forgot-password' | 'reset-password') => {
    setFormError(null)
    setFormSuccess(null)
    setCheckEmailNotice(false)
    setParams({ mode: m })
  }

  const handleGoogle = async () => {
    setFormError(null)
    setFormSuccess(null)
    setGoogleLoading(true)

    // Intended role captured from: 1) portal URL (/login/doctor), 2) selected signup role, or undefined
    const targetRole = (roleKey as Role) || (mode === 'signup' ? signupRole : undefined)

    const { error } = await signInWithGoogle(targetRole)
    if (error) {
      setFormError(error)
      setGoogleLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (!email) {
      setFormError('Please enter your email address to resend confirmation.')
      return
    }
    setResending(true)
    setFormError(null)
    const { error } = await resendVerificationEmail(email)
    setResending(false)
    if (error) {
      setFormError(error)
    } else {
      setFormSuccess('Confirmation email resent! Please check your inbox.')
    }
  }

  const handleSubmit = async () => {
    setFormError(null)
    setFormSuccess(null)

    // Mode: Forgot Password
    if (mode === 'forgot-password') {
      if (!email.trim()) {
        setFormError('Please enter your account email address.')
        return
      }
      setSubmitting(true)
      const { error } = await resetPassword(email)
      setSubmitting(false)
      if (error) {
        setFormError(error)
      } else {
        setFormSuccess('Password reset link sent to your email address.')
      }
      return
    }

    // Mode: Reset Password (Updating Password)
    if (mode === 'reset-password') {
      if (!newPassword || newPassword.length < 6) {
        setFormError('New password must be at least 6 characters.')
        return
      }
      setSubmitting(true)
      const { error } = await updatePassword(newPassword)
      setSubmitting(false)
      if (error) {
        setFormError(error)
      } else {
        setFormSuccess('Password updated successfully! Redirecting to dashboard...')
        setTimeout(() => {
          if (activeRole) navigate(`/${activeRole.toLowerCase()}`)
          else setMode('signin')
        }, 1500)
      }
      return
    }

    if (!email || !password) {
      setFormError('Enter your email and password.')
      return
    }

    // Mode: Signup
    if (mode === 'signup') {
      if (!fullName.trim()) {
        setFormError('Enter your full name.')
        return
      }
      if (signupRole === 'doctor' && (!medicalLicenseId.trim() || !specialty.trim())) {
        setFormError('Medical License ID and Specialty are required for Doctor registration.')
        return
      }
      if (password !== confirmPassword) {
        setFormError("Passwords don't match.")
        return
      }
      if (password.length < 6) {
        setFormError('Password must be at least 6 characters.')
        return
      }

      setSubmitting(true)
      const res = await signUpWithPassword(email, password, fullName.trim(), signupRole)

      if (res.error) {
        setSubmitting(false)
        setFormError(res.error)
        return
      }

      // If doctor registration, insert credentials into doctors table
      if (signupRole === 'doctor') {
        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user?.id) {
          await supabase.from('doctors').upsert({
            id: userData.user.id,
            medical_license_id: medicalLicenseId.trim(),
            specialty: specialty.trim(),
            hospital_affiliation: hospitalAffiliation.trim() || null,
          })
        }
      }

      setSubmitting(false)

      if (res.requiresVerification) {
        setCheckEmailNotice(true)
        return
      }

      // Auto-signed in
      navigate(`/${signupRole}`)
      return
    }

    // Mode: Signin
    setSubmitting(true)
    const portalRole = (roleKey as Role) || undefined
    const res = await signInWithPassword(email, password, portalRole)
    setSubmitting(false)

    if (res.error) {
      setFormError(res.error)
      if (res.error.toLowerCase().includes('email not confirmed')) {
        setCheckEmailNotice(true)
      }
      return
    }

    // Role-validated login success
    const targetRole = res.role
    if (targetRole) {
      navigate(`/${targetRole.toLowerCase()}`)
    } else {
      navigate('/select-role')
    }
  }

  return (
    <div className="relative flex min-h-screen items-stretch overflow-hidden">
      {[...Array(10)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{ left: `${(i * 71) % 100}%`, top: `${(i * 53) % 100}%`, backgroundColor: `${role.accent}44` }}
          animate={{ y: [0, -18, 0], opacity: [0.15, 0.6, 0.15] }}
          transition={{ repeat: Infinity, duration: 4 + (i % 4), delay: i * 0.3 }}
        />
      ))}

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-10 px-6 py-12 lg:flex-row lg:gap-16">
        {/* Left — role-themed narrative panel */}
        <motion.div
          key={role.key}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex-1 max-w-xl"
        >
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1)
              } else {
                navigate(`/select-role?mode=${mode}`)
              }
            }}
            className="mb-6 inline-flex items-center gap-2 text-sm text-mist hover:text-ink cursor-pointer transition-colors"
          >
            <ArrowLeft size={15} /> Choose a different portal
          </button>

          <div className="mb-6 flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="grid h-11 w-11 place-items-center rounded-2xl"
              style={{ backgroundColor: `${role.accent}18` }}
            >
              <role.icon size={22} style={{ color: role.accent }} />
            </motion.div>
            <div>
              <p className="font-display text-lg font-semibold text-ink">Health-One</p>
              <p className="text-xs text-mist">{role.label} portal</p>
            </div>
          </div>

          <h1 className="font-display text-4xl font-semibold leading-tight text-ink lg:text-5xl">
            {role.tagline}
          </h1>
          <p className="mt-4 max-w-md text-sm text-mist">{role.description}</p>

          <VitalLine color={role.accent} height={44} className="mt-8 max-w-sm opacity-80" />

          <div className="relative mt-10 hidden h-64 lg:block">
            {floatingStats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                className={`absolute ${s.pos} animate-floaty rounded-2xl border border-edge bg-cardsurface/80 p-4 shadow-card backdrop-blur`}
                style={{ animationDelay: `${i * 0.6}s` }}
              >
                <s.icon size={16} style={{ color: role.accent }} />
                <p className="mt-2 font-display text-xl font-semibold text-ink">{s.value}</p>
                <p className="text-xs text-mist">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right — auth form panel */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md shrink-0 rounded-3xl border border-edge bg-cardsurface/90 p-8 shadow-card-lg lg:p-10"
        >
          {/* Portal Switcher Tabs (Patient / Doctor) */}
          <div className="relative mb-5 flex rounded-2xl border border-edge bg-panel2 p-1 text-xs">
            {(['patient', 'doctor'] as Role[]).map((r) => {
              const isSelected = (roleKey?.toLowerCase() === r) || (!roleKey && r === 'patient')
              const theme = getRoleTheme(r)
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    navigate(`/login/${r}?mode=${mode}`)
                    setSignupRole(r)
                  }}
                  className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-2 font-semibold transition-colors cursor-pointer ${
                    isSelected ? 'text-ink' : 'text-mist hover:text-ink'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="portal-tab-pill"
                      className="absolute inset-0 -z-10 rounded-xl bg-cardsurface shadow-sm border border-edge/60"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <theme.icon size={15} style={{ color: theme.accent }} />
                  <span>{theme.label} Portal</span>
                </button>
              )
            })}
          </div>

          {/* Mode Switcher Pills */}
          {mode !== 'forgot-password' && mode !== 'reset-password' && (
            <div className="relative mb-6 flex rounded-xl border border-edge bg-panel2 p-1 text-sm">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`relative z-10 flex-1 rounded-lg py-2 font-medium transition-colors ${mode === m ? 'text-white' : 'text-mist hover:text-ink'
                    }`}
                >
                  {mode === m && (
                    <motion.div
                      layoutId="mode-pill"
                      className="absolute inset-0 -z-10 rounded-lg"
                      style={{ backgroundColor: role.accent }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          {/* Email Verification Required Banner */}
          {checkEmailNotice ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="py-6 text-center">
              <div
                className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl"
                style={{ backgroundColor: `${role.accent}18` }}
              >
                <Mail size={22} style={{ color: role.accent }} />
              </div>
              <p className="font-display text-lg font-semibold text-ink">Check your email</p>
              <p className="mt-2 text-sm text-mist">
                We sent a confirmation link to <span className="text-ink font-semibold">{email}</span>. Confirm it in your inbox, then sign in.
              </p>

              {formSuccess && (
                <p className="mt-3 rounded-lg bg-vital-soft px-3 py-2 text-xs text-vital font-medium">{formSuccess}</p>
              )}
              {formError && (
                <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">{formError}</p>
              )}

              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="rounded-xl border border-edge bg-panel2 py-2.5 text-xs font-semibold text-ink hover:bg-edge/40 disabled:opacity-50"
                >
                  {resending ? 'Resending email...' : 'Resend confirmation email'}
                </button>
                <button
                  onClick={() => setMode('signin')}
                  className="text-xs font-medium text-mist hover:text-ink mt-2"
                >
                  Back to sign in
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Header Title */}
              <p className="font-display text-xl font-semibold text-ink">
                {mode === 'signin'
                  ? `Welcome to Health-One`
                  : mode === 'signup'
                    ? `Create your account`
                    : mode === 'forgot-password'
                      ? `Reset your password`
                      : `Enter new password`}
              </p>
              <p className="mt-1 text-sm text-mist">
                {mode === 'signin'
                  ? `Sign in with your email or Google to access your dashboard.`
                  : mode === 'signup'
                    ? `Select your portal role and set up your account.`
                    : mode === 'forgot-password'
                      ? `We'll send a password recovery link to your email.`
                      : `Type a new password for your account.`}
              </p>

              {/* Google OAuth Option (Signin/Signup) */}
              {(mode === 'signin' || mode === 'signup') && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGoogle}
                    disabled={googleLoading || submitting}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-edge bg-cardsurface/90 py-3 text-sm font-medium text-ink shadow-sm hover:bg-panel2 disabled:opacity-60 cursor-pointer"
                  >
                    {googleLoading ? <Loader2 size={17} className="animate-spin" /> : <GoogleIcon size={17} />}
                    Continue with Google
                  </motion.button>

                  <div className="my-5 flex items-center gap-3">
                    <span className="h-px flex-1 bg-edge" />
                    <span className="text-xs text-mist">or continue with email</span>
                    <span className="h-px flex-1 bg-edge" />
                  </div>
                </>
              )}

              {/* Form Inputs */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3 overflow-hidden"
                >
                  {mode === 'signup' && (
                    <div className="space-y-3 mb-2">
                      <label className="text-xs font-semibold text-mist uppercase tracking-wider block">Choose Account Role</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['patient', 'doctor'] as Role[]).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setSignupRole(r)}
                            className={`rounded-xl border py-2 px-1 text-center text-xs font-semibold capitalize transition-all cursor-pointer ${
                              signupRole === r
                                ? 'border-vital bg-vital-soft text-vital shadow-sm'
                                : 'border-edge bg-panel2 text-mist hover:text-ink'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {mode === 'signup' && (
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-xl border border-edge bg-panel2 px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-vital/30"
                    />
                  )}

                  {mode !== 'reset-password' && (
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      type="email"
                      className="w-full rounded-xl border border-edge bg-panel2 px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-vital/30"
                    />
                  )}

                  {(mode === 'signin' || mode === 'signup') && (
                    <div className="relative">
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        type={showPassword ? 'text' : 'password'}
                        className="w-full rounded-xl border border-edge bg-panel2 px-4 py-3 pr-11 text-sm text-ink placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-vital/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-ink transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  )}

                  {mode === 'signup' && signupRole === 'doctor' && (
                    <>
                      <input
                        value={medicalLicenseId}
                        onChange={(e) => setMedicalLicenseId(e.target.value)}
                        placeholder="Medical License ID (e.g. MD-89241) *"
                        className="w-full rounded-xl border border-edge bg-panel2 px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-vital/30"
                      />
                      <input
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="Medical Specialty (e.g. Cardiology) *"
                        className="w-full rounded-xl border border-edge bg-panel2 px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-vital/30"
                      />
                      <input
                        value={hospitalAffiliation}
                        onChange={(e) => setHospitalAffiliation(e.target.value)}
                        placeholder="Hospital Affiliation (e.g. City General Hospital)"
                        className="w-full rounded-xl border border-edge bg-panel2 px-4 py-3 text-sm text-ink placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-vital/30"
                      />
                    </>
                  )}

                  {mode === 'signup' && (
                    <div className="relative">
                      <input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="w-full rounded-xl border border-edge bg-panel2 px-4 py-3 pr-11 text-sm text-ink placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-vital/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-ink transition-colors"
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  )}

                  {mode === 'reset-password' && (
                    <div className="relative">
                      <input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min 6 characters)"
                        type={showNewPassword ? 'text' : 'password'}
                        className="w-full rounded-xl border border-edge bg-panel2 px-4 py-3 pr-11 text-sm text-ink placeholder:text-mist focus:outline-none focus:ring-2 focus:ring-vital/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-ink transition-colors"
                        tabIndex={-1}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {mode === 'signin' && (
                <div className="mt-3.5 flex items-center justify-between gap-2 rounded-xl border border-edge/80 bg-panel2/60 p-2.5 text-xs">
                  <span className="text-mist font-medium">Quick Demo:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/login/patient?mode=signin')
                        setEmail('patient@healthone.org')
                        setPassword('password123')
                        setFormError(null)
                      }}
                      className="rounded-lg border border-vital/30 bg-vital-soft/60 px-2.5 py-1 font-semibold text-vital transition-colors hover:bg-vital-soft"
                    >
                      Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/login/doctor?mode=signin')
                        setEmail('doctor@healthone.org')
                        setPassword('password123')
                        setFormError(null)
                      }}
                      className="rounded-lg border border-doctor/30 bg-doctor-soft/60 px-2.5 py-1 font-semibold text-doctor transition-colors hover:bg-doctor-soft"
                    >
                      Doctor
                    </button>
                  </div>
                </div>
              )}

              {formError && (
                <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-xs text-red-600 font-medium leading-relaxed">
                  <p>{formError}</p>
                  {formError.includes('Doctor portal') && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/login/doctor?mode=signin')
                        setFormError(null)
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 font-semibold text-doctor underline hover:opacity-80"
                    >
                      Switch to Doctor Portal <ArrowRight size={13} />
                    </button>
                  )}
                  {formError.includes('Patient portal') && (
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/login/patient?mode=signin')
                        setFormError(null)
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 font-semibold text-vital underline hover:opacity-80"
                    >
                      Switch to Patient Portal <ArrowRight size={13} />
                    </button>
                  )}
                  {formError.toLowerCase().includes('invalid login credentials') && (
                    <div className="mt-2 text-ink">
                      <span>Don't have an account yet? </span>
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="font-bold underline ml-1 hover:text-vital"
                      >
                        Create account
                      </button>
                    </div>
                  )}
                </div>
              )}

              {formSuccess && (
                <p className="mt-3 rounded-lg bg-vital-soft px-3 py-2 text-xs text-vital font-medium leading-relaxed">
                  {formSuccess}
                </p>
              )}

              {mode === 'signin' && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setMode('forgot-password')}
                    className="text-xs text-mist hover:text-ink underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {mode === 'forgot-password' && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-xs text-mist hover:text-ink underline"
                  >
                    Back to sign in
                  </button>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={submitting || googleLoading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60 shadow-md transition-all"
                style={{ backgroundColor: role.accent, boxShadow: `0 10px 30px -10px ${role.accent}77` }}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    {mode === 'signin'
                      ? 'Continue'
                      : mode === 'signup'
                        ? 'Create account'
                        : mode === 'forgot-password'
                          ? 'Send Recovery Email'
                          : 'Update Password'}{' '}
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>

              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-mist">
                <span className="flex items-center gap-1"><ShieldCheck size={13} /> End-to-end encrypted</span>
                <span className="flex items-center gap-1"><Sparkles size={13} /> AI-assisted</span>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
