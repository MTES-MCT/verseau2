import { BrowserRouter, Routes, Route } from 'react-router';
import { Dashboard } from './pages/Dashboard';
import { ControlePage } from './pages/Controle';
import { DepotUploadPage } from './pages/DepotUpload';
import { DepotUploadRecapPage } from './pages/DepotUploadRecap';
import { TemporaryFakeTokenInput } from './components/TemporaryFakeTokenInput';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <header className="fr-container fr-my-2w">
        <div className="fr-grid-row fr-grid-row--middle">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            {/* TODO: Supprimer le component TemporaryFakeTokenInput quand OIDC est disponible */}
            <TemporaryFakeTokenInput />
          </div>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/controle/:depotId" element={<ControlePage />} />
        <Route path="/depot/upload" element={<DepotUploadPage />} />
        <Route path="/depot/upload/recap" element={<DepotUploadRecapPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
