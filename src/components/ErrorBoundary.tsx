import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    // Optionally reload the extension
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '32px',
          textAlign: 'center',
          background: 'var(--bg-main)',
          color: 'var(--text-main)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--bg-gray)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            border: '1px solid var(--border)'
          }}>
            <AlertTriangle size={32} color="var(--accent)" />
          </div>

          <h2 style={{
            fontSize: '18px',
            fontWeight: 800,
            marginBottom: '12px',
            letterSpacing: '0.5px'
          }}>
            SOMETHING WENT WRONG
          </h2>

          <p style={{
            fontSize: '13px',
            color: 'var(--text-dim)',
            lineHeight: 1.6,
            maxWidth: '320px',
            marginBottom: '24px',
            fontWeight: 500
          }}>
            Vibechekk encountered an unexpected error. Don't worry, your data is safe.
          </p>

          {this.state.error && (
            <details style={{
              fontSize: '11px',
              color: 'var(--text-dim)',
              marginBottom: '24px',
              maxWidth: '400px',
              textAlign: 'left',
              background: 'var(--bg-gray)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '8px' }}>
                Error Details
              </summary>
              <pre style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '10px',
                fontFamily: 'monospace',
                margin: 0
              }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 24px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.3px'
            }}
          >
            RELOAD EXTENSION
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
