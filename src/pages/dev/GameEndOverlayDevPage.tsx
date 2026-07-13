import { useState } from 'react'
import GameEndOverlay, { type GameEndOutcome } from '../../components/game/GameEndOverlay'
import type { ServerGameState } from '../../game/serverTypes'

const YOU_PLAYER_ID = 'player-you'
const OPPONENT_ID = 'player-opponent'

const GAME_END_ANIMATION_KEY = 'pinnacora.gameEndAnimation'

function readAnimationPreference() {
  return localStorage.getItem(GAME_END_ANIMATION_KEY) !== 'false'
}

function writeAnimationPreference(enabled: boolean) {
  localStorage.setItem(GAME_END_ANIMATION_KEY, enabled ? 'true' : 'false')
}

function createMockState(outcome: GameEndOutcome): ServerGameState {
  const youWon = outcome === 'win'
  const winnerId = youWon ? YOU_PLAYER_ID : OPPONENT_ID

  return {
    id: 'dev-game',
    status: 'finished',
    phase: 'finished',
    players: [
      { id: YOU_PLAYER_ID, name: 'Sam', connected: true, handCount: 0 },
      { id: OPPONENT_ID, name: 'Alex', connected: true, handCount: youWon ? 2 : 0 },
    ],
    deckCount: 0,
    discardPile: [],
    melds: [],
    youPlayerId: YOU_PLAYER_ID,
    winnerId,
    finishingPlayerId: winnerId,
    finalScores: {
      [YOU_PLAYER_ID]: {
        meldPoints: 180,
        finishBonus: youWon ? 100 : 0,
        handPenalty: youWon ? 0 : 12,
        total: youWon ? 280 : 168,
      },
      [OPPONENT_ID]: {
        meldPoints: 205,
        finishBonus: youWon ? 0 : 100,
        handPenalty: youWon ? 18 : 0,
        total: youWon ? 187 : 305,
      },
    },
  }
}

export default function GameEndOverlayDevPage() {
  const [overlayOutcome, setOverlayOutcome] = useState<GameEndOutcome | null>(null)
  const [burstKey, setBurstKey] = useState(0)
  const [animationEnabled, setAnimationEnabled] = useState(readAnimationPreference)

  function triggerOutcome(outcome: GameEndOutcome) {
    setOverlayOutcome(outcome)
    setBurstKey((current) => current + 1)
  }

  return (
    <div className="game-end-dev-page">
      <div className="game-end-dev-page__bg" aria-hidden="true" />

      <main className="page-shell game-end-dev-page__content">
        <p className="eyebrow">Development</p>
        <h1>Game end overlay</h1>
        <p className="lede">
          Preview the win and loss overlays with mock scores. Use the controls to trigger each state.
        </p>
      </main>

      <div className="game-end-dev-page__controls">
        <button type="button" className="secondary-button" onClick={() => triggerOutcome('win')}>
          Trigger win
        </button>
        <button type="button" className="secondary-button" onClick={() => triggerOutcome('loss')}>
          Trigger loss
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!overlayOutcome}
          onClick={() => setOverlayOutcome(null)}
        >
          Close
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setAnimationEnabled((current) => {
              const next = !current
              writeAnimationPreference(next)
              return next
            })
          }}
        >
          {animationEnabled ? 'Disable animations' : 'Enable animations'}
        </button>
      </div>

      {overlayOutcome ? (
        <GameEndOverlay
          key={burstKey}
          outcome={overlayOutcome}
          state={createMockState(overlayOutcome)}
          animationEnabled={animationEnabled}
        />
      ) : null}
    </div>
  )
}
