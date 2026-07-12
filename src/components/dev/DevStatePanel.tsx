import { useEffect, useMemo, useState } from 'react'
import Card from '../Card'
import { cardLabel } from '../../game/deckCatalog'
import {
  addCardToDiscardPile,
  addCardToMeld,
  addCardToPlayerHand,
  addMeldFromCards,
  buildDevStatePatch,
  createDevDraftFromState,
  getAvailableCards,
  removeCardFromDiscardPile,
  removeCardFromMeld,
  removeCardFromPlayerHand,
  removeMeld,
  remainingDeckCount,
  type DevDraftState,
} from '../../game/devState'
import type { Card as CardType, CardSuit } from '../../game/cardTypes'
import type { GamePhase, ServerGameState } from '../../game/serverTypes'
import '../../styles/dev-panel.css'

type DevStatePanelProps = {
  state: ServerGameState | null
  resetKey: number
  onApply: (patch: ReturnType<typeof buildDevStatePatch>) => void
  onSync: () => void
  applying?: boolean
  error?: string
}

type ActiveZone =
  | { zone: 'hand'; playerId: string }
  | { zone: 'discard' }
  | { zone: 'meld'; meldId: string }
  | null

const statusOptions: ServerGameState['status'][] = ['waiting', 'playing', 'paused', 'finished']
const phaseOptions: GamePhase[] = ['waiting', 'draw', 'discard', 'finished']
const poolSuitFilters: Array<{ id: 'all' | CardSuit; label: string; tone?: 'red' | 'black' }> = [
  { id: 'all', label: 'All' },
  { id: 'spades', label: '♠', tone: 'black' },
  { id: 'hearts', label: '♥', tone: 'red' },
  { id: 'diamonds', label: '♦', tone: 'red' },
  { id: 'clubs', label: '♣', tone: 'black' },
  { id: 'joker', label: 'Joker' },
]

function playerLabel(state: ServerGameState, playerId: string) {
  const player = state.players.find((candidate) => candidate.id === playerId)
  return playerId === state.youPlayerId ? 'You' : player?.name ?? 'Opponent'
}

