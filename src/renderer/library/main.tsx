import '@renderer/styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from '@renderer/components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary windowName="library">
      <App />
    </ErrorBoundary>
  </StrictMode>
)
