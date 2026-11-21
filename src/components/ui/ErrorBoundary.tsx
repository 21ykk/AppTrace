import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-xl bg-slate-900/90 border border-rose-800/80 text-xs font-mono space-y-4 m-4">
          <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{this.props.fallbackTitle || 'Component Error'}</span>
          </div>
          <p className="text-slate-300 font-sans">
            An unexpected error occurred while rendering this section:
          </p>
          <div className="p-3 bg-slate-950 rounded border border-slate-800 text-rose-300 break-all select-text">
            {this.state.error?.message || 'Unknown render error'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2878D0] hover:bg-[#2063ab] text-white rounded font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Section</span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
