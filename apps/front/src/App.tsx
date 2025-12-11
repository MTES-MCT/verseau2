import { BrowserRouter, Routes, Route } from 'react-router';
import { Dashboard } from './pages/Dashboard';
import { ControlePage } from './pages/Controle';
import { DepotUploadPage } from './pages/DepotUpload';
import { DepotUploadRecapPage } from './pages/DepotUploadRecap';
import { AppHeader } from './components/Header';
import { Breadcrumb } from './components/Breadcrumb';
import './App.css';
import { fr } from '@codegouvfr/react-dsfr';

function App() {
  return (
    <BrowserRouter>
      <AppHeader />
      <div className={fr.cx('fr-container')}>
        <Breadcrumb />
        <main className={fr.cx('fr-py-4w', 'fr-px-0')}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/controle/:depotId" element={<ControlePage />} />
            <Route path="/depot/upload" element={<DepotUploadPage />} />
            <Route path="/depot/upload/recap" element={<DepotUploadRecapPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
