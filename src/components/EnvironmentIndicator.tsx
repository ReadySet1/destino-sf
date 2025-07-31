'use client';

/**
 * Environment Indicator Component
 * 
 * Displays current environment status with visual indicators for:
 * - App environment (dev/staging/production)
 * - Infrastructure type (local/cloud/hybrid)
 * - Database connection status
 * - Square payment environment
 * - Service availability
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Database, CreditCard, Cloud, Server, Settings, Info, X } from 'lucide-react';
import { environmentDetection, type EnvironmentConfig } from '@/lib/env-check';

interface EnvironmentIndicatorProps {
  /** Position of the indicator */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Whether to show detailed information */
  showDetails?: boolean;
  /** Whether to show only in development */
  developmentOnly?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Callback when environment info changes */
  onEnvironmentChange?: (env: EnvironmentConfig) => void;
}

/**
 * Badge component for environment status
 */
const EnvironmentBadge: React.FC<{
  label: string;
  value: string;
  status: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
}> = ({ label, value, status, icon }) => {
  const statusColors = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${statusColors[status]}`}>
      {icon && <span className="w-3 h-3">{icon}</span>}
      <span className="font-semibold">{label}:</span>
      <span>{value}</span>
    </div>
  );
};

/**
 * Status indicator for connection/service availability
 */
const StatusIndicator: React.FC<{
  name: string;
  available: boolean;
  description?: string;
}> = ({ name, available, description }) => (
  <div className="flex items-center gap-2 text-xs">
    {available ? (
      <CheckCircle className="w-3 h-3 text-green-500" />
    ) : (
      <AlertTriangle className="w-3 h-3 text-yellow-500" />
    )}
    <span className={available ? 'text-green-700' : 'text-yellow-700'}>
      {name}
    </span>
    {description && (
      <span className="text-gray-500 text-xs">({description})</span>
    )}
  </div>
);

/**
 * Main EnvironmentIndicator component
 */
export const EnvironmentIndicator: React.FC<EnvironmentIndicatorProps> = ({
  position = 'bottom-right',
  showDetails = false,
  developmentOnly = true,
  className = '',
  onEnvironmentChange,
}) => {
  const [environment, setEnvironment] = useState<EnvironmentConfig | null>(null);
  const [expanded, setExpanded] = useState(showDetails);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      const env = environmentDetection.detect();
      setEnvironment(env);
      setError(null);
      onEnvironmentChange?.(env);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect environment');
      setEnvironment(null);
    }
  }, [onEnvironmentChange]);

  // Don't render on server side or if not mounted
  if (!mounted) {
    return null;
  }

  // Hide in production if developmentOnly is true
  if (developmentOnly && environment?.features.isProduction) {
    return null;
  }

  if (error) {
    return (
      <div className={`fixed z-50 ${getPositionClasses(position)} ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 shadow-sm">
          <div className="flex items-center gap-2 text-red-700 text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Environment Error</span>
          </div>
          {expanded && (
            <div className="mt-2 text-xs text-red-600 max-w-xs">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!environment) {
    return null;
  }

  const { app, infra, database, square, features, connections, config, validation } = environment;

  // Determine overall status
  const hasErrors = !validation.isValid;
  const hasWarnings = validation.warnings.length > 0;
  const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'success';

  return (
    <div className={`fixed z-50 ${getPositionClasses(position)} ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-w-sm">
        {/* Header - Always visible */}
        <div 
          className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              overallStatus === 'success' ? 'bg-green-500' : 
              overallStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className="text-xs font-medium text-gray-700">
              {app.charAt(0).toUpperCase() + app.slice(1)}
            </span>
            <span className="text-xs text-gray-500">
              ({infra})
            </span>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            {expanded ? <X className="w-3 h-3" /> : <Info className="w-3 h-3" />}
          </button>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="border-t border-gray-100 p-3 space-y-3">
            {/* Environment Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                <EnvironmentBadge
                  label="App"
                  value={app}
                  status={features.isProduction ? 'error' : features.isDevelopment ? 'info' : 'warning'}
                  icon={<Settings className="w-3 h-3" />}
                />
                <EnvironmentBadge
                  label="Infra"
                  value={infra}
                  status={infra === 'local' ? 'info' : infra === 'cloud' ? 'success' : 'warning'}
                  icon={infra === 'local' ? <Server className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                />
              </div>
              
              <div className="flex flex-wrap gap-1">
                <EnvironmentBadge
                  label="DB"
                  value={database.replace('-', ' ')}
                  status={database.includes('local') ? 'info' : 'success'}
                  icon={<Database className="w-3 h-3" />}
                />
                <EnvironmentBadge
                  label="Square"
                  value={square}
                  status={square === 'sandbox' ? 'warning' : 'success'}
                  icon={<CreditCard className="w-3 h-3" />}
                />
              </div>
            </div>

            {/* Connection Status */}
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Services</div>
              <div className="space-y-1">
                <StatusIndicator
                  name="Database"
                  available={connections.hasLocalDocker || connections.hasSupabaseCloud}
                  description={config.databaseProvider}
                />
                <StatusIndicator
                  name="Square"
                  available={connections.hasSquareSandbox || connections.hasSquareProduction}
                  description={square}
                />
                <StatusIndicator
                  name="Redis"
                  available={connections.hasRedis}
                  description="Caching & Rate Limiting"
                />
                <StatusIndicator
                  name="Shippo"
                  available={connections.hasShippo}
                  description="Shipping"
                />
              </div>
            </div>

            {/* Validation Messages */}
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
              <div>
                <div className="text-xs font-medium text-gray-600 mb-1">Status</div>
                <div className="space-y-1">
                  {validation.errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-1 text-xs text-red-600">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                  {validation.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-1 text-xs text-yellow-600">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Configuration Info */}
            <div>
              <div className="text-xs font-medium text-gray-600 mb-1">Config</div>
              <div className="space-y-1 text-xs text-gray-500">
                <div>API: {config.squareApiHost}</div>
                <div>Base: {config.baseUrl}</div>
                {features.enableDebugLogging && (
                  <div className="text-blue-600">Debug Logging: ON</div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('[Environment Info]', environmentDetection.getInfo(true));
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Log Info
                </button>
                <button
                  onClick={() => {
                    const validation = environmentDetection.validate({
                      requireDatabase: true,
                      requireSquare: true,
                      requireRedis: false,
                      requireShippo: false,
                    });
                    console.log('[Environment Validation]', validation);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Validate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Helper function to get position classes
 */
function getPositionClasses(position: string): string {
  const positions = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };
  return positions[position as keyof typeof positions] || positions['bottom-right'];
}

/**
 * Simplified environment badge for minimal display
 */
export const EnvironmentBadgeSimple: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const [environment, setEnvironment] = useState<EnvironmentConfig | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      try {
        const env = environmentDetection.detect();
        setEnvironment(env);
      } catch {
        setEnvironment(null);
      }
    }
  }, [mounted]);

  if (!mounted || !environment || environment.features.isProduction) {
    return null;
  }

  const { app, square } = environment;
  const badgeColor = app === 'development' ? 'bg-blue-500' : 
                    app === 'staging' ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white ${badgeColor} ${className}`}>
      <span>{app}</span>
      {square === 'sandbox' && (
        <>
          <span>•</span>
          <span>sandbox</span>
        </>
      )}
    </div>
  );
};

export default EnvironmentIndicator;