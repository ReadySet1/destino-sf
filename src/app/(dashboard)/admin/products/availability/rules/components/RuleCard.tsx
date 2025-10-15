'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  Package2,
  Settings2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AvailabilityState, RuleType, type AvailabilityRule } from '@/types/availability';
import {
  getAvailabilityStateColor,
  getAvailabilityStateLabel,
  getRuleTypeLabel,
  getPriorityColor,
} from '@/lib/availability-helpers';

interface ProductInfo {
  id: string;
  name: string;
  category?: {
    name: string;
  };
}

interface RuleCardProps {
  ruleName: string;
  rules: AvailabilityRule[];
  products: Map<string, ProductInfo>;
  onEdit: (rule: AvailabilityRule) => void;
  onDelete: (ruleId: string) => void;
  onToggleEnabled: (rule: AvailabilityRule) => void;
}

export function RuleCard({
  ruleName,
  rules,
  products,
  onEdit,
  onDelete,
  onToggleEnabled,
}: RuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get representative rule (first one) for display
  const primaryRule = rules[0];
  if (!primaryRule) return null;

  // Calculate statistics
  const totalProducts = rules.length;
  const enabledCount = rules.filter(r => r.enabled).length;
  const disabledCount = totalProducts - enabledCount;
  const allEnabled = enabledCount === totalProducts;
  const allDisabled = disabledCount === totalProducts;
  const mixedStatus = !allEnabled && !allDisabled;
  const highPriority = primaryRule.priority >= 70;

  // Get icon based on rule type
  const getRuleIcon = (type: RuleType) => {
    switch (type) {
      case RuleType.DATE_RANGE:
      case RuleType.SEASONAL:
        return <Calendar className="w-4 h-4" />;
      case RuleType.TIME_BASED:
        return <Clock className="w-4 h-4" />;
      case RuleType.INVENTORY:
        return <Package2 className="w-4 h-4" />;
      default:
        return <Settings2 className="w-4 h-4" />;
    }
  };

  // Format schedule display
  const getScheduleDisplay = () => {
    if (primaryRule.ruleType === RuleType.SEASONAL && primaryRule.seasonalConfig) {
      const config = primaryRule.seasonalConfig;
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return `${months[config.startMonth - 1]} ${config.startDay} - ${months[config.endMonth - 1]} ${config.endDay}${config.yearly ? ' (Yearly)' : ''}`;
    }

    if (primaryRule.startDate || primaryRule.endDate) {
      const parts = [];
      if (primaryRule.startDate) {
        parts.push(format(new Date(primaryRule.startDate), 'MMM d, yyyy'));
      }
      if (primaryRule.endDate) {
        parts.push(format(new Date(primaryRule.endDate), 'MMM d, yyyy'));
      }
      return parts.join(' → ');
    }

    return 'Always active';
  };

  // Get visible products (first 3)
  const visibleProducts = rules
    .slice(0, 3)
    .map(r => products.get(r.productId))
    .filter(Boolean);
  const remainingCount = totalProducts - visibleProducts.length;

  return (
    <Card
      className={cn(
        'group hover:shadow-md transition-all duration-200',
        !allEnabled && 'opacity-75'
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Rule Name & Metadata */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{ruleName}</h3>
              {highPriority && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  High Priority
                </Badge>
              )}
            </div>

            {/* Schedule & Type */}
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                {getRuleIcon(primaryRule.ruleType as RuleType)}
                <span>{getRuleTypeLabel(primaryRule.ruleType as RuleType)}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span>{getScheduleDisplay()}</span>
            </div>

            {/* Product Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              {visibleProducts.map(product => (
                <Badge
                  key={product!.id}
                  variant="secondary"
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs"
                >
                  {product!.name}
                </Badge>
              ))}
              {remainingCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs cursor-pointer hover:bg-indigo-100"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  +{remainingCount} more
                </Badge>
              )}
            </div>
          </div>

          {/* Right: State & Actions */}
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-end gap-2">
              {/* State Badge */}
              <Badge
                className={cn(
                  'font-semibold',
                  getAvailabilityStateColor(primaryRule.state as AvailabilityState)
                )}
              >
                {getAvailabilityStateLabel(primaryRule.state as AvailabilityState)}
              </Badge>

              {/* Status Badge */}
              {mixedStatus ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
                >
                  Mixed Status
                </Badge>
              ) : allEnabled ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-green-50 text-green-700 border-green-200"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Enabled
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs bg-gray-50 text-gray-600 border-gray-200"
                >
                  <EyeOff className="w-3 h-3 mr-1" />
                  Disabled
                </Badge>
              )}

              {/* Priority (if not high) */}
              {!highPriority && primaryRule.priority > 0 && (
                <Badge
                  variant="secondary"
                  className={cn('text-xs font-semibold', getPriorityColor(primaryRule.priority))}
                >
                  Priority: {primaryRule.priority}
                </Badge>
              )}
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(primaryRule)} className="cursor-pointer">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Rule
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onToggleEnabled(primaryRule)}
                  className="cursor-pointer"
                >
                  {allEnabled ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Disable All
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Enable All
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => primaryRule.id && onDelete(primaryRule.id)}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Rule
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      {/* Expandable Product List */}
      {totalProducts > 3 && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    All Products ({totalProducts})
                  </span>
                  <span className="text-xs text-gray-500">
                    {enabledCount} enabled · {disabledCount} disabled
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {rules.map(rule => {
                    const product = products.get(rule.productId);
                    if (!product) return null;

                    return (
                      <div
                        key={rule.id}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-md border text-sm',
                          rule.enabled
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{product.name}</p>
                          {product.category && (
                            <p className="text-xs text-gray-500 truncate">
                              {product.category.name}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleEnabled(rule)}
                          className={cn(
                            'ml-2 h-7 px-2',
                            rule.enabled ? 'text-green-600' : 'text-gray-400'
                          )}
                        >
                          {rule.enabled ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
          <div className="px-6 pb-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-xs">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show All Products
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </Collapsible>
      )}
    </Card>
  );
}
