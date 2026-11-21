import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import './index.css'

// Suppress browser-like behaviors (context menu, reload keys) for a native desktop feel
if (typeof window !== 'undefined') {
  window.addEventListener('contextmenu', (e) => e.preventDefault())
  window.addEventListener('keydown', (e) => {
    // Prevent reload and inspect shortcuts
    if (
      e.key === 'F5' ||
      ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) ||
      ((e.ctrlKey || e.metaKey) && ['p', 'P', 'u', 'U', 's', 'S'].includes(e.key))
    ) {
      e.preventDefault()
    }
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
