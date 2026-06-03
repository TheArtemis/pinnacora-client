import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

function createGameCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function Lobby() {
  const navigate = useNavigate()
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
        <p className="eyebrow">Pinnacora</p>
        <h1>A private card table for two.</h1>
        <p className="lede">
          Create a room, share the game code, and play together from wherever you are.
        </p>

        <div className="lobby-actions">
          <button type="button" className="primary-button" onClick={handleCreateGame}>
            Create game
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

      <section className="setup-panel" aria-label="Deployment plan">
        <h2>Stack plan</h2>
        <ul>
          <li>Frontend: Vercel</li>
          <li>Backend: Render</li>
          <li>Database: Neon</li>
          <li>Authentication: Firebase Authentication</li>
        </ul>
      </section>
    </main>
  )
}
