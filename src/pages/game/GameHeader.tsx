import { Link } from 'react-router-dom'

type GameHeaderProps = {
  gameId: string
  isTournamentGame: boolean
  tournamentId: string | null
  connectionStatus: string
  handHoverCameraFocusEnabled: boolean
  copiedGameLink: boolean
  canSurrender: boolean
  onHandHoverCameraFocusChange: (enabled: boolean) => void
  onCopyGameLink: () => void
  onSurrender: () => void
}

export default function GameHeader({
  gameId,
  isTournamentGame,
  tournamentId,
  connectionStatus,
  handHoverCameraFocusEnabled,
  copiedGameLink,
  canSurrender,
  onHandHoverCameraFocusChange,
  onCopyGameLink,
  onSurrender,
}: GameHeaderProps) {
  return (
    <header className="game-header">
      <div>
        <p className="eyebrow">Game room</p>
        <h1>{gameId}</h1>
        <p className="muted">
          {isTournamentGame
            ? 'This game belongs to your current tournament.'
            : 'Share this code with your girlfriend so she can join.'}
        </p>
      </div>
      <div className="header-actions">
        <label className="game-header-toggle">
          <span>Hand zoom</span>
          <input
            type="checkbox"
            role="switch"
            checked={handHoverCameraFocusEnabled}
            onChange={(event) => onHandHoverCameraFocusChange(event.target.checked)}
            aria-label="Zoom camera when hovering hand cards"
          />
        </label>
        <button type="button" className="secondary-button" onClick={onCopyGameLink}>
          {copiedGameLink ? 'Copied!' : 'Copy game link'}
        </button>
        {isTournamentGame ? (
          <button type="button" className="secondary-button" onClick={onSurrender} disabled={!canSurrender}>
            Surrender
          </button>
        ) : null}
        <Link className="secondary-link" to={tournamentId ? `/tournaments/${tournamentId}` : '/'}>
          {tournamentId ? 'Back to tournament' : 'Back to lobby'}
        </Link>
        <div className="connection-pill">{connectionStatus}</div>
      </div>
    </header>
  )
}
