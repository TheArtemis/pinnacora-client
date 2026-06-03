import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

function createGameCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function Lobby() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [gameCode, setGameCode] = useState('')

  function handleCreateGame() {
    navigate(`/game/${createGameCode()}`)
  }

  function handleJoinGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedCode = gameCode.trim()
    if (trimmedCode) {
      navigate(`/game/${trimmedCode}`)
    }
  }

  return (
    <main className="page-shell lobby">
      <section className="hero-panel">
        <div className="top-bar">
          <span>{user?.displayName ?? user?.email}</span>
          <button type="button" className="secondary-button" onClick={logout}>
            Log out
          </button>
        </div>

        <p className="eyebrow">Pinnacora</p>
        <h1>A private card table for two.</h1>
        <p className="lede">
          Create a tournament for your matches, or jump into a quick room while the real rules are
          still taking shape.
        </p>

        <div className="lobby-actions">
          <Link className="primary-link" to="/tournaments">
            Open tournaments
          </Link>
          <button type="button" className="primary-button" onClick={handleCreateGame}>
            Quick game
          </button>

          <form className="join-form" onSubmit={handleJoinGame}>
            <label htmlFor="game-code">Join with code</label>
            <div className="join-form__row">
              <input
                id="game-code"
                value={gameCode}
                onChange={(event) => setGameCode(event.target.value.toUpperCase())}
                placeholder="ABC123"
              />
              <button type="submit">Join</button>
            </div>
          </form>
        </div>
      </section>

      <section className="setup-panel" aria-label="Tournament plan">
        <h2>Tournament mode</h2>
        <ul>
          <li>Private tournament join codes</li>
          <li>Multiple active tournaments</li>
          <li>Finished games with placeholder winners</li>
          <li>Past tournament results dashboard</li>
        </ul>
      </section>
    </main>
  )
}
