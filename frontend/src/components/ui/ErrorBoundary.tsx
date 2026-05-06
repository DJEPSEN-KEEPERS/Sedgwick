import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <p className="font-display font-semibold text-gray-900 text-sm">Noget gik galt</p>
          <p className="mt-1 text-xs text-gray-500 max-w-xs">{this.state.error?.message}</p>
          <Button size="sm" variant="secondary" className="mt-4" onClick={this.reset}>
            Prøv igen
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
