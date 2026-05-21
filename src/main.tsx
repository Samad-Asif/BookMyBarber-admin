import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import PaymentComplete from './pages/PaymentComplete.tsx'
import PaymentCancel from './pages/PaymentCancel.tsx'
import { isLoggingEnabled, logger } from './lib/logger'

if (isLoggingEnabled()) {
  logger.info('Admin dashboard starting', {
    apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/v1',
    mode: import.meta.env.MODE,
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/payment/complete" element={<PaymentComplete />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
