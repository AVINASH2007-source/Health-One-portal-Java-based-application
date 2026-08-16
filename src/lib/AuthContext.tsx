import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Role } from './navConfig'

const PENDING_ROLE_KEY = 'health-one-pending-role'

type Profile = {
  role: Role
  name: string
  email: string
}

type AuthState = {
  session: Session | null
  user: User | null
  profile: Profile | null
  role: Role | null
  name: string
  loading: boolean
  error: string | null
  signInWithPassword: (email: string, password: string, portalRole: Role) => Promise<{ error: string | null; role?: Role }>
  signUpWithPassword: (email: string, password: string, name: string, role: Role) => Promise<{ error: string | null; requiresVerification?: boolean }>
  signInWithGoogle: (role: Role) => Promise<{ error: string | null }>
  resendVerificationEmail: (email: string) => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProfile = async (userId: string, authUser?: User | null): Promise<Profile | null> => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('role, name, email')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('Failed to load profile:', profileError.message)
      }

      if (data) return data as Profile

      // Self-healing fallback if profile row in public.profiles is missing
      if (authUser) {
        const metaRole = (authUser.user_metadata?.role as Role) || 'hospital'
        const metaName = authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User'
        const cleanEmail = authUser.email || ''

        await supabase.from('profiles').insert({
          id: userId,
          role: metaRole,
          name: metaName,
          email: cleanEmail,
        })

        // Always return valid profile for active user session so page refreshes never fail
        return { role: metaRole, name: metaName, email: cleanEmail }
      }

      return null
    } catch (err) {
      console.error('Error loading profile:', err)
      return null
    }
  }

  useEffect(() => {
    let active = true

    const initializeAuth = async () => {
      try {
        const { data: { session: initSession } } = await supabase.auth.getSession()
        if (!active) return
        setSession(initSession)
        setUser(initSession?.user ?? null)
        if (initSession?.user) {
          const loadedProfile = await loadProfile(initSession.user.id, initSession.user)
          if (active) setProfile(loadedProfile)
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    initializeAuth()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!active) return

      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (event === 'SIGNED_IN' && newSession?.user) {
        let loadedProfile = await loadProfile(newSession.user.id, newSession.user)

        // Brand NEW user via Google OAuth (no profile row in DB yet)
        if (!loadedProfile) {
          const pendingRole = sessionStorage.getItem(PENDING_ROLE_KEY) as Role | null
          const userMetaRole = newSession.user.user_metadata?.role as Role | undefined
          const userMetaName =
            newSession.user.user_metadata?.name ||
            newSession.user.user_metadata?.full_name ||
            newSession.user.email?.split('@')[0] ||
            'User'
          const assignRole = (userMetaRole || pendingRole || 'patient').toLowerCase() as Role

          const { error: insErr } = await supabase.from('profiles').insert({
            id: newSession.user.id,
            role: assignRole,
            name: userMetaName,
            email: newSession.user.email || '',
          })

          if (!insErr) {
            loadedProfile = { role: assignRole, name: userMetaName, email: newSession.user.email || '' }
          }
        }

        // Clean up pending role stash without modifying existing DB profile role
        sessionStorage.removeItem(PENDING_ROLE_KEY)

        if (active) {
          setProfile(loadedProfile)
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        if (active) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      } else if (event === 'USER_UPDATED' && newSession?.user) {
        const loadedProfile = await loadProfile(newSession.user.id)
        if (active) {
          setProfile(loadedProfile)
          setLoading(false)
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        if (active) setLoading(false)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword = async (email: string, password: string, portalRole: Role) => {
    setError(null)
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return { error: authError.message }
    }

    if (!data.session || !data.user) {
      const msg = 'Login succeeded but no active session was created.'
      setError(msg)
      setLoading(false)
      return { error: msg }
    }

    // Commit session to Supabase auth client headers so RLS policies know auth.uid()
    await supabase.auth.setSession(data.session)

    // Load profile from database
    let loadedProfile = await loadProfile(data.user.id, data.user)

    // Fallback: If profile row missing in DB, insert it with user's selected role
    if (!loadedProfile) {
      const userRole = ((data.user.user_metadata?.role as Role) || portalRole).toLowerCase() as Role
      const userName = data.user.user_metadata?.name || data.user.user_metadata?.full_name || cleanEmail.split('@')[0]
      const { error: insErr } = await supabase.from('profiles').insert({
        id: data.user.id,
        role: userRole,
        name: userName,
        email: data.user.email || cleanEmail,
      })

      // Fallback: Use profile metadata even if DB insert was blocked
      loadedProfile = { role: userRole, name: userName, email: data.user.email || cleanEmail }
    }

    // Validate Portal Role vs Database Role
    const actualRole = loadedProfile.role.toLowerCase() as Role
    const requestedRole = portalRole.toLowerCase() as Role

    if (actualRole !== requestedRole) {
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      setProfile(null)
      setLoading(false)

      const roleCap = actualRole.charAt(0).toUpperCase() + actualRole.slice(1)
      const msg = `This account is registered as a ${roleCap}. Please log in through the ${roleCap} portal.`
      setError(msg)
      return { error: msg }
    }

    // Portal role matches! Commit session and profile state
    setSession(data.session)
    setUser(data.user)
    setProfile(loadedProfile)
    setLoading(false)
    return { error: null, role: actualRole }
  }

  const signUpWithPassword = async (email: string, password: string, name: string, role: Role) => {
    setError(null)
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()
    const cleanRole = role.toLowerCase() as Role

    // Pre-check: Reject if an account with this email already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (existingProfile) {
      setLoading(false)
      const existingRoleCap = existingProfile.role.charAt(0).toUpperCase() + existingProfile.role.slice(1)
      const msg = `An account with this email already exists as a ${existingRoleCap}. Please sign in instead.`
      setError(msg)
      return { error: msg }
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { name: name.trim(), role: cleanRole },
      },
    })

    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return { error: signUpError.message }
    }

    if (data.user && !data.session) {
      setLoading(false)
      return { error: null, requiresVerification: true }
    }

    if (data.session && data.user) {
      let loadedProfile = await loadProfile(data.user.id)
      if (!loadedProfile) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          role: cleanRole,
          name: name.trim(),
          email: cleanEmail,
        })
        loadedProfile = { role: cleanRole, name: name.trim(), email: cleanEmail }
      }
      setSession(data.session)
      setUser(data.user)
      setProfile(loadedProfile)
    }

    setLoading(false)
    return { error: null, requiresVerification: false }
  }

  const signInWithGoogle = async (role: Role) => {
    setError(null)
    sessionStorage.setItem(PENDING_ROLE_KEY, role.toLowerCase())
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login/${role.toLowerCase()}` },
    })
    if (error) setError(error.message)
    return { error: error?.message ?? null }
  }

  const resendVerificationEmail = async (email: string) => {
    setError(null)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    })
    if (error) setError(error.message)
    return { error: error?.message ?? null }
  }

  const resetPassword = async (email: string) => {
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/login/patient?mode=reset-password`,
    })
    if (error) setError(error.message)
    return { error: error?.message ?? null }
  }

  const updatePassword = async (newPassword: string) => {
    setError(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setError(error.message)
    return { error: error?.message ?? null }
  }

  const logout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role: profile?.role ?? null,
        name: profile?.name ?? '',
        loading,
        error,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        resendVerificationEmail,
        resetPassword,
        updatePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
