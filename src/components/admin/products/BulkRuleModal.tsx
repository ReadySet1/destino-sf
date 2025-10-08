'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { type AvailabilityRule } from '@/types/availability';

interface RuleAggregation {
  templateRule: AvailabilityRule;
  totalProducts: number;
  enabledProducts: number;
  disabledProducts: number;
  productIds: string[];
}

interface BulkRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProductIds: string[];
  productNames: string[];
  onSuccess?: () => void;
}

export function BulkRuleModal({
  open,
  onOpenChange,
  selectedProductIds,
  productNames,
  onSuccess
}: BulkRuleModalProps) {
  const [ruleAggregations, setRuleAggregations] = useState<RuleAggregation[]>([]);
  const [selectedRuleName, setSelectedRuleName] = useState<string>('');
  const [action, setAction] = useState<'enable' | 'disable'>('enable');
  const [applyToAll, setApplyToAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);

    try {
      // Fetch ALL rules in the system
      const response = await fetch('/api/availability');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch rules');
      }

      const allRules = (data.data || []) as AvailabilityRule[];

      // Group rules by name and aggregate statistics
      const rulesByName = new Map<string, RuleAggregation>();

      for (const rule of allRules) {
        if (!rulesByName.has(rule.name)) {
          rulesByName.set(rule.name, {
            templateRule: rule,
            totalProducts: 0,
            enabledProducts: 0,
            disabledProducts: 0,
            productIds: []
          });
        }

        const aggregation = rulesByName.get(rule.name)!;
        aggregation.totalProducts++;
        aggregation.productIds.push(rule.productId);

        if (rule.enabled) {
          aggregation.enabledProducts++;
        } else {
          aggregation.disabledProducts++;
        }
      }

      const aggregations = Array.from(rulesByName.values());

      // Sort by priority (highest first), then by name
      aggregations.sort((a, b) => {
        const priorityDiff = b.templateRule.priority - a.templateRule.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return a.templateRule.name.localeCompare(b.templateRule.name);
      });

      setRuleAggregations(aggregations);

      // Auto-select first rule if available
      if (aggregations.length > 0 && !selectedRuleName) {
        setSelectedRuleName(aggregations[0].templateRule.name);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load rules';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [selectedRuleName]);

  // Fetch all available rules when modal opens
  useEffect(() => {
    if (open && selectedProductIds.length > 0) {
      fetchRules();
    }
  }, [open, selectedProductIds, fetchRules]);

  const handleApply = async () => {
    if (!selectedRuleName) {
      toast.error('Please select a rule');
      return;
    }

    setApplying(true);

    try {
      const enabled = action === 'enable';
      const aggregation = ruleAggregations.find(
        r => r.templateRule.name === selectedRuleName
      );

      if (!aggregation) {
        throw new Error('Rule not found');
      }

      // Determine which products to target
      const targetProductIds = applyToAll
        ? aggregation.productIds // All products that have this rule
        : selectedProductIds; // Only selected products

      // Use the bulk-apply endpoint
      const response = await fetch('/api/availability/bulk-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateRuleId: aggregation.templateRule.id,
          productIds: targetProductIds,
          enabled
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to apply rule');
      }

      const { created, updated } = data.data;
      const successParts = [];

      if (created > 0) {
        successParts.push(`Created for ${created} product${created !== 1 ? 's' : ''}`);
      }
      if (updated > 0) {
        successParts.push(`Updated ${updated} product${updated !== 1 ? 's' : ''}`);
      }

      const scope = applyToAll ? 'all products' : `${selectedProductIds.length} selected product${selectedProductIds.length !== 1 ? 's' : ''}`;

      toast.success(
        `${enabled ? 'Enabled' : 'Disabled'} "${aggregation.templateRule.name}" for ${scope}: ${successParts.join(', ')}`,
        { duration: 3000 }
      );

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to apply changes';
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  const selectedAggregation = ruleAggregations.find(
    r => r.templateRule.name === selectedRuleName
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Manage Availability Rules</DialogTitle>
          <DialogDescription>
            Apply availability rules to {selectedProductIds.length} selected product
            {selectedProductIds.length !== 1 ? 's' : ''}. Rules will be created for products that don&apos;t have them yet.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : ruleAggregations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <AlertCircle className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              No availability rules found in the system. Create rules first to apply them to products.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Selected Products Preview */}
            <div className="bg-muted/50 rounded-lg p-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Selected Products ({selectedProductIds.length})
              </Label>
              <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                {productNames.slice(0, 5).map((name, idx) => (
                  <div key={idx} className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>
                ))}
                {productNames.length > 5 && (
                  <div className="text-xs text-muted-foreground pl-5">
                    +{productNames.length - 5} more
                  </div>
                )}
              </div>
            </div>

            {/* Rule Selection */}
            <div className="space-y-2">
              <Label htmlFor="rule-select">Select Rule</Label>
              <Select value={selectedRuleName} onValueChange={setSelectedRuleName}>
                <SelectTrigger id="rule-select">
                  <SelectValue placeholder="Choose a rule..." />
                </SelectTrigger>
                <SelectContent>
                  {ruleAggregations.map((agg) => (
                    <SelectItem key={agg.templateRule.name} value={agg.templateRule.name}>
                      <div className="flex items-center gap-2">
                        <span>{agg.templateRule.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({agg.templateRule.ruleType.replace('_', ' ')})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Rule Info with Aggregated Stats */}
              {selectedAggregation && (
                <div className="text-xs bg-muted/30 rounded p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="font-semibold">Type:</span>{' '}
                      {selectedAggregation.templateRule.ruleType.replace('_', ' ')}
                    </div>
                    <div>
                      <span className="font-semibold">State:</span>{' '}
                      {selectedAggregation.templateRule.state.replace('_', ' ')}
                    </div>
                    <div>
                      <span className="font-semibold">Priority:</span>{' '}
                      {selectedAggregation.templateRule.priority}
                    </div>
                    <div>
                      <span className="font-semibold">Total Products:</span>{' '}
                      {selectedAggregation.totalProducts}
                    </div>
                  </div>

                  {/* Status Breakdown */}
                  <div className="border-t pt-2 mt-2">
                    <div className="font-semibold mb-1">Status Across Products:</div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-green-700">
                          {selectedAggregation.enabledProducts} enabled
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-red-700">
                          {selectedAggregation.disabledProducts} disabled
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mixed state warning */}
                  {selectedAggregation.enabledProducts > 0 &&
                    selectedAggregation.disabledProducts > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-yellow-800">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        This rule has mixed states across products
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Action Selection */}
            <div className="space-y-2">
              <Label>Action</Label>
              <RadioGroup value={action} onValueChange={(v) => setAction(v as 'enable' | 'disable')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="enable" id="enable" />
                  <Label htmlFor="enable" className="font-normal cursor-pointer">
                    Enable this rule
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="disable" id="disable" />
                  <Label htmlFor="disable" className="font-normal cursor-pointer">
                    Disable this rule
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Apply to All Option */}
            {selectedAggregation && selectedAggregation.totalProducts > selectedProductIds.length && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="apply-to-all"
                    checked={applyToAll}
                    onCheckedChange={(checked) => setApplyToAll(checked as boolean)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="apply-to-all"
                      className="text-sm font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Apply to ALL {selectedAggregation.totalProducts} products with this rule
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {applyToAll
                        ? `Will ${action} this rule for all ${selectedAggregation.totalProducts} products that have it`
                        : `Will only ${action} for the ${selectedProductIds.length} selected product${selectedProductIds.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={applying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={applying || loading || !selectedRuleName}
          >
            {applying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {applyToAll && selectedAggregation
              ? `Apply to All ${selectedAggregation.totalProducts} Products`
              : `Apply to ${selectedProductIds.length} Selected`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
