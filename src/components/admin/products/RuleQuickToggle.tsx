'use client';

import { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Loader2,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Power,
  PowerOff
} from 'lucide-react';
import { toast } from 'sonner';
import { AvailabilityState, type AvailabilityRule } from '@/types/availability';
import { cn } from '@/lib/utils';

interface RuleQuickToggleProps {
  productId: string;
  productName: string;
  currentState?: AvailabilityState;
  rulesCount?: number;
  onRulesUpdated?: () => void;
}

export function RuleQuickToggle({
  productId,
  productName,
  currentState,
  rulesCount = 0,
  onRulesUpdated
}: RuleQuickToggleProps) {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/availability?productId=${productId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch rules');
      }

      setRules(data.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load rules';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Fetch rules when popover opens
  useEffect(() => {
    if (open && rules.length === 0) {
      fetchRules();
    }
  }, [open, rules.length, fetchRules]);

  const toggleRule = async (ruleId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setToggling(ruleId);

    // Optimistic update
    const originalRules = [...rules];
    setRules(rules.map(r => r.id === ruleId ? { ...r, enabled: newEnabled } : r));

    try {
      // Get the full rule to send complete data
      const ruleToUpdate = rules.find(r => r.id === ruleId);
      if (!ruleToUpdate) {
        throw new Error('Rule not found');
      }

      const response = await fetch(`/api/availability/${ruleId}?skipValidation=true`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ruleToUpdate,
          enabled: newEnabled
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update rule');
      }

      // Update with server response
      setRules(rules.map(r => r.id === ruleId ? data.data : r));

      toast.success(
        `Rule "${ruleToUpdate.name}" ${newEnabled ? 'enabled' : 'disabled'}`,
        { duration: 2000 }
      );

      // Notify parent to refresh product list
      onRulesUpdated?.();
    } catch (err) {
      // Revert optimistic update
      setRules(originalRules);
      const message = err instanceof Error ? err.message : 'Failed to update rule';
      toast.error(message);
    } finally {
      setToggling(null);
    }
  };

  const toggleAllRules = async (enabled: boolean) => {
    if (rules.length === 0) return;

    const originalRules = [...rules];
    setToggling('bulk');

    // Optimistic update
    setRules(rules.map(r => ({ ...r, enabled })));

    try {
      const promises = rules.map(rule =>
        fetch(`/api/availability/${rule.id}?skipValidation=true`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...rule,
            enabled
          })
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        throw new Error(`Failed to update ${failed.length} rule(s)`);
      }

      toast.success(
        `${enabled ? 'Enabled' : 'Disabled'} all ${rules.length} rule(s)`,
        { duration: 2000 }
      );

      onRulesUpdated?.();
    } catch (err) {
      setRules(originalRules);
      const message = err instanceof Error ? err.message : 'Failed to update rules';
      toast.error(message);
    } finally {
      setToggling(null);
    }
  };

  const getStateBadgeColor = (state: AvailabilityState) => {
    switch (state) {
      case AvailabilityState.AVAILABLE:
        return 'bg-green-100 text-green-800';
      case AvailabilityState.PRE_ORDER:
        return 'bg-blue-100 text-blue-800';
      case AvailabilityState.VIEW_ONLY:
        return 'bg-yellow-100 text-yellow-800';
      case AvailabilityState.HIDDEN:
        return 'bg-gray-100 text-gray-800';
      case AvailabilityState.COMING_SOON:
        return 'bg-purple-100 text-purple-800';
      case AvailabilityState.SOLD_OUT:
        return 'bg-red-100 text-red-800';
      case AvailabilityState.RESTRICTED:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const enabledCount = rules.filter(r => r.enabled).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 hover:bg-transparent"
        >
          <div className="flex flex-wrap gap-1">
            {currentState && (
              <Badge
                variant="outline"
                className={cn("text-xs font-semibold", getStateBadgeColor(currentState))}
              >
                {currentState.replace('_', ' ')}
              </Badge>
            )}
            {rulesCount > 0 && (
              <Badge
                variant="outline"
                className="text-xs font-semibold bg-indigo-100 text-indigo-800 cursor-pointer hover:bg-indigo-200"
              >
                <Settings className="w-3 h-3 mr-1" />
                {rulesCount} rule{rulesCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96" align="start">
        <div className="space-y-3">
          {/* Header */}
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Availability Rules</h4>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {productName}
            </p>
          </div>

          <Separator />

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="text-xs text-red-800">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchRules}
                  className="h-7 text-xs"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Rules List */}
          {!loading && !error && rules.length > 0 && (
            <>
              {/* Quick Actions */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {enabledCount} of {rules.length} enabled
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleAllRules(true)}
                    disabled={toggling !== null || enabledCount === rules.length}
                    className="h-7 text-xs"
                  >
                    {toggling === 'bulk' ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Power className="w-3 h-3 mr-1" />
                    )}
                    Enable All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleAllRules(false)}
                    disabled={toggling !== null || enabledCount === 0}
                    className="h-7 text-xs"
                  >
                    {toggling === 'bulk' ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <PowerOff className="w-3 h-3 mr-1" />
                    )}
                    Disable All
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Rules */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-lg border transition-colors",
                      rule.enabled
                        ? "bg-indigo-50/50 border-indigo-200"
                        : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {rule.name}
                        </p>
                        {rule.enabled ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {rule.ruleType.replace('_', ' ')}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getStateBadgeColor(rule.state))}
                        >
                          {rule.state.replace('_', ' ')}
                        </Badge>
                        {rule.priority > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Priority: {rule.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id!, rule.enabled)}
                      disabled={toggling !== null}
                      className="flex-shrink-0"
                    />
                  </div>
                ))}
              </div>

              <Separator />

              {/* Footer Link */}
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center text-xs"
                asChild
              >
                <a href={`/admin/products/availability?productId=${productId}`} target="_blank">
                  Manage All Rules
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </>
          )}

          {/* Empty State */}
          {!loading && !error && rules.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <Settings className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No availability rules configured
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                asChild
              >
                <a href={`/admin/products/availability?productId=${productId}`} target="_blank">
                  Create Rule
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
