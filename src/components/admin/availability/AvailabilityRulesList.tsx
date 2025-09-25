'use client';

import { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Users,
  Plus,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  AvailabilityState,
  RuleType,
  type AvailabilityRule
} from '@/types/availability';
import { cn } from '@/lib/utils';

interface AvailabilityRulesListProps {
  onEditRule?: (rule: AvailabilityRule) => void;
  onCreateNew?: () => void;
  className?: string;
}

interface ProductInfo {
  id: string;
  name: string;
  category?: {
    name: string;
  };
}

export function AvailabilityRulesList({
  onEditRule,
  onCreateNew,
  className
}: AvailabilityRulesListProps) {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [products, setProducts] = useState<Map<string, ProductInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');

  useEffect(() => {
    loadRulesAndProducts();
  }, []);

  const loadRulesAndProducts = async () => {
    try {
      setLoading(true);
      
      // Load all rules
      const rulesResponse = await fetch('/api/availability');
      if (!rulesResponse.ok) {
        throw new Error('Failed to load rules');
      }
      const rulesData = await rulesResponse.json();
      const rulesArray = rulesData.success ? rulesData.data : [];
      
      // Load products info
      const productsResponse = await fetch('/api/products?onlyActive=false&excludeCatering=true');
      if (!productsResponse.ok) {
        throw new Error('Failed to load products');
      }
      const productsData = await productsResponse.json();
      const productsArray = Array.isArray(productsData) ? productsData : productsData.data || [];
      
      // Create products map for quick lookup
      const productsMap = new Map<string, ProductInfo>();
      productsArray.forEach((product: any) => {
        productsMap.set(product.id, {
          id: product.id,
          name: product.name,
          category: product.category
        });
      });
      
      setRules(rulesArray);
      setProducts(productsMap);
    } catch (error) {
      console.error('Error loading rules and products:', error);
      toast.error('Failed to load availability rules');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/availability/${ruleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      toast.success('Rule deleted successfully');
      loadRulesAndProducts(); // Refresh the list
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const toggleRuleEnabled = async (rule: AvailabilityRule) => {
    try {
      const response = await fetch(`/api/availability/${rule.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...rule,
          enabled: !rule.enabled
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rule');
      }

      toast.success(`Rule ${rule.enabled ? 'disabled' : 'enabled'} successfully`);
      loadRulesAndProducts(); // Refresh the list
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const getStateBadge = (state: AvailabilityState) => {
    const variants = {
      [AvailabilityState.AVAILABLE]: 'bg-green-100 text-green-800',
      [AvailabilityState.PRE_ORDER]: 'bg-blue-100 text-blue-800',
      [AvailabilityState.VIEW_ONLY]: 'bg-yellow-100 text-yellow-800',
      [AvailabilityState.HIDDEN]: 'bg-gray-100 text-gray-800',
      [AvailabilityState.COMING_SOON]: 'bg-purple-100 text-purple-800',
      [AvailabilityState.SOLD_OUT]: 'bg-red-100 text-red-800',
      [AvailabilityState.RESTRICTED]: 'bg-orange-100 text-orange-800'
    } as const;

    return (
      <Badge variant="secondary" className={variants[state] || 'bg-gray-100 text-gray-800'}>
        {state.replace('_', ' ')}
      </Badge>
    );
  };

  const getTypeBadge = (type: RuleType) => {
    const icons = {
      [RuleType.DATE_RANGE]: <Calendar className="h-3 w-3" />,
      [RuleType.SEASONAL]: <Calendar className="h-3 w-3" />,
      [RuleType.TIME_BASED]: <Clock className="h-3 w-3" />,
      [RuleType.INVENTORY]: <Users className="h-3 w-3" />,
      [RuleType.CUSTOM]: <Users className="h-3 w-3" />
    };

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        {icons[type]}
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 90) return 'bg-red-100 text-red-800';
    if (priority >= 70) return 'bg-orange-100 text-orange-800';
    if (priority >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = !searchTerm || 
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      products.get(rule.productId)?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || rule.ruleType === filterType;
    const matchesState = filterState === 'all' || rule.state === filterState;
    
    return matchesSearch && matchesType && matchesState;
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading availability rules...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Availability Rules</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage product availability rules and scheduling
            </p>
          </div>
          {onCreateNew && (
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rules or products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Types</option>
            <option value={RuleType.DATE_RANGE}>Date Range</option>
            <option value={RuleType.SEASONAL}>Seasonal</option>
            <option value={RuleType.TIME_BASED}>Time Based</option>
            <option value={RuleType.INVENTORY}>Inventory</option>
            <option value={RuleType.CUSTOM}>Custom</option>
          </select>
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All States</option>
            <option value={AvailabilityState.AVAILABLE}>Available</option>
            <option value={AvailabilityState.PRE_ORDER}>Pre-Order</option>
            <option value={AvailabilityState.VIEW_ONLY}>View Only</option>
            <option value={AvailabilityState.HIDDEN}>Hidden</option>
            <option value={AvailabilityState.COMING_SOON}>Coming Soon</option>
          </select>
        </div>

        {/* Rules Table */}
        {filteredRules.length === 0 ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {rules.length === 0 ? 'No availability rules found' : 'No rules match your filters'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {rules.length === 0 
                  ? 'Create your first availability rule to get started'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
            </div>
            {rules.length === 0 && onCreateNew && (
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Rule
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => {
                  const product = products.get(rule.productId);
                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">
                        {rule.name}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product?.name || 'Unknown Product'}</div>
                          {product?.category && (
                            <div className="text-sm text-muted-foreground">
                              {product.category.name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(rule.ruleType as RuleType)}
                      </TableCell>
                      <TableCell>
                        {getStateBadge(rule.state as AvailabilityState)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getPriorityBadge(rule.priority || 0)}>
                          {rule.priority || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {rule.startDate && (
                            <div>
                              Start: {format(new Date(rule.startDate), 'MMM d, yyyy')}
                            </div>
                          )}
                          {rule.endDate && (
                            <div>
                              End: {format(new Date(rule.endDate), 'MMM d, yyyy')}
                            </div>
                          )}
                          {!rule.startDate && !rule.endDate && (
                            <span className="text-muted-foreground">No schedule</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRuleEnabled(rule)}
                          className={cn(
                            "flex items-center gap-1",
                            rule.enabled ? "text-green-600" : "text-gray-400"
                          )}
                        >
                          {rule.enabled ? (
                            <>
                              <Eye className="h-3 w-3" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" />
                              Disabled
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {onEditRule && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditRule(rule)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => rule.id && handleDeleteRule(rule.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

