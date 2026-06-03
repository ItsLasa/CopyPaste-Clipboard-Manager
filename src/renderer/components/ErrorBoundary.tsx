import { Component } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  windowName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[${this.props.windowName ?? 'renderer'}] Uncaught error:`, error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-bg p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm"
          >
            <div className="w-14 h-14 rounded-full bg-danger/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-danger" />
            </div>
            <h1 className="text-lg font-semibold text-fg mb-2">Something went wrong</h1>
            <p className="text-sm text-fg-muted mb-4">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <p className="text-xs text-fg-subtle mb-6">
              The error has been logged. Try refreshing the window.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm rounded-pill hover:bg-accent-hover transition-colors"
            >
              <RefreshCw size={15} /> Reload
            </button>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}
