import { useCallback, useEffect, useRef, useState } from 'react'
import {
  projectOptimisticAction,
  projectOptimisticActions,
  type OptimisticGameAction,
} from '../../../game/optimisticActions'
import type { ServerGameState } from '../../../game/serverTypes'

export function useOptimisticGameState() {
  const pendingActionsRef = useRef<OptimisticGameAction[]>([])
  const serverStateRef = useRef<ServerGameState | null>(null)
  const [serverState, setServerState] = useState<ServerGameState | null>(null)
  const [pendingActions, setPendingActions] = useState<OptimisticGameAction[]>([])

  useEffect(() => {
    serverStateRef.current = serverState
  }, [serverState])

  const setPendingActionsState = useCallback((actions: OptimisticGameAction[]) => {
    pendingActionsRef.current = actions
    setPendingActions(actions)
  }, [])

  const applyOptimisticAction = useCallback((action: OptimisticGameAction) => {
    const currentState = serverStateRef.current

    if (!currentState) {
      return false
    }

    const projectedState = projectOptimisticAction(currentState, action)

    if (!projectedState) {
      return false
    }

    setPendingActionsState([...pendingActionsRef.current, action])
    setServerState(projectedState)
    return true
  }, [setPendingActionsState])

  const syncFromServer = useCallback((nextState: ServerGameState) => {
    setServerState(projectOptimisticActions(nextState, pendingActionsRef.current))
  }, [])

  const dropPendingAction = useCallback((clientActionId: string | null) => {
    if (!clientActionId) {
      return
    }

    setPendingActionsState(
      pendingActionsRef.current.filter((action) => action.id !== clientActionId),
    )
  }, [setPendingActionsState])

  const clearPendingActions = useCallback(() => {
    setPendingActionsState([])
  }, [setPendingActionsState])

  return {
    serverState,
    pendingActions,
    syncFromServer,
    applyOptimisticAction,
    dropPendingAction,
    clearPendingActions,
  }
}