function DevCardList({
  cards,
  onRemove,
}: {
  cards: CardType[]
  onRemove: (cardId: string) => void
}) {
  if (cards.length === 0) {
    return <p className="dev-panel__empty">No cards</p>
  }

  return (
    <div className="dev-panel__card-list">
      {cards.map((card) => (
        <div className="dev-panel__card-item" key={card.id}>
          <Card card={card} />
          <button type="button" className="dev-panel__remove" onClick={() => onRemove(card.id)} aria-label={`Remove ${cardLabel(card)}`}>
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

export default function DevStatePanel({ state, resetKey, onApply, onSync, applying = false, error }: DevStatePanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [draft, setDraft] = useState<DevDraftState | null>(() => createDevDraftFromState(state))
  const [activeZone, setActiveZone] = useState<ActiveZone>(null)
  const [selectedPoolCardIds, setSelectedPoolCardIds] = useState<string[]>([])
  const [poolSuitFilter, setPoolSuitFilter] = useState<'all' | CardSuit>('all')

  useEffect(() => {
    setDraft(createDevDraftFromState(state))
    setSelectedPoolCardIds([])
    setActiveZone(null)
  }, [resetKey])

  useEffect(() => {
    if (!draft && state) {
      setDraft(createDevDraftFromState(state))
    }
  }, [draft, state])

  const availableCards = useMemo(() => (draft ? getAvailableCards(draft) : []), [draft])
  const filteredPoolCards = useMemo(
    () => (poolSuitFilter === 'all' ? availableCards : availableCards.filter((card) => card.suit === poolSuitFilter)),
    [availableCards, poolSuitFilter],
  )
  const selectedPoolCards = useMemo(
    () => selectedPoolCardIds.map((cardId) => availableCards.find((card) => card.id === cardId)).filter((card): card is CardType => Boolean(card)),
    [availableCards, selectedPoolCardIds],
  )

  if (!state || !draft) {
    return null
  }

  function updateDraft(updater: (current: DevDraftState) => DevDraftState) {
    setDraft((current) => (current ? updater(current) : current))
  }

  function handleAddPoolCard(card: CardType) {
    if (!activeZone) {
      setSelectedPoolCardIds((current) =>
        current.includes(card.id) ? current.filter((cardId) => cardId !== card.id) : [...current, card.id],
      )
      return
    }

    if (activeZone.zone === 'hand') {
      updateDraft((current) => addCardToPlayerHand(current, activeZone.playerId, card))
    } else if (activeZone.zone === 'discard') {
      updateDraft((current) => addCardToDiscardPile(current, card))
    } else {
      updateDraft((current) => addCardToMeld(current, activeZone.meldId, card))
    }
  }

  function handleCreateMeld(playerId: string) {
    if (selectedPoolCards.length < 3) {
      return
    }

    updateDraft((current) => addMeldFromCards(current, playerId, selectedPoolCards))
    setSelectedPoolCardIds([])
    setActiveZone(null)
  }

  function handleApply() {
    if (!draft) {
      return
    }

    onApply(buildDevStatePatch(draft))
  }

  function handleSyncFromServer() {
    setDraft(createDevDraftFromState(state))
    setSelectedPoolCardIds([])
    setActiveZone(null)
    onSync()
  }

  return (
    <aside className={`dev-panel ${isOpen ? 'dev-panel--open' : ''}`}>
      <header className="dev-panel__header">
        <div>
          <strong>Dev setup</strong>
          <span className="dev-panel__meta">{remainingDeckCount(draft)} cards in deck</span>
        </div>
        <button type="button" className="dev-panel__toggle" onClick={() => setIsOpen((open) => !open)}>
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </header>

      {isOpen ? (
        <div className="dev-panel__body">
          <div className="dev-panel__scroll">
            <section className="dev-panel__section">
              <h3>Turn</h3>
              <div className="dev-panel__grid">
                <label>
                  Status
                  <select
                    value={draft.status}
                    onChange={(event) => updateDraft((current) => ({ ...current, status: event.target.value as DevDraftState['status'] }))}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Phase
                  <select
                    value={draft.phase}
                    onChange={(event) => updateDraft((current) => ({ ...current, phase: event.target.value as GamePhase }))}
                  >
                    {phaseOptions.map((phase) => (
                      <option key={phase} value={phase}>{phase}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Current player
                  <select
                    value={draft.currentPlayerId}
                    onChange={(event) => updateDraft((current) => ({ ...current, currentPlayerId: event.target.value }))}
                  >
                    {state.players.map((player) => (
                      <option key={player.id} value={player.id}>{playerLabel(state, player.id)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="dev-panel__quick-actions">
                {state.youPlayerId ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => updateDraft((current) => ({
                      ...current,
                      status: 'playing',
                      phase: 'discard',
                      currentPlayerId: state.youPlayerId!,
                    }))}
                  >
                    My discard turn
                  </button>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => updateDraft((current) => ({
                    ...current,
                    status: 'playing',
                    phase: 'draw',
                  }))}
                >
                  Draw phase
                </button>
              </div>
            </section>

            {state.players.map((player) => (
              <section className="dev-panel__section" key={player.id}>
                <div className="dev-panel__section-header">
                  <h3>{playerLabel(state, player.id)} hand</h3>
                  <button
                    type="button"
                    className={`secondary-button ${activeZone?.zone === 'hand' && activeZone.playerId === player.id ? 'secondary-button--active' : ''}`}
                    onClick={() => setActiveZone({ zone: 'hand', playerId: player.id })}
                  >
                    Add cards here
                  </button>
                </div>
                {player.id !== state.youPlayerId ? (
                  <p className="dev-panel__hint">Opponent cards are hidden in play — set them here for server testing.</p>
                ) : null}
                <DevCardList
                  cards={draft.playerHands[player.id] ?? []}
                  onRemove={(cardId) => updateDraft((current) => removeCardFromPlayerHand(current, player.id, cardId))}
                />
              </section>
            ))}

            <section className="dev-panel__section">
              <div className="dev-panel__section-header">
                <h3>Discard pile</h3>
                <button
                  type="button"
                  className={`secondary-button ${activeZone?.zone === 'discard' ? 'secondary-button--active' : ''}`}
                  onClick={() => setActiveZone({ zone: 'discard' })}
                >
                  Add cards here
                </button>
              </div>
              <DevCardList
                cards={draft.discardPile}
                onRemove={(cardId) => updateDraft((current) => removeCardFromDiscardPile(current, cardId))}
              />
            </section>

            <section className="dev-panel__section">
              <div className="dev-panel__section-header">
                <h3>Melds</h3>
                <div className="dev-panel__inline-actions">
                  {state.players.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      className="secondary-button"
                      disabled={selectedPoolCards.length < 3}
                      onClick={() => handleCreateMeld(player.id)}
                    >
                      Create {playerLabel(state, player.id)} meld
                    </button>
                  ))}
                </div>
              </div>
              {draft.melds.length === 0 ? <p className="dev-panel__empty">No melds on the table</p> : null}
              {draft.melds.map((meld) => (
                <article className="dev-panel__meld" key={meld.id}>
                  <div className="dev-panel__meld-header">
                    <span>{playerLabel(state, meld.playerId)} · {meld.type}</span>
                    <div className="dev-panel__inline-actions">
                      <button
                        type="button"
                        className={`secondary-button ${activeZone?.zone === 'meld' && activeZone.meldId === meld.id ? 'secondary-button--active' : ''}`}
                        onClick={() => setActiveZone({ zone: 'meld', meldId: meld.id })}
                      >
                        Add card
                      </button>
                      <button type="button" className="dev-panel__remove" onClick={() => updateDraft((current) => removeMeld(current, meld.id))}>
                        Remove meld
                      </button>
                    </div>
                  </div>
                  <DevCardList
                    cards={meld.cards}
                    onRemove={(cardId) => updateDraft((current) => removeCardFromMeld(current, meld.id, cardId))}
                  />
                </article>
              ))}
            </section>
          </div>

          <section className="dev-panel__section dev-panel__section--pool">
            <div className="dev-panel__section-header">
              <h3>Card pool</h3>
              <span className="dev-panel__meta">{filteredPoolCards.length} available</span>
            </div>
            <p className="dev-panel__hint">
              {activeZone
                ? 'Click a card to add it to the active zone.'
                : 'Select cards, then create a meld — or choose a zone and add cards directly.'}
            </p>
            <div className="dev-panel__pool-filters" role="tablist" aria-label="Filter card pool by suit">
              {poolSuitFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={poolSuitFilter === filter.id}
                  className={[
                    'dev-panel__pool-filter',
                    poolSuitFilter === filter.id ? 'dev-panel__pool-filter--active' : '',
                    filter.tone === 'red' ? 'dev-panel__pool-filter--tone-red' : '',
                    filter.tone === 'black' ? 'dev-panel__pool-filter--tone-black' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setPoolSuitFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="dev-panel__pool">
              {filteredPoolCards.length === 0 ? (
                <p className="dev-panel__empty">No cards available for this filter.</p>
              ) : (
                filteredPoolCards.map((card) => {
                  const isSelected = selectedPoolCardIds.includes(card.id)
                  return (
                    <div className="dev-panel__pool-card" key={card.id}>
                      <Card
                        card={card}
                        selected={isSelected}
                        onClick={() => handleAddPoolCard(card)}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="dev-panel__footer">
            <button type="button" className="secondary-button" onClick={handleSyncFromServer}>
              Reset from server
            </button>
            <button type="button" className="secondary-button secondary-button--active" onClick={handleApply} disabled={applying}>
              {applying ? 'Applying...' : 'Apply to table'}
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  )
}
