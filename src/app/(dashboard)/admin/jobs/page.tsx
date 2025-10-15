'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Activity,
  Zap,
  TrendingUp,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface JobStatus {
  isRunning: boolean;
  lastRun: Date | null;
  currentJobId: string | null;
  health: 'healthy' | 'warning' | 'error';
  stats: {
    totalRuns: number;
    successRate: number;
    avgDuration: number;
    lastError?: string;
  };
}

interface JobHistory {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  result?: {
    processed: number;
    updated: number;
    errors: number;
    duration: number;
  };
  error?: string;
}

export default function JobManagementPage() {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobHistory, setJobHistory] = useState<JobHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  // Load job status and history
  const loadJobStatus = async () => {
    try {
      const response = await fetch('/api/admin/jobs/status');
      if (!response.ok) throw new Error('Failed to load job status');

      const data = await response.json();
      setJobStatus(data.status);
    } catch (error) {
      console.error('Error loading job status:', error);
      toast.error('Failed to load job status');
    }
  };

  const loadJobHistory = async () => {
    try {
      const response = await fetch('/api/admin/jobs/history');
      if (!response.ok) throw new Error('Failed to load job history');

      const data = await response.json();
      setJobHistory(data.history || []);
    } catch (error) {
      console.error('Error loading job history:', error);
      toast.error('Failed to load job history');
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadJobStatus(), loadJobHistory()]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadJobStatus();
      loadJobHistory();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Manual job trigger
  const triggerJob = async () => {
    setIsTriggering(true);
    try {
      const response = await fetch('/api/admin/jobs/trigger', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to trigger job');

      const result = await response.json();
      toast.success('Job triggered successfully', {
        description: `Processed ${result.processed} items`,
      });

      // Refresh status after a delay
      setTimeout(() => {
        loadJobStatus();
        loadJobHistory();
      }, 2000);
    } catch (error) {
      console.error('Error triggering job:', error);
      toast.error('Failed to trigger job');
    } finally {
      setIsTriggering(false);
    }
  };

  // Emergency stop
  const emergencyStop = async () => {
    try {
      const response = await fetch('/api/admin/jobs/stop', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to stop job');

      toast.success('Job stopped successfully');
      loadJobStatus();
    } catch (error) {
      console.error('Error stopping job:', error);
      toast.error('Failed to stop job');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          <span className="ml-2">Loading job status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Management</h1>
        <p className="text-base text-gray-600">
          Monitor and manage background jobs for availability processing
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {jobStatus?.isRunning ? (
                  <Activity className="h-8 w-8 text-blue-600" />
                ) : (
                  <Clock className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-lg font-semibold">{jobStatus?.isRunning ? 'Running' : 'Idle'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-lg font-semibold">{jobStatus?.stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Runs</p>
                <p className="text-lg font-semibold">{jobStatus?.stats.totalRuns || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Zap className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                <p className="text-lg font-semibold">
                  {jobStatus?.stats.avgDuration
                    ? `${(jobStatus.stats.avgDuration / 1000).toFixed(1)}s`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Status */}
      {jobStatus && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge
                  variant={
                    jobStatus.health === 'healthy'
                      ? 'default'
                      : jobStatus.health === 'warning'
                        ? 'warning'
                        : 'danger'
                  }
                  className="text-sm"
                >
                  {jobStatus.health === 'healthy' && <CheckCircle className="h-4 w-4 mr-1" />}
                  {jobStatus.health === 'warning' && <AlertTriangle className="h-4 w-4 mr-1" />}
                  {jobStatus.health === 'error' && <AlertTriangle className="h-4 w-4 mr-1" />}
                  {jobStatus.health.charAt(0).toUpperCase() + jobStatus.health.slice(1)}
                </Badge>

                {jobStatus.lastRun && (
                  <span className="text-sm text-gray-600">
                    Last run: {format(new Date(jobStatus.lastRun), 'MMM d, yyyy HH:mm:ss')}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={triggerJob}
                  disabled={jobStatus.isRunning || isTriggering}
                  size="sm"
                >
                  {isTriggering ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Trigger Now
                </Button>

                {jobStatus.isRunning && (
                  <Button onClick={emergencyStop} variant="destructive" size="sm">
                    <Pause className="h-4 w-4 mr-2" />
                    Emergency Stop
                  </Button>
                )}
              </div>
            </div>

            {jobStatus.stats.lastError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Last Error:</strong> {jobStatus.stats.lastError}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Job History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No job history available</p>
            ) : (
              jobHistory.map(job => (
                <div key={job.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          job.status === 'completed'
                            ? 'success'
                            : job.status === 'failed'
                              ? 'danger'
                              : 'outline'
                        }
                      >
                        {job.status === 'completed' && <CheckCircle className="h-4 w-4 mr-1" />}
                        {job.status === 'failed' && <AlertTriangle className="h-4 w-4 mr-1" />}
                        {job.status === 'running' && (
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        )}
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </Badge>

                      <div>
                        <p className="font-medium">Job #{job.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600">
                          Started: {format(new Date(job.startedAt), 'MMM d, HH:mm:ss')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {job.result && (
                        <>
                          <p className="text-sm font-medium">
                            {job.result.processed} processed, {job.result.updated} updated
                          </p>
                          <p className="text-sm text-gray-600">
                            Duration: {(job.result.duration / 1000).toFixed(1)}s
                          </p>
                          {job.result.errors > 0 && (
                            <p className="text-sm text-red-600">{job.result.errors} errors</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {job.error && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      {job.error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
