import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class GoogleMapsErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Google Maps Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center h-full bg-amber-50 p-4">
            <div className="text-center">
              <p className="text-red-500 font-quicksand mb-2">
                Unable to load map
              </p>
              <p className="text-sm text-amber-700">
                Please try refreshing the page
              </p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default GoogleMapsErrorBoundary; 