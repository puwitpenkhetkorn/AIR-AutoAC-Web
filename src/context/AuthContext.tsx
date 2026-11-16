import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { sessClear, sessGet, sessSet } from '../lib/session'
import { setOnUnauthorized, tbGetUser, tbLogin } from '../lib/tb'
import type { Role } from '../types'

interface AuthState {
  token: string | null
  userId: string | null
  role: Role | null
  customerId: string | null
  ready: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, remember: boolean) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    userId: null,
    role: null,
    customerId: null,
    ready: false,
  })

  const logout = useCallback(() => {
    sessClear()
    setState({ token: null, userId: null, role: null, customerId: null, ready: true })
  }, [])

  useEffect(() => {
    setOnUnauthorized(logout)
    return () => setOnUnauthorized(null)
  }, [logout])

  useEffect(() => {
    const saved = sessGet()
    if (!saved) {
      setState((s) => ({ ...s, ready: true }))
      return
    }
    tbGetUser(saved.token)
      .then(({ userId, role, customerId }) => {
        setState({ token: saved.token, userId, role, customerId: customerId ?? null, ready: true })
      })
      .catch(() => {
        sessClear()
        setState((s) => ({ ...s, ready: true }))
      })
  }, [])

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const { token } = await tbLogin(email, password)
    const { userId, role, customerId } = await tbGetUser(token)
    sessSet({ token, userId }, remember)
    setState({ token, userId, role, customerId: customerId ?? null, ready: true })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth ต้องถูกใช้ภายใน AuthProvider')
  return ctx
}
