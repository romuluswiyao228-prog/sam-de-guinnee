/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { Session, User, AuthError, Factor } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AppRole, Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  roles: AppRole[]
  loading: boolean
  /** Supabase Authenticator Assurance Level (aal1 = password, aal2 = MFA verified) */
  aal: 'aal1' | 'aal2'
  /** Whether the user needs to complete MFA before accessing privileged routes */
  needsMfa: boolean
  /** MFA TOTP factors enrolled for the current user */
  mfaFactors: Factor[]
}

interface AuthContextValue extends AuthState {
  signUp: (email: string, password: string, fullName: string, phone: string, consent: boolean) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>
  updateProfile: (data: Partial<Pick<Profile, 'full_name' | 'phone' | 'preferred_language' | 'marketing_consent'>>) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
  refreshRoles: () => Promise<void>
  refreshMfa: () => Promise<void>
  hasRole: (role: AppRole) => boolean
  hasAnyRole: (roles: AppRole[]) => boolean
  /** Post-login redirect path based on roles */
  getDefaultRedirect: () => string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ---------- helpers ----------

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data
}

async function fetchRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
  if (error || !data) return []
  return (data as Array<{ role: AppRole }>).map((r) => r.role)
}

async function fetchMfaLevel(): Promise<{ aal: 'aal1' | 'aal2'; factors: Factor[] }> {
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const { data: factorsData } = await supabase.auth.mfa.listFactors()
  return {
    aal: (aalData?.currentLevel ?? 'aal1') as 'aal1' | 'aal2',
    factors: factorsData?.totp ?? [],
  }
}

// ---------- provider ----------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    roles: [],
    loading: true,
    aal: 'aal1',
    needsMfa: false,
    mfaFactors: [],
  })

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Load full user data from DB whenever session changes
  const loadUserData = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      if (mountedRef.current) {
        setState({ session: null, user: null, profile: null, roles: [], loading: false, aal: 'aal1', needsMfa: false, mfaFactors: [] })
      }
      return
    }

    const [profile, roles, mfa] = await Promise.all([
      fetchProfile(session.user.id),
      fetchRoles(session.user.id),
      fetchMfaLevel(),
    ])

    const needsMfa = (roles.includes('admin') || roles.includes('staff')) && mfa.aal !== 'aal2'

    if (mountedRef.current) {
      setState({
        session,
        user: session.user,
        profile,
        roles,
        loading: false,
        aal: mfa.aal,
        needsMfa,
        mfaFactors: mfa.factors,
      })
    }
  }, [])

  // Initial session + subscription
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserData(session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadUserData])

  // ---------- actions ----------

  const signUp = useCallback(async (email: string, password: string, fullName: string, phone: string, consent: boolean) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, marketing_consent: consent },
        emailRedirectTo: `${window.location.origin}/connexion`,
      },
    })
    // Generic message to not reveal whether the email exists
    return { error }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    })
    return { error }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }, [])

  const updateProfile = useCallback(async (data: Partial<Pick<Profile, 'full_name' | 'phone' | 'preferred_language' | 'marketing_consent'>>) => {
    if (!state.user) return { error: new Error('Non connecté') }
    const { error } = await (
      supabase.from('profiles') as unknown as {
        update: (values: Partial<Pick<Profile, 'full_name' | 'phone' | 'preferred_language' | 'marketing_consent'>>) => {
          eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>
        }
      }
    )
      .update(data)
      .eq('id', state.user.id)
    if (!error) {
      setState((prev) => ({ ...prev, profile: prev.profile ? { ...prev.profile, ...data } : prev.profile }))
    }
    return { error: error ? new Error(error.message) : null }
  }, [state.user])

  const refreshProfile = useCallback(async () => {
    if (!state.user) return
    const profile = await fetchProfile(state.user.id)
    if (mountedRef.current) setState((prev) => ({ ...prev, profile }))
  }, [state.user])

  const refreshRoles = useCallback(async () => {
    if (!state.user) return
    const roles = await fetchRoles(state.user.id)
    if (mountedRef.current) setState((prev) => ({ ...prev, roles }))
  }, [state.user])

  const refreshMfa = useCallback(async () => {
    const mfa = await fetchMfaLevel()
    if (mountedRef.current) {
      setState((prev) => ({
        ...prev,
        aal: mfa.aal,
        mfaFactors: mfa.factors,
        needsMfa: (prev.roles.includes('admin') || prev.roles.includes('staff')) && mfa.aal !== 'aal2',
      }))
    }
  }, [])

  const hasRole = useCallback((role: AppRole) => state.roles.includes(role), [state.roles])
  const hasAnyRole = useCallback((roles: AppRole[]) => roles.some((r) => state.roles.includes(r)), [state.roles])

  const getDefaultRedirect = useCallback(() => {
    if (state.roles.includes('admin')) return '/admin'
    if (state.roles.includes('staff')) return '/staff/scan'
    return '/mon-compte'
  }, [state.roles])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        resetPasswordForEmail,
        updatePassword,
        updateProfile,
        refreshProfile,
        refreshRoles,
        refreshMfa,
        hasRole,
        hasAnyRole,
        getDefaultRedirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé à l\'intérieur de <AuthProvider>')
  return ctx
}

