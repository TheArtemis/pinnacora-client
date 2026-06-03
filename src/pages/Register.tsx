import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

type RedirectState = {
  from?: {
    pathname?: string
  }
}

function getRedirectPath(state: unknown) {
  return (state as RedirectState | null)?.from?.pathname ?? '/'
}

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, loginWithGoogle, register, user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const redirectPath = getRedirectPath(location.state)

  async function handleGoogleSignIn() {
    setSubmitting(true)
    setError('')

    try {
      await loginWithGoogle()
      navigate(redirectPath, { replace: true })
    } catch {
      setError('Could not sign in with Google. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await register(displayName.trim(), email, password)
      navigate(redirectPath, { replace: true })
    } catch {
      setError('Could not create your account. Try another email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!loading && user) {
    return <Navigate to={redirectPath} replace />
  }

  return (
    <main className="page-shell auth-page">
      <section className="auth-card">
        <p className="eyebrow">Create account</p>
        <h1>Register for Pinnacora.</h1>
        <p className="lede">Make a private account before creating or joining a game.</p>

        <div className="auth-form">
          <button type="button" disabled={submitting} onClick={handleGoogleSignIn}>
            {submitting ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>

        <p className="auth-divider">or</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your name"
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  )
}
