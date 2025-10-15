import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { formatDateTime } from '@/utils/formatting';

interface Alert {
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

interface AlertsListProps {
  alerts: Alert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <div className="text-center">
          <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No alerts at this time</p>
        </div>
      </div>
    );
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertVariant = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return 'danger' as const;
      case 'warning':
        return 'warning' as const;
      case 'info':
        return 'primary' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
          <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <Badge variant={getAlertVariant(alert.type)} className="mb-1">
                {alert.type.toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(alert.timestamp)}
              </span>
            </div>
            <p className="text-sm text-gray-900">{alert.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
