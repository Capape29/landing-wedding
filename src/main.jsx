import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AdminPanel from './components/AdminPanel.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {window.location.pathname === '/admin' ? <AdminPanel /> : <App />}
  </StrictMode>,
)
