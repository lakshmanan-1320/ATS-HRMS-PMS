import './axiosSetup'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('App crash:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#0f172a', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '40px',
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid #ef4444', borderRadius: '16px',
            padding: '32px', maxWidth: '700px', width: '100%',
          }}>
            <div style={{ color: '#ef4444', fontSize: '18px', fontWeight: '700', marginBottom: '12px' }}>
              Application Error
            </div>
            <pre style={{
              color: '#fca5a5', fontSize: '13px', whiteSpace: 'pre-wrap',
              wordBreak: 'break-word', lineHeight: 1.6, margin: 0,
            }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px', padding: '10px 24px', background: '#6366f1',
                color: '#fff', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

window.addEventListener('error', (e) => {
  const root = document.getElementById('root')
  if (root && root.childElementCount === 0) {
    root.innerHTML = `
      <div style="min-height:100vh;background:#0f172a;display:flex;align-items:center;justify-content:center;padding:40px;font-family:monospace">
        <div style="background:#1e293b;border:1px solid #ef4444;border-radius:16px;padding:32px;max-width:700px;width:100%">
          <div style="color:#ef4444;font-size:18px;font-weight:700;margin-bottom:12px">JavaScript Error (pre-render)</div>
          <pre style="color:#fca5a5;font-size:13px;white-space:pre-wrap;word-break:break-word;line-height:1.6;margin:0">${e.message}\n\n${e.filename}:${e.lineno}:${e.colno}\n\n${e.error?.stack || ''}</pre>
        </div>
      </div>`
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
