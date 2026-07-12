import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { devMode } from '../../../config/dev'
import type { DevStatePatch } from '../../../game/devState'
import type { ServerGameState } from '../../../game/serverTypes'
import { connectSocket, socket } from '../../../socket'

type UseGameSocketOptions = {
  gameId: string
  tournamentId: string | null
  user: { getIdToken: () => Promise<string> } | null
  serverState: ServerGameState | null
  syncFromServer: (state: ServerGameState) => void
  dropPendingAction: (clientActionId: string | null) => void
  clearPendingActions: () => void
  onStateReset: () => void
  onActionFailure: () => void
}

export function useGameSocket({
  gameId,
  tournamentId,
  user,
  serverState,
  syncFromServer,
  dropPendingAction,
  clearPendingActions,
  onStateReset,
  onActionFailure,
}: UseGameSocketOptions) {
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  const [gameError, setGameError] = useState('')
  const [opponentHandHover, setOpponentHandHover] = useState<{ playerId: string; cardIndexes: number[] } | null>(null)
  const [devApplying, setDevApplying] = useState(false)
  const [devError, setDevError] = useState('')
  const [devResetKey, setDevResetKey] = useState(0)
  const devApplyingRef = useRef(false)

  const joinGame = useCallback(() => {
    socket.emit('join_game', tournamentId ? { gameId, tournamentId } : gameId)
  }, [gameId, tournamentId])

  const applyDevState = useCallback((patch: DevStatePatch) => {
    if (!devMode) {
      return
    }

    clearPendingActions()
    onActionFailure()
    devApplyingRef.current = true
    setDevApplying(true)
    setDevError('')
    socket.emit('dev_set_state', patch)
  }, [clearPendingActions, onActionFailure])

  const syncDevPanel = useCallback(() => {
    setDevError('')
    setDevResetKey((current) => current + 1)
    joinGame()
  }, [joinGame])

  const opponentHoveredHandIndexes = useMemo(() => {
    const opponentPlayerIds = new Set(
      serverState?.players
        .filter((player) => player.id !== serverState.youPlayerId)
        .map((player) => player.id) ?? [],
    )

    if (!opponentHandHover || !opponentPlayerIds.has(opponentHandHover.playerId)) {
      return new Set<number>()
    }

    return new Set(opponentHandHover.cardIndexes)
  }, [opponentHandHover, serverState])

  useEffect(() => {
    if (!user) {
      return
    }

    let cancelled = false
    const activeSocket = socket

    function handleConnect() {
      setConnectionStatus('Connected')
      setGameError('')
      joinGame()
    }

    function handleDisconnect() {
      setConnectionStatus('Disconnected')
    }

    function handleConnectError() {
      setConnectionStatus('Authentication failed')
    }

    function handleGameState(nextState: ServerGameState) {
      syncFromServer(nextState)
      onStateReset()
      setOpponentHandHover(null)
      setGameError('')

      if (devApplyingRef.current) {
        devApplyingRef.current = false
        setDevApplying(false)
        setDevError('')
        setDevResetKey((current) => current + 1)
      }
    }

    function handleGameError(nextError: { error?: string; clientActionId?: unknown }) {
      const failedActionId = typeof nextError.clientActionId === 'string' ? nextError.clientActionId : null
      dropPendingAction(failedActionId)
      onActionFailure()

      if (devApplyingRef.current) {
        devApplyingRef.current = false
        setDevApplying(false)
        setDevError(nextError.error ?? 'Could not apply dev state.')
        return
      }

      setGameError(nextError.error ?? 'Could not complete game action')
      joinGame()
    }

    function handleGameActionAck(payload: { clientActionId?: unknown }) {
      if (typeof payload.clientActionId !== 'string') {
        return
      }

      dropPendingAction(payload.clientActionId)
    }

    function handleOpponentHandHover(payload: { playerId?: unknown; cardIndexes?: unknown }) {
      if (typeof payload.playerId !== 'string' || !Array.isArray(payload.cardIndexes)) {
        return
      }

      setOpponentHandHover({
        playerId: payload.playerId,
        cardIndexes: payload.cardIndexes.filter(
          (cardIndex): cardIndex is number => Number.isInteger(cardIndex) && cardIndex >= 0,
        ),
      })
    }

    activeSocket.on('connect', handleConnect)
    activeSocket.on('disconnect', handleDisconnect)
    activeSocket.on('connect_error', handleConnectError)
    activeSocket.on('game_state', handleGameState)
    activeSocket.on('game_action_ack', handleGameActionAck)
    activeSocket.on('game_error', handleGameError)
    activeSocket.on('opponent_hand_hover', handleOpponentHandHover)

    function handleWindowFocus() {
      if (activeSocket.connected) {
        joinGame()
      }
    }

    window.addEventListener('focus', handleWindowFocus)

    user
      .getIdToken()
      .then((token) => {
        if (cancelled) {
          return
        }

        connectSocket(token)

        if (activeSocket.connected) {
          handleConnect()
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConnectionStatus('Authentication failed')
        }
      })

    return () => {
      cancelled = true
      activeSocket.off('connect', handleConnect)
      activeSocket.off('disconnect', handleDisconnect)
      activeSocket.off('connect_error', handleConnectError)
      activeSocket.off('game_state', handleGameState)
      activeSocket.off('game_action_ack', handleGameActionAck)
      activeSocket.off('game_error', handleGameError)
      activeSocket.off('opponent_hand_hover', handleOpponentHandHover)
      window.removeEventListener('focus', handleWindowFocus)
      activeSocket.emit('hover_hand_cards', { cardIndexes: [] })
      activeSocket.disconnect()
    }
  }, [
    dropPendingAction,
    joinGame,
    onActionFailure,
    onStateReset,
    syncFromServer,
    user,
  ])

  return {
    connectionStatus,
    gameError,
    setGameError,
    opponentHoveredHandIndexes,
    applyDevState,
    syncDevPanel,
    devApplying,
    devError,
    devResetKey,
  }
}
