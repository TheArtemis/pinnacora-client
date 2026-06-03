import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

export default function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation()
  const { loading, user } = useAuth()

  if (loading) {
    return (
      <main className="page-shell auth-page">
        <section className="auth-card">
          <p className="eyebrow">Loading</p>
          <h1>Checking your session...</h1>
        </section>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
