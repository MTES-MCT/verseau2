import { BrowserRouter, Routes, Route } from 'react-router';
import { Dashboard } from './pages/Dashboard';
import { ConformiteDashboard } from './pages/conformite/ConformiteDashboard';
import { ControlePage } from './pages/Controle';
import { DepotUploadPage } from './pages/DepotUpload';
import { DepotUploadRecapPage } from './pages/DepotUploadRecap';
import { DepotDownloadPage } from './pages/DepotDownload';
import { DepotDetailsPage } from './pages/DepotDetails';
import { ReferentielPointsMesurePage } from './pages/ReferentielPointsMesure';
import { HomePage } from './pages/HomePage';
import CallbackPage from './pages/CallbackPage';
import MockAuthorizationPage from './pages/MockAuthorizationPage';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { EvenementDashboard } from './pages/suivi-regulier/evenement/EvenementDashboard';
import { BilanDashboard } from './pages/suivi-regulier/bilan/BilanDashboard';
import { TransmissionASRetardDashboard } from './pages/suivi-regulier/transmissionASRetard/TransmissionASRetardDashboard';
import { AppHeader } from './components/Header';
import { AppFooter } from './components/Footer';
import { Breadcrumb } from './components/Breadcrumb';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppRoutes } from './routes';
import './App.css';
import { fr } from '@codegouvfr/react-dsfr';
import { Notice } from '@codegouvfr/react-dsfr/Notice';
import { useAuth } from './hooks/useAuth';

function App() {
  const { authenticatedUser } = useAuth();
  const isExpertNational = authenticatedUser?.isExpertNational ?? false;

  return (
    <BrowserRouter>
      <AppHeader />
      <div className={`${fr.cx('fr-container')} app-container`}>
        <Breadcrumb />
        {isExpertNational && (
          <>
            <Notice
              title="Vue administrateur — Expert national Verseau"
              description=" - Vous consultez l'ensemble des dépôts de tous les intervenants."
              severity="info"
              className={fr.cx('fr-mb-1w')}
            />
            <Notice
              title="Attention lors des dépôts"
              description=" - Un dépot sera lié à l'itvCdn de votre utilisateur"
              severity="warning"
              className={fr.cx('fr-mb-3w')}
            />
          </>
        )}

        <main className={fr.cx('fr-py-2w', 'fr-px-0')}>
          <Routes>
            <Route path={AppRoutes.CALLBACK} element={<CallbackPage />} />
            <Route path={AppRoutes.HOME} element={<HomePage />} />
            <Route
              path={AppRoutes.DASHBOARD}
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path={AppRoutes.CONFORMITE_DASHBOARD}
              element={
                <ProtectedRoute>
                  <ConformiteDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path={AppRoutes.EVENEMENT_DASHBOARD}
              element={
                <ProtectedRoute>
                  <EvenementDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path={AppRoutes.BILAN_DASHBOARD}
              element={
                <ProtectedRoute>
                  <BilanDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path={AppRoutes.TRANSMISSION_AS_RETARD_DASHBOARD}
              element={
                <ProtectedRoute>
                  <TransmissionASRetardDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path={AppRoutes.CONTROLE}
              element={
                <ProtectedRoute>
                  <ControlePage />
                </ProtectedRoute>
              }
            />
            <Route
              path={AppRoutes.DEPOT_UPLOAD}
              element={
                <ProtectedRoute>
                  <DepotUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={AppRoutes.DEPOT_DOWNLOAD}
              element={
                <ProtectedRoute>
                  <DepotDownloadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={AppRoutes.DEPOT_DETAILS}
              element={
                <ProtectedRoute>
                  <DepotDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={AppRoutes.DEPOT_UPLOAD_RECAP}
              element={
                <ProtectedRoute>
                  <DepotUploadRecapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={AppRoutes.REFERENTIEL_POINTS_DE_MESURE}
              element={
                <ProtectedRoute>
                  <ReferentielPointsMesurePage />
                </ProtectedRoute>
              }
            />
            <Route path={AppRoutes.MOCK_AUTHORIZATION} element={<MockAuthorizationPage />} />
            {import.meta.env.DEV && <Route path={AppRoutes.DESIGN_SYSTEM} element={<DesignSystemPage />} />}
          </Routes>
        </main>
      </div>
      <AppFooter />
    </BrowserRouter>
  );
}

export default App;
