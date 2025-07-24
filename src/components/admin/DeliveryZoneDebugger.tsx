'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, X, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface DebugLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

interface DeliveryZoneDebuggerProps {
  className?: string;
}

export default function DeliveryZoneDebugger({ className }: DeliveryZoneDebuggerProps) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Intercept console methods to capture logs
  useEffect(() => {
    if (!isMonitoring) return;

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (type: DebugLog['type'], message: string, data?: any) => {
      const log: DebugLog = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        type,
        message,
        data,
      };

      setLogs(prev => [log, ...prev.slice(0, 49)]); // Keep last 50 logs
    };

    console.log = (...args) => {
      originalLog(...args);
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
      ).join(' ');
      
      if (message.includes('delivery') || message.includes('zone') || message.includes('🔄') || message.includes('✅') || message.includes('❌')) {
        addLog('info', message);
      }
    };

    console.error = (...args) => {
      originalError(...args);
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
      ).join(' ');
      
      if (message.includes('delivery') || message.includes('zone') || message.includes('🔄') || message.includes('✅') || message.includes('❌')) {
        addLog('error', message);
      }
    };

    console.warn = (...args) => {
      originalWarn(...args);
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
      ).join(' ');
      
      if (message.includes('delivery') || message.includes('zone') || message.includes('🔄') || message.includes('✅') || message.includes('❌')) {
        addLog('warning', message);
      }
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [isMonitoring]);

  // Monitor network requests
  useEffect(() => {
    if (!isMonitoring) return;

    const originalFetch = window.fetch;
    let requestId = 0;

    window.fetch = async (...args) => {
      const currentRequestId = ++requestId;
      const [url, options] = args;
      
      // Only monitor delivery zone requests
      if (typeof url === 'string' && url.includes('/api/admin/delivery-zones')) {
        const startTime = Date.now();
        
        setLogs(prev => [{
          id: `req-${currentRequestId}`,
          timestamp: new Date(),
          type: 'info',
          message: `📡 API Request: ${options?.method || 'GET'} ${url}`,
          data: { method: options?.method, url, body: options?.body },
        }, ...prev.slice(0, 49)]);

        try {
          const response = await originalFetch(...args);
          const endTime = Date.now();
          const duration = endTime - startTime;

          const responseClone = response.clone();
          let responseData;
          
          try {
            responseData = await responseClone.json();
          } catch {
            responseData = 'Non-JSON response';
          }

          setLogs(prev => [{
            id: `resp-${currentRequestId}`,
            timestamp: new Date(),
            type: response.ok ? 'success' : 'error',
            message: `📡 API Response: ${response.status} ${response.statusText} (${duration}ms)`,
            data: { status: response.status, duration, data: responseData },
          }, ...prev.slice(0, 49)]);

          return response;
        } catch (error) {
          const endTime = Date.now();
          const duration = endTime - startTime;

          setLogs(prev => [{
            id: `err-${currentRequestId}`,
            timestamp: new Date(),
            type: 'error',
            message: `📡 API Error: ${error instanceof Error ? error.message : 'Unknown error'} (${duration}ms)`,
            data: { error, duration },
          }, ...prev.slice(0, 49)]);

          throw error;
        }
      }

      return originalFetch(...args);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isMonitoring]);

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogIcon = (type: DebugLog['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogBadgeColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Debug Zones
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-96 ${className}`}>
      <Card className="shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Delivery Zone Debugger</CardTitle>
            <div className="flex items-center gap-2">
              <Badge 
                variant={isMonitoring ? "default" : "secondary"}
                className="text-xs"
              >
                {isMonitoring ? 'Monitoring' : 'Paused'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMonitoring(!isMonitoring)}
              className="text-xs"
            >
              {isMonitoring ? 'Pause' : 'Start'} Monitoring
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              className="text-xs"
            >
              Clear Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  {isMonitoring ? 'Waiting for activity...' : 'Monitoring paused'}
                </div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="border rounded p-2 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      {getLogIcon(log.type)}
                      <Badge className={`text-xs ${getLogBadgeColor(log.type)}`}>
                        {log.type.toUpperCase()}
                      </Badge>
                      <span className="text-gray-500">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="font-mono text-xs break-words">
                      {log.message}
                    </div>
                    {log.data && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-gray-600">
                          Data
                        </summary>
                        <pre className="text-xs bg-gray-50 p-1 rounded mt-1 overflow-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 