'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface ImageStats {
  totalUploads: number;
  usedImages: number;
  orphanedImages: number;
  oldOrphanedImages: number;
}

interface CleanupResult {
  success: boolean;
  deletedCount?: number;
  errors?: string[];
  error?: string;
}

export function ImageCleanupPanel() {
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [olderThanMinutes, setOlderThanMinutes] = useState(60);
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/spotlight-picks/cleanup');
      const result = await response.json();
      
      if (result.success && result.stats) {
        setStats(result.stats);
      } else {
        toast.error('Failed to fetch image statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch image statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (olderThanMinutes < 1) {
      toast.error('Please enter a valid number of minutes');
      return;
    }

    setIsCleaningUp(true);
    try {
      const response = await fetch('/api/admin/spotlight-picks/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ olderThanMinutes }),
      });
      
      const result: CleanupResult = await response.json();
      
      if (result.success) {
        const deletedCount = result.deletedCount || 0;
        toast.success(`Cleanup completed! ${deletedCount} images deleted.`);
        setLastCleanup(new Date());
        
        if (result.errors && result.errors.length > 0) {
          toast.warning(`Some errors occurred during cleanup. Check console for details.`);
          console.warn('Cleanup errors:', result.errors);
        }
        
        // Refresh stats
        await fetchStats();
      } else {
        toast.error(result.error || 'Cleanup failed');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error('Failed to perform cleanup');
    } finally {
      setIsCleaningUp(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getOrphanStatus = () => {
    if (!stats) return null;
    
    if (stats.orphanedImages === 0) {
      return { type: 'success', message: 'No orphaned images' };
    } else if (stats.oldOrphanedImages > 0) {
      return { type: 'warning', message: `${stats.oldOrphanedImages} old orphaned images need cleanup` };
    } else {
      return { type: 'info', message: `${stats.orphanedImages} recent orphaned images` };
    }
  };

  const orphanStatus = getOrphanStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Image Cleanup Management
        </CardTitle>
        <CardDescription>
          Monitor and manage orphaned spotlight images that were uploaded but never used.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Statistics */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Image Statistics</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalUploads}</div>
                <div className="text-sm text-blue-700">Total Uploads</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.usedImages}</div>
                <div className="text-sm text-green-700">Used Images</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.orphanedImages}</div>
                <div className="text-sm text-yellow-700">Orphaned Images</div>
              </div>
                             <div className="bg-red-50 p-4 rounded-lg">
                 <div className="text-2xl font-bold text-red-600">{stats.oldOrphanedImages}</div>
                 <div className="text-sm text-red-700">Old Orphaned (&gt;1hr)</div>
               </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className={`h-6 w-6 animate-spin mr-2`} />
              Loading statistics...
            </div>
          )}
        </div>

        {/* Status Alert */}
        {orphanStatus && (
          <Alert>
            {orphanStatus.type === 'success' && <CheckCircle className="h-4 w-4" />}
            {orphanStatus.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
            {orphanStatus.type === 'info' && <Info className="h-4 w-4" />}
            <AlertDescription>{orphanStatus.message}</AlertDescription>
          </Alert>
        )}

        {/* Cleanup Controls */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Manual Cleanup</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="olderThanMinutes">
                Clean up images older than (minutes)
              </Label>
              <Input
                id="olderThanMinutes"
                type="number"
                min="1"
                max="10080"
                value={olderThanMinutes}
                onChange={(e) => setOlderThanMinutes(parseInt(e.target.value) || 60)}
                className="mt-1 max-w-xs"
              />
              <p className="text-sm text-gray-500 mt-1">
                Only images uploaded more than this many minutes ago will be deleted
              </p>
            </div>

            <div className="flex items-center gap-4">
                             <Button
                 onClick={handleCleanup}
                 disabled={isCleaningUp || !stats || stats.orphanedImages === 0}
                 variant={(stats?.oldOrphanedImages || 0) > 0 ? "destructive" : "default"}
               >
                <Trash2 className={`h-4 w-4 mr-2 ${isCleaningUp ? 'animate-pulse' : ''}`} />
                {isCleaningUp ? 'Cleaning up...' : 'Clean Up Orphaned Images'}
              </Button>

              {lastCleanup && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last cleanup: {lastCleanup.toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Information */}
                 <Alert>
           <Info className="h-4 w-4" />
           <AlertDescription>
             <strong>How it works:</strong> When users upload images but don&apos;t save the spotlight pick, 
             those images become &quot;orphaned&quot;. This tool helps you clean them up to save storage space. 
             Images are only deleted if they&apos;re older than the specified time and haven&apos;t been used.
           </AlertDescription>
         </Alert>

      </CardContent>
    </Card>
  );
} 