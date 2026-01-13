import { BrowserRouter, Routes, Route } from 'react-router';
import { Dashboard } from './pages/Dashboard';
import { ControlePage } from './pages/Controle';
import { DepotUploadPage } from './pages/DepotUpload';
import { DepotUploadRecapPage } from './pages/DepotUploadRecap';
import { DepotDownloadPage } from './pages/DepotDownload';
import { DepotDetailsPage } from './pages/DepotDetails';
import { HomePage } from './pages/HomePage';
import CallbackPage from './pages/CallbackPage';
import MockAuthorizationPage from './pages/MockAuthorizationPage';
import { AppHeader } from './components/Header';
import { AppFooter } from './components/Footer';
import { Breadcrumb } from './components/Breadcrumb';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';
import { fr } from '@codegouvfr/react-dsfr';

function App() {
  return (
    <BrowserRouter>
      <AppHeader />
      <div className={`${fr.cx('fr-container')} app-container`}>
        <Breadcrumb />

        <main className={fr.cx('fr-py-4w', 'fr-px-0')}>
          <Routes>
            <Route path="/callback" element={<CallbackPage />} />
            <Route path="/" element={<HomePage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/controle/:depotId"
              element={
                <ProtectedRoute>
                  <ControlePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/depot/upload"
              element={
                <ProtectedRoute>
                  <DepotUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/depot/download"
              element={
                <ProtectedRoute>
                  <DepotDownloadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/depot/details"
              element={
                <ProtectedRoute>
                  <DepotDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/depot/upload/recap"
              element={
                <ProtectedRoute>
                  <DepotUploadRecapPage />
                </ProtectedRoute>
              }
            />
            <Route path="/mock_authorization" element={<MockAuthorizationPage />} />
          </Routes>
        </main>
      </div>
      <AppFooter />
    </BrowserRouter>
  );
}

export default App;
