import { useEffect, useState } from 'react'
import SessionCheckCanvas from './SessionCheckCanvas'

const CARD_PUNS = [
  'Shuffling your credentials...',
  'Dealing you back in...',
  'Finding your seat at the table...',
  'Verifying you are not bluffing...',
  'Counting cards... totally legal, we promise.',
  'Cutting the deck on your session...',
  'Checking for wild cards in your profile...',
  "Don't fold now—we're almost there.",
  'Stacking the deck in your favor...',
  'Raising the stakes on security...',
  'Drawing from the auth deck...',
  'Your hand is looking good—confirming now.',
  'Passing the deck to the server...',
  'No jokers allowed in the login queue.',
] as const

const DECK_CARDS = [
  { rank: 'A', suit: '♠', red: false },
  { rank: 'K', suit: '♥', red: true },
  { rank: 'J', suit: '♣', red: false },
] as const

const SESSION_CHECK_ANIMATION_KEY = 'pinnacora.sessionCheckAnimation'

function readAnimationPreference() {
  return localStorage.getItem(SESSION_CHECK_ANIMATION_KEY) !== 'false'
}

function writeAnimationPreference(enabled: boolean) {
  localStorage.setItem(SESSION_CHECK_ANIMATION_KEY, enabled ? 'true' : 'false')
}

export default function SessionCheckingScreen() {
  const [punIndex, setPunIndex] = useState(0)
  const [animationEnabled, setAnimationEnabled] = useState(readAnimationPreference)

  useEffect(() => {
    const timer = setInterval(() => {
      setPunIndex((index) => (index + 1) % CARD_PUNS.length)
    }, 2800)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="session-check-scene">
      <div
        className={`session-check-bg${animationEnabled ? '' : ' session-check-bg--static'}`}
        aria-hidden="true"
      >
        <div className="session-check-bg__mesh" />
        <div className="session-check-bg__orb session-check-bg__orb--one" />
        <div className="session-check-bg__orb session-check-bg__orb--two" />
        <div className="session-check-bg__orb session-check-bg__orb--three" />
        {animationEnabled ? <SessionCheckCanvas /> : null}
      </div>

      <main className="page-shell auth-page session-check-page" aria-busy="true">
        <section className="auth-card session-check">
          <div className="session-check__deck" aria-hidden="true">
            {DECK_CARDS.map((card) => (
              <div
                key={`${card.rank}${card.suit}`}
                className={`session-check__card${card.red ? ' session-check__card--red' : ''}`}
              >
                <span className="session-check__card-rank">{card.rank}</span>
                <span className="session-check__card-suit">{card.suit}</span>
              </div>
            ))}
          </div>

          <p className="eyebrow">Loading</p>
          <h1>Checking your session...</h1>

          <p className="session-check__pun" key={punIndex} aria-live="polite">
            {CARD_PUNS[punIndex]}
          </p>

          <div className="session-check__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>

      <button
        type="button"
        className="session-check__animation-toggle secondary-button"
        onClick={() => {
          setAnimationEnabled((current) => {
            const next = !current
            writeAnimationPreference(next)
            return next
          })
        }}
      >
        {animationEnabled ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
