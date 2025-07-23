'use client';

import { Component, ReactNode } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'section' | 'component';
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, log to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Add your error tracking service here (Sentry, LogRocket, etc.)
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'component' } = this.props;
      const { error } = this.state;

      // Different UI based on error boundary level
      if (level === 'page') {
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  <AlertTriangle className="h-16 w-16 text-red-500" />
                </div>
                <CardTitle>Something went wrong</CardTitle>
                <CardDescription>
                  We&apos;re sorry, but something unexpected happened while loading this page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {process.env.NODE_ENV === 'development' && error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-800 font-mono">{error.message}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <Button onClick={this.handleReload} className="flex-1">
                    Reload Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      if (level === 'section') {
        return (
          <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="font-medium text-red-800">Error in this section</h3>
            </div>
            <p className="text-sm text-red-700 mb-3">
              This section encountered an error and couldn&apos;t load properly.
            </p>
            {process.env.NODE_ENV === 'development' && error && (
              <p className="text-xs text-red-600 font-mono mb-3">{error.message}</p>
            )}
            <Button onClick={this.handleRetry} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-3 w-3" />
              Try Again
            </Button>
          </div>
        );
      }

      // Component level (default)
      return (
        <div className="p-3 border border-yellow-200 bg-yellow-50 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">Component error</span>
            </div>
            <Button
              onClick={this.handleRetry}
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
            >
              Retry
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && error && (
            <p className="text-xs text-yellow-700 mt-2 font-mono">{error.message}</p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenient wrapper components for different levels
export const PageErrorBoundary = ({
  children,
  onError,
}: {
  children: ReactNode;
  onError?: Props['onError'];
}) => (
  <ErrorBoundary level="page" onError={onError}>
    {children}
  </ErrorBoundary>
);

export const SectionErrorBoundary = ({
  children,
  onError,
}: {
  children: ReactNode;
  onError?: Props['onError'];
}) => (
  <ErrorBoundary level="section" onError={onError}>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary = ({
  children,
  onError,
}: {
  children: ReactNode;
  onError?: Props['onError'];
}) => (
  <ErrorBoundary level="component" onError={onError}>
    {children}
  </ErrorBoundary>
);
