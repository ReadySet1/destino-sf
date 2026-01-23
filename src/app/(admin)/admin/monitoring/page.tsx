/**
 * Admin Monitoring Dashboard Page
 *
 * Displays comprehensive system monitoring and health metrics.
 *
 * @see DES-59 Enhanced Sentry Error Tracking
 */

import { Metadata } from 'next';
import { MonitoringDashboard } from '@/components/admin/monitoring/MonitoringDashboard';

export const metadata: Metadata = {
  title: 'System Monitoring | Destino Admin',
  description: 'Real-time system health and performance monitoring',
};

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <MonitoringDashboard />
    </div>
  );
}
