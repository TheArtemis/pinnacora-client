import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import RequireAuth from './auth/RequireAuth'
import Game from './pages/Game'
import Login from './pages/Login'
import Lobby from './pages/Lobby'
import Register from './pages/Register'

function App() {
  return (
    <Routes>
      <Route
        path="/"
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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
