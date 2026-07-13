import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import RequireAuth from './auth/RequireAuth'
import SessionCheckingScreen from './auth/SessionCheckingScreen'
import { useServerKeepalive } from './hooks/useServerKeepalive'
import Game from './pages/game/Game'
import Login from './pages/Login'
import Lobby from './pages/Lobby'
import Register from './pages/Register'
import TournamentDetail from './pages/TournamentDetail'
import Tournaments from './pages/Tournaments'

function App() {
  useServerKeepalive()

  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <Tournaments />
          </RequireAuth>
        }
      />
      <Route
        path="/lobby"
        element={
          <RequireAuth>
            <Lobby />
          </RequireAuth>
        }
      />
      <Route
        path="/game/:gameId"
        element={
          <RequireAuth>
            <Game />
          </RequireAuth>
        }
      />
      <Route
        path="/tournaments"
        element={
          <RequireAuth>
            <Tournaments />
          </RequireAuth>
        }
      />
      <Route
        path="/tournaments/:tournamentId"
        element={
          <RequireAuth>
            <TournamentDetail />
          </RequireAuth>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dev/checking-session" element={<SessionCheckingScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
