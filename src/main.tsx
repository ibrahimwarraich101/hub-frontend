import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './shared/auth/AuthContext'
import { UnsavedChangesDialog } from './shared/forms/UnsavedChangesDialog'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <UnsavedChangesDialog />
    </AuthProvider>
  </StrictMode>,
)
