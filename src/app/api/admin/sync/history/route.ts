import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check admin access
    const profile = await prisma.profile.findUnique({
      where: { id: user.id },
      select: { role: true, name: true, email: true }
    });

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 results
    const status = searchParams.get('status');
    const days = parseInt(searchParams.get('days') || '30'); // Last 30 days by default

    // 4. Build query filters
    const where: any = {
      userId: user.id
    };

    // Filter by status if provided
    if (status && ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }

    // Filter by date range
    if (days > 0) {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);
      where.startTime = {
        gte: dateLimit
      };
    }

    // 5. Fetch sync history
    const syncHistory = await prisma.userSyncLog.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: limit,
      select: {
        id: true,
        syncId: true,
        status: true,
        startTime: true,
        endTime: true,
        progress: true,
        message: true,
        currentStep: true,
        results: true,
        errors: true,
        options: true,
        startedBy: true
      }
    });

    // 6. Calculate summary statistics
    const totalSyncs = await prisma.userSyncLog.count({
      where: { userId: user.id }
    });

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const recentStats = await prisma.userSyncLog.groupBy({
      by: ['status'],
      where: {
        userId: user.id,
        startTime: {
          gte: last7Days
        }
      },
      _count: {
        status: true
      }
    });

    // 7. Format history with additional calculated fields
    const formattedHistory = syncHistory.map(sync => {
      const duration = sync.endTime 
        ? Math.round((sync.endTime.getTime() - sync.startTime.getTime()) / 1000)
        : null;

      // Extract summary data from results
      const summary = sync.results && typeof sync.results === 'object' && sync.results !== null ? {
        syncedProducts: (sync.results as any).syncedProducts || 0,
        skippedProducts: (sync.results as any).skippedProducts || 0,
        warnings: (sync.results as any).warnings || 0,
        errors: (sync.results as any).errors || 0
      } : null;

      return {
        syncId: sync.syncId,
        status: sync.status,
        startTime: sync.startTime,
        endTime: sync.endTime,
        duration,
        progress: sync.progress,
        message: sync.message,
        currentStep: sync.currentStep,
        startedBy: sync.startedBy,
        summary,
        options: sync.options,
        
        // Include full results and errors for completed/failed syncs
        ...(sync.status === 'COMPLETED' && sync.results && { results: sync.results }),
        ...(sync.status === 'FAILED' && sync.errors && { errors: sync.errors })
      };
    });

    // 8. Build response with statistics
    const stats = {
      total: totalSyncs,
      last7Days: {
        completed: recentStats.find(s => s.status === 'COMPLETED')?._count?.status || 0,
        failed: recentStats.find(s => s.status === 'FAILED')?._count?.status || 0,
        cancelled: recentStats.find(s => s.status === 'CANCELLED')?._count?.status || 0,
        running: recentStats.find(s => s.status === 'RUNNING')?._count?.status || 0,
        pending: recentStats.find(s => s.status === 'PENDING')?._count?.status || 0
      }
    };

    return NextResponse.json({
      history: formattedHistory,
      stats,
      pagination: {
        limit,
        returned: formattedHistory.length,
        hasMore: formattedHistory.length === limit
      },
      filters: {
        status: status || 'all',
        days,
        userId: user.id
      }
    });

  } catch (error) {
    logger.error('Error fetching sync history:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to fetch sync history. Please try again.'
    }, { status: 500 });
  }
} 