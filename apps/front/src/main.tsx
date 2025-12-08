import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startReactDsfr } from '@codegouvfr/react-dsfr/spa'
import '@codegouvfr/react-dsfr/dsfr/dsfr.main.css'
import './index.css'
import App from './App.tsx'

startReactDsfr({ defaultColorScheme: 'system' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
