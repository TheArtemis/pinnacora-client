import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Game from './pages/Game'
import Lobby from './pages/Lobby'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/game/:gameId" element={<Game />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
