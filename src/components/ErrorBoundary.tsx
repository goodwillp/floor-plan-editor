import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null

  public state: State = {
    hasError: false,
    retryCount: 0
  }

  public static getDerivedStateFromError(error: Error): State {
    // Check if this is a maximum update depth error
    const isUpdateDepthError = error.message.includes('Maximum update depth exceeded')
    
    return { 
      hasError: true, 
      error,
      retryCount: 0
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      errorInfo
    })

    // For maximum update depth errors, try to recover automatically
    if (error.message.includes('Maximum update depth exceeded') && this.state.retryCount < 3) {
      console.log('Attempting automatic recovery from update depth error...')
      this.retryTimeoutId = window.setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: prevState.retryCount + 1
        }))
      }, 1000)
    }
  }

  public componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    })
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      const isUpdateDepthError = this.state.error?.message.includes('Maximum update depth exceeded')
      const isWebGLError = this.state.error?.message.includes('WebGL')
      
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full bg-background">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {isUpdateDepthError ? 'Rendering Issue Detected' : 
               isWebGLError ? 'Graphics Error' : 
               'Something went wrong'}
            </h2>
            
            <p className="text-muted-foreground mb-4">
              {isUpdateDepthError ? 
                'The application detected a rendering loop. This usually resolves automatically.' :
               isWebGLError ?
                'There was an issue with graphics rendering. This may be due to hardware limitations.' :
                'The application encountered an unexpected error.'}
            </p>
            
            {this.state.retryCount < 3 && (
              <p className="text-sm text-muted-foreground mb-4">
                Retry attempt: {this.state.retryCount + 1}/3
              </p>
            )}
            
            <div className="flex gap-2 justify-center">
              <button 
                onClick={this.handleRetry}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
              >
                Try Again
              </button>
              <button 
                onClick={this.handleRefresh}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Refresh Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}