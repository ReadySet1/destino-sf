'use client';

import { useState, useMemo } from 'react';
import { format, addDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { Calendar, Clock, AlertTriangle, Eye, ShoppingCart, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AvailabilityState, 
  type AvailabilityRule, 
  type AvailabilityEvaluation 
} from '@/types/availability';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  date: Date;
  state: AvailabilityState;
  rule: AvailabilityRule;
  type: 'start' | 'end' | 'change';
  description: string;
}

interface AvailabilityTimelineProps {
  productId: string;
  rules: AvailabilityRule[];
  evaluation?: AvailabilityEvaluation;
  className?: string;
  timeRange?: number; // Days to show from today
}

export function AvailabilityTimeline({
  productId,
  rules,
  evaluation,
  className,
  timeRange = 30
}: AvailabilityTimelineProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');

  // Generate timeline events from rules
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    const today = startOfDay(new Date());
    const endDate = addDays(today, timeRange);

    rules.forEach((rule) => {
      if (!rule.enabled) return;

      // Handle date range rules
      if (rule.startDate && rule.endDate) {
        const ruleStart = new Date(rule.startDate);
        const ruleEnd = new Date(rule.endDate);

        if (ruleStart >= today && ruleStart <= endDate) {
          events.push({
            id: `${rule.id}-start`,
            date: ruleStart,
            state: rule.state as AvailabilityState,
            rule,
            type: 'start',
            description: `${rule.name} begins`
          });
        }

        if (ruleEnd >= today && ruleEnd <= endDate) {
          events.push({
            id: `${rule.id}-end`,
            date: ruleEnd,
            state: AvailabilityState.AVAILABLE, // Default state after rule ends
            rule,
            type: 'end',
            description: `${rule.name} ends`
          });
        }
      }

      // Handle seasonal rules (simplified for current year)
      if (rule.seasonalConfig && rule.ruleType === 'seasonal') {
        const { startMonth, startDay, endMonth, endDay } = rule.seasonalConfig;
        const currentYear = new Date().getFullYear();
        
        const seasonStart = new Date(currentYear, startMonth - 1, startDay);
        const seasonEnd = new Date(currentYear, endMonth - 1, endDay);

        if (seasonStart >= today && seasonStart <= endDate) {
          events.push({
            id: `${rule.id}-season-start`,
            date: seasonStart,
            state: rule.state as AvailabilityState,
            rule,
            type: 'start',
            description: `${rule.name} season begins`
          });
        }

        if (seasonEnd >= today && seasonEnd <= endDate) {
          events.push({
            id: `${rule.id}-season-end`,
            date: seasonEnd,
            state: AvailabilityState.AVAILABLE,
            rule,
            type: 'end',
            description: `${rule.name} season ends`
          });
        }
      }
    });

    // Sort events by date, then by priority
    return events.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return (b.rule.priority || 0) - (a.rule.priority || 0);
    });
  }, [rules, timeRange]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, TimelineEvent[]>();
    
    timelineEvents.forEach((event) => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });

    return grouped;
  }, [timelineEvents]);

  // Get state badge variant and icon
  const getStateBadge = (state: AvailabilityState) => {
    switch (state) {
      case AvailabilityState.AVAILABLE:
        return {
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: ShoppingCart,
          label: 'Available'
        };
      case AvailabilityState.PRE_ORDER:
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Package,
          label: 'Pre-Order'
        };
      case AvailabilityState.VIEW_ONLY:
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Eye,
          label: 'View Only'
        };
      case AvailabilityState.HIDDEN:
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Eye,
          label: 'Hidden'
        };
      case AvailabilityState.COMING_SOON:
        return {
          variant: 'secondary' as const,
          className: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Clock,
          label: 'Coming Soon'
        };
      default:
        return {
          variant: 'outline' as const,
          className: '',
          icon: AlertTriangle,
          label: state
        };
    }
  };

  const renderTimelineView = () => (
    <ScrollArea className="h-[400px] w-full">
      <div className="space-y-4 p-4">
        {timelineEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No availability changes scheduled in the next {timeRange} days</p>
          </div>
        ) : (
          Array.from(eventsByDate.entries()).map(([dateKey, events]) => {
            const date = new Date(dateKey);
            const isToday = isSameDay(date, new Date());
            
            return (
              <div key={dateKey} className="relative">
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                    isToday 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Calendar className="h-4 w-4" />
                    {format(date, 'MMM d, yyyy')}
                    {isToday && <span className="text-xs">(Today)</span>}
                  </div>
                </div>

                {/* Events for this date */}
                <div className="space-y-2 ml-6">
                  {events.map((event) => {
                    const badge = getStateBadge(event.state);
                    const Icon = badge.icon;

                    return (
                      <TooltipProvider key={event.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                              <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-full",
                                event.type === 'start' ? 'bg-green-100 text-green-600' :
                                event.type === 'end' ? 'bg-red-100 text-red-600' :
                                'bg-blue-100 text-blue-600'
                              )}>
                                <Icon className="h-4 w-4" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {event.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Rule: {event.rule.name} (Priority: {event.rule.priority})
                                </p>
                              </div>

                              <Badge 
                                variant={badge.variant}
                                className={badge.className}
                              >
                                {badge.label}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-medium">{event.rule.name}</p>
                              <p className="text-xs">Type: {event.rule.ruleType}</p>
                              <p className="text-xs">Priority: {event.rule.priority}</p>
                              {event.rule.startDate && (
                                <p className="text-xs">
                                  Active: {format(new Date(event.rule.startDate), 'MMM d')} - {' '}
                                  {event.rule.endDate ? format(new Date(event.rule.endDate), 'MMM d') : 'Ongoing'}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );

  const renderCalendarView = () => (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: timeRange }, (_, i) => {
          const date = addDays(new Date(), i);
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isToday = isSameDay(date, new Date());
          
          return (
            <div
              key={dateKey}
              className={cn(
                "p-2 min-h-[60px] border rounded cursor-pointer transition-colors",
                isToday ? "bg-primary/10 border-primary" : "hover:bg-muted",
                selectedDate && isSameDay(selectedDate, date) ? "ring-2 ring-primary" : ""
              )}
              onClick={() => setSelectedDate(date)}
            >
              <div className="text-sm font-medium mb-1">
                {format(date, 'd')}
              </div>
              
              {dayEvents.slice(0, 2).map((event) => {
                const badge = getStateBadge(event.state);
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "w-2 h-2 rounded-full mb-1",
                      event.type === 'start' ? 'bg-green-500' :
                      event.type === 'end' ? 'bg-red-500' :
                      'bg-blue-500'
                    )}
                  />
                );
              })}
              
              {dayEvents.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{dayEvents.length - 2}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="mt-4 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium mb-2">
            {format(selectedDate, 'MMMM d, yyyy')}
          </h4>
          
          {(() => {
            const dateKey = format(selectedDate, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateKey) || [];
            
            if (dayEvents.length === 0) {
              return <p className="text-sm text-muted-foreground">No events scheduled</p>;
            }
            
            return (
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const badge = getStateBadge(event.state);
                  const Icon = badge.icon;
                  
                  return (
                    <div key={event.id} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{event.description}</span>
                      <Badge variant={badge.variant} className={badge.className}>
                        {badge.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Availability Timeline
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('timeline')}
            >
              Timeline
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              Calendar
            </Button>
          </div>
        </div>

        {evaluation?.currentState && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current state:</span>
            {(() => {
              const badge = getStateBadge(evaluation.currentState);
              return (
                <Badge variant={badge.variant} className={badge.className}>
                  {badge.label}
                </Badge>
              );
            })()}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {viewMode === 'timeline' ? renderTimelineView() : renderCalendarView()}
      </CardContent>
    </Card>
  );
}
