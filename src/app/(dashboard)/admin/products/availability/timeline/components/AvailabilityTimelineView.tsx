'use client';

import { useState, useEffect } from 'react';
import { FormSection } from '@/components/ui/form/FormSection';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AvailabilityStatusBadge } from '@/components/admin/availability/AvailabilityStatusBadge';
import { Calendar, Clock, TrendingUp, Filter, Loader2 } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { AvailabilityState, type AvailabilityRule } from '@/types/availability';
import { getRuleTypeLabel, getPriorityColor } from '@/lib/availability-helpers';
import { cn } from '@/lib/utils';

interface ProductInfo {
  id: string;
  name: string;
  category?: {
    name: string;
  };
}

interface TimelineEvent {
  id: string;
  date: Date;
  ruleName: string;
  productName: string;
  state: AvailabilityState;
  type: 'start' | 'end';
  priority: number;
}

/**
 * Timeline view component
 * Shows when rules are active across products
 */
export function AvailabilityTimelineView() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [products, setProducts] = useState<Map<string, ProductInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [productFilter, setProductFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load rules
      const rulesResponse = await fetch('/api/availability');
      if (!rulesResponse.ok) {
        throw new Error('Failed to load rules');
      }
      const rulesData = await rulesResponse.json();
      const rulesArray = rulesData.success ? rulesData.data : [];

      // Load products
      const productsResponse = await fetch('/api/products?onlyActive=false&excludeCatering=true');
      if (!productsResponse.ok) {
        throw new Error('Failed to load products');
      }
      const productsData = await productsResponse.json();
      const productsArray = Array.isArray(productsData) ? productsData : productsData.data || [];

      // Create products map
      const productsMap = new Map<string, ProductInfo>();
      productsArray.forEach((product: any) => {
        productsMap.set(product.id, {
          id: product.id,
          name: product.name,
          category: product.category,
        });
      });

      setRules(rulesArray);
      setProducts(productsMap);
    } catch (error) {
      console.error('Error loading timeline data:', error);
      toast.error('Failed to load timeline data');
    } finally {
      setLoading(false);
    }
  };

  // Generate timeline events
  const timelineEvents: TimelineEvent[] = [];
  const today = startOfDay(new Date());
  const endDate = addDays(today, parseInt(timeRange));

  const filteredRules = rules.filter(rule => {
    if (!rule.enabled) return false;
    if (productFilter !== 'all' && rule.productId !== productFilter) return false;
    return true;
  });

  filteredRules.forEach(rule => {
    if (rule.startDate) {
      const ruleStart = new Date(rule.startDate);
      if (ruleStart >= today && ruleStart <= endDate) {
        const product = products.get(rule.productId);
        timelineEvents.push({
          id: `${rule.id}-start`,
          date: ruleStart,
          ruleName: rule.name,
          productName: product?.name || 'Unknown Product',
          state: rule.state as AvailabilityState,
          type: 'start',
          priority: rule.priority || 0,
        });
      }
    }

    if (rule.endDate) {
      const ruleEnd = new Date(rule.endDate);
      if (ruleEnd >= today && ruleEnd <= endDate) {
        const product = products.get(rule.productId);
        timelineEvents.push({
          id: `${rule.id}-end`,
          date: ruleEnd,
          ruleName: rule.name,
          productName: product?.name || 'Unknown Product',
          state: AvailabilityState.AVAILABLE,
          type: 'end',
          priority: rule.priority || 0,
        });
      }
    }
  });

  // Sort by date
  timelineEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by date
  const eventsByDate = new Map<string, TimelineEvent[]>();
  timelineEvents.forEach(event => {
    const dateKey = format(event.date, 'yyyy-MM-dd');
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey)!.push(event);
  });

  // Get unique products with rules
  const productsWithRules = Array.from(new Set(filteredRules.map(r => r.productId)))
    .map(id => products.get(id)!)
    .filter(Boolean);

  if (loading) {
    return (
      <div className="space-y-8 mt-8">
        <div className="bg-white shadow-sm rounded-xl border p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-8">
      {/* Filters */}
      <FormSection
        title="Timeline Filters"
        description="Configure the timeline view"
        icon={<Filter className="w-6 h-6" />}
        variant="indigo"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Time Range</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="14">Next 14 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
                <SelectItem value="60">Next 60 days</SelectItem>
                <SelectItem value="90">Next 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {productsWithRules.map(product => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      {/* Timeline Events */}
      <FormSection
        title="Upcoming Events"
        description={`Availability rule changes in the next ${timeRange} days`}
        icon={<TrendingUp className="w-6 h-6" />}
        variant="blue"
      >
        {eventsByDate.size === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium text-gray-700 mb-2">No upcoming events</p>
            <p className="text-sm text-gray-500">
              No availability rule changes are scheduled in this time range
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(eventsByDate.entries()).map(([dateKey, events]) => {
              const eventDate = new Date(dateKey);
              const isToday = isSameDay(eventDate, today);

              return (
                <div key={dateKey} className="relative">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={cn(
                        'px-4 py-2 rounded-lg',
                        isToday ? 'bg-indigo-100 text-indigo-900' : 'bg-gray-100 text-gray-700'
                      )}
                    >
                      <div className="font-semibold">{format(eventDate, 'EEEE')}</div>
                      <div className="text-sm">{format(eventDate, 'MMMM d, yyyy')}</div>
                    </div>
                    {isToday && <Badge className="bg-indigo-600 text-white">Today</Badge>}
                  </div>

                  {/* Events */}
                  <div className="ml-4 pl-6 border-l-2 border-gray-200 space-y-4">
                    {events.map(event => (
                      <div
                        key={event.id}
                        className="relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        {/* Timeline dot */}
                        <div className="absolute -left-[29px] top-6 w-4 h-4 rounded-full bg-white border-2 border-indigo-600" />

                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">
                                {event.ruleName}
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn('text-xs', getPriorityColor(event.priority))}
                              >
                                Priority {event.priority}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 mb-2">{event.productName}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                Rule {event.type === 'start' ? 'activates' : 'ends'}:
                              </span>
                              <AvailabilityStatusBadge state={event.state} size="sm" />
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            {event.type === 'start' ? (
                              <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                Starts
                              </div>
                            ) : (
                              <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                Ends
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>

      {/* Summary Stats */}
      <FormSection
        title="Timeline Summary"
        description="Overview of rules in the selected time range"
        icon={<Calendar className="w-6 h-6" />}
        variant="green"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-900 mb-1">{timelineEvents.length}</div>
            <div className="text-sm text-blue-700">Total Events</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-900 mb-1">
              {timelineEvents.filter(e => e.type === 'start').length}
            </div>
            <div className="text-sm text-green-700">Rules Starting</div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {timelineEvents.filter(e => e.type === 'end').length}
            </div>
            <div className="text-sm text-gray-700">Rules Ending</div>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
