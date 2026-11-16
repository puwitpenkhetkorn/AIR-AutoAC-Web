import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireAuth() {
  const { token, ready } = useAuth()
  const location = useLocation()

  if (!ready) return null
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}
