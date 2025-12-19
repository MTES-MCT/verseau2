import { BrowserRouter, Routes, Route } from 'react-router';
import { Dashboard } from './pages/Dashboard';
import { ControlePage } from './pages/Controle';
import { DepotUploadPage } from './pages/DepotUpload';
import { DepotUploadRecapPage } from './pages/DepotUploadRecap';
import LoginPage from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import CallbackPage from './pages/CallbackPage';
import MockAuthorizationPage from './pages/MockAuthorizationPage';
import { AppHeader } from './components/Header';
import { Breadcrumb } from './components/Breadcrumb';
import { ProtectedRoute } from './components/ProtectedRoute';
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
            <Route path="/login" element={<LoginPage />} />
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
    </BrowserRouter>
  );
}

export default App;
