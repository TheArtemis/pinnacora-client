import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ServerGameState } from '../../game/serverTypes'
import ConfettiBurst from './ConfettiBurst'

export type GameEndOutcome = 'win' | 'loss'

const LOSS_CARDS = [
  { rank: '7', suit: '♠', red: false },
  { rank: 'Q', suit: '♥', red: true },
  { rank: '4', suit: '♣', red: false },
] as const

export default function GameEndOverlay({
  outcome,
  state,
  animationEnabled = true,
  returnTo = '/tournaments',
}: {
  outcome: GameEndOutcome
  state: ServerGameState
  animationEnabled?: boolean
  returnTo?: string
}) {
  const navigate = useNavigate()
  const stageRef = useRef<HTMLDivElement>(null)
  const isWin = outcome === 'win'
  const animationClass = animationEnabled ? '' : ' game-end-overlay--static'

  return (
    <div
      className={`game-end-overlay__backdrop game-end-overlay__backdrop--${outcome}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-end-overlay-title"
    >
      <div ref={stageRef} className="game-end-overlay__stage">
        {!isWin && animationEnabled ? (
          <div className="game-end-overlay__falling-cards" aria-hidden="true">
            {LOSS_CARDS.map((card) => (
              <div
                key={`${card.rank}${card.suit}`}
                className={`game-end-overlay__falling-card${card.red ? ' game-end-overlay__falling-card--red' : ''}`}
              >
                <span>{card.rank}</span>
                <span>{card.suit}</span>
              </div>
            ))}
          </div>
        ) : null}

        <article className={`game-end-overlay game-end-overlay--${outcome}${animationClass}`}>
          <h2 id="game-end-overlay-title" className="game-end-overlay__title">
            {outcome === 'win' ? 'You won' : 'You lost'}
          </h2>

          <ul className="game-end-overlay__scores" aria-label="Scores">
            {state.players.map((player) => {
              const isWinner = player.id === state.winnerId
              const isYou = player.id === state.youPlayerId
              const total = state.finalScores?.[player.id]?.total ?? 0

              return (
                <li
                  key={player.id}
                  className={`game-end-overlay__score${isWinner ? ' game-end-overlay__score--winner' : ''}`}
                >
                  <strong className="game-end-overlay__score-name">
                    {isYou ? 'You' : player.name}
                  </strong>
                  <span className="game-end-overlay__score-total">{total} pts</span>
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            className="game-end-overlay__dismiss secondary-button"
            onClick={() => navigate(returnTo)}
          >
            {returnTo.startsWith('/tournaments/') && returnTo.length > '/tournaments/'.length
              ? 'Back to tournament'
              : 'Back to tournaments'}
          </button>
        </article>

        {isWin && animationEnabled ? <ConfettiBurst panelRef={stageRef} /> : null}
      </div>
    </div>
  )
}
