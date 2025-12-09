import { BrowserRouter, Routes, Route } from 'react-router'
import { Dashboard } from './pages/Dashboard'
import { ControlePage } from './pages/Controle'
import { DepotUploadPage } from './pages/DepotUpload'
import { DepotUploadRecapPage } from './pages/DepotUploadRecap'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/controle/:depotId" element={<ControlePage />} />
        <Route path="/depot/upload" element={<DepotUploadPage />} />
        <Route path="/depot/upload/recap" element={<DepotUploadRecapPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
