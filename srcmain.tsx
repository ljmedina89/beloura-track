import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [err, setErr] = React.useState<Error | null>(null)
  React.useEffect(() => {
    const handler = (e: ErrorEvent) => setErr(e.error || new Error(String(e.message)))
    window.addEventListener('error', handler)
    window.addEventListener('unhandledrejection', (e) => setErr(new Error(String(e.reason))))
    return () => {
      window.removeEventListener('error', handler)
      // @ts-ignore
      window.removeEventListener('unhandledrejection', null)
    }
  }, [])
  if (err) {
    return (
      <div style={{ padding: 16, fontFamily: 'ui-sans-serif,system-ui' }}>
        <h1>⚠️ Error en runtime</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{String(err?.message || err)}</pre>
        <p>Abre la consola del navegador para más detalles.</p>
      </div>
    )
  }
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
