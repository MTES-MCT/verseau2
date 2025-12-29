import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { startReactDsfr } from '@codegouvfr/react-dsfr/spa';
import { Link as RouterLink } from 'react-router';
import '@codegouvfr/react-dsfr/dsfr/dsfr.main.css';
import '@codegouvfr/react-dsfr/dsfr/utility/icons/icons.min.css';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';

// Force DSFR to use React Router Link to prevent page reload
export const Link = ({ href, ...props }: { href?: string }) => <RouterLink to={href ?? ''} {...props} />;

startReactDsfr({ defaultColorScheme: 'system', Link });

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
