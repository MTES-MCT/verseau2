import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { startReactDsfr } from '@codegouvfr/react-dsfr/spa'
import '@codegouvfr/react-dsfr/dsfr/dsfr.main.css'
import './index.css'
import App from './App.tsx'

startReactDsfr({ defaultColorScheme: 'system' })

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
