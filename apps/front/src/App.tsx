import { BrowserRouter, Routes, Route } from 'react-router'
import { Dashboard } from './pages/Dashboard'
import { ControlePage } from './pages/Controle'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/controle/:depotId" element={<ControlePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
