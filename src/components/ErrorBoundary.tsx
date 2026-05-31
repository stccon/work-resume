import { Component, ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-8">
          <h2 className="text-lg font-semibold mb-2">应用发生了错误</h2>
          <pre className="text-sm text-muted-foreground mb-4 max-w-xl overflow-auto whitespace-pre-wrap border border-border rounded-lg p-4 bg-muted/50">
            {this.state.error.message}
          </pre>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}