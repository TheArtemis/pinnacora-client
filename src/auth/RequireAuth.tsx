import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import SessionCheckingScreen from './SessionCheckingScreen'
import { useAuth } from './useAuth'

export default function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation()
  const { loading, user } = useAuth()

  if (loading) {
    return <SessionCheckingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
