'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { FormSection } from '@/components/ui/form/FormSection';
import { FormInput } from '@/components/ui/form/FormInput';
import { FormSelect } from '@/components/ui/form/FormSelect';
import { AvailabilityStatusBadge } from '@/components/admin/availability/AvailabilityStatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Calendar as CalendarIcon,
  Save,
  X,
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  AvailabilityState,
  RuleType,
  type AvailabilityRule,
  type BulkAvailabilityRequest,
} from '@/types/availability';
import { bulkUpdateAvailability } from '@/actions/availability';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatting';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  currentAvailabilityState?: AvailabilityState;
  activeRulesCount?: number;
}

interface BulkRuleData {
  name: string;
  ruleType: RuleType;
  state: AvailabilityState;
  startDate?: Date | null;
  endDate?: Date | null;
  priority: number;
  enabled: boolean;
  preOrderMessage?: string;
  viewOnlyMessage?: string;
}

const BulkRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  ruleType: z.nativeEnum(RuleType),
  state: z.nativeEnum(AvailabilityState),
  startDate: z.date().nullable().optional(),
  endDate: z.date().nullable().optional(),
  priority: z.number().min(0),
  enabled: z.boolean(),
  preOrderMessage: z.string().optional(),
  viewOnlyMessage: z.string().optional(),
});

interface AvailabilityBulkManagerProps {
  initialProductIds?: string[];
}

/**
 * Bulk availability editor component
 * Apply rules to multiple products at once
 */
export function AvailabilityBulkManager({ initialProductIds = [] }: AvailabilityBulkManagerProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set(initialProductIds));
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const form = useForm<BulkRuleData>({
    resolver: zodResolver(BulkRuleSchema),
    defaultValues: {
      name: '',
      ruleType: RuleType.DATE_RANGE,
      state: AvailabilityState.AVAILABLE,
      startDate: null,
      endDate: null,
      priority: 0,
      enabled: true,
      preOrderMessage: '',
      viewOnlyMessage: '',
    },
  });

  const { watch, control, handleSubmit, formState: { errors } } = form;
  const selectedState = watch('state');
  const selectedRuleType = watch('ruleType');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const response = await fetch('/api/products?includeAvailabilityEvaluation=true&onlyActive=false&excludeCatering=true');

      if (response.ok) {
        const data = await response.json();
        const productsData = Array.isArray(data) ? data : data.data || [];

        const transformedProducts: Product[] = productsData
          .filter((product: any) => {
            const categoryName = product.category?.name || '';
            return !categoryName.toUpperCase().startsWith('CATERING');
          })
          .map((product: any) => ({
            id: product.id,
            name: product.name,
            price: product.price || 0,
            category: product.category?.name || 'No Category',
            currentAvailabilityState: product.evaluatedAvailability?.currentState || AvailabilityState.AVAILABLE,
            activeRulesCount: product.evaluatedAvailability?.appliedRulesCount || 0,
          }));

        setProducts(transformedProducts);
      } else {
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error loading products');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesAvailability =
      availabilityFilter === 'all' || product.currentAvailabilityState === availabilityFilter;

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category))).sort();

  // Toggle product selection
  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  // Select all filtered
  const selectAllFiltered = () => {
    const allFilteredIds = new Set(filteredProducts.map(p => p.id));
    setSelectedProducts(allFilteredIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  // Submit bulk update
  const onSubmit = async (data: BulkRuleData) => {
    if (selectedProducts.size === 0) {
      toast.error('Please select at least one product');
      return;
    }

    try {
      setIsLoading(true);

      // Build rule data
      const ruleData: Partial<AvailabilityRule> = {
        name: data.name,
        ruleType: data.ruleType,
        state: data.state,
        startDate: data.startDate,
        endDate: data.endDate,
        priority: data.priority,
        enabled: data.enabled,
      };

      // Add state-specific settings
      if (data.state === AvailabilityState.PRE_ORDER && data.preOrderMessage) {
        ruleData.preOrderSettings = {
          message: data.preOrderMessage,
          expectedDeliveryDate: data.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          maxQuantity: null,
          depositRequired: false,
          depositAmount: null,
        };
      }

      if (data.state === AvailabilityState.VIEW_ONLY && data.viewOnlyMessage) {
        ruleData.viewOnlySettings = {
          message: data.viewOnlyMessage,
          showPrice: true,
          allowWishlist: false,
          notifyWhenAvailable: true,
        };
      }

      const bulkRequest: BulkAvailabilityRequest = {
        productIds: Array.from(selectedProducts),
        rules: [ruleData],
        operation: 'create',
        applyToVariants: true,
      };

      const result = await bulkUpdateAvailability(bulkRequest);

      if (result.success) {
        toast.success(`Successfully created availability rules for ${selectedProducts.size} products`);
        router.push('/admin/products/availability/rules');
      } else {
        toast.error(result.error || 'Failed to create bulk rules');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Bulk update error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 mt-8">
      {/* Product Selection */}
      <FormSection
        title="Select Products"
        description="Choose which products to apply the availability rule to"
        icon={<Package className="w-6 h-6" />}
        variant="blue"
      >
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Search Products</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Current Status</Label>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={AvailabilityState.AVAILABLE}>Available</SelectItem>
                <SelectItem value={AvailabilityState.PRE_ORDER}>Pre-Order</SelectItem>
                <SelectItem value={AvailabilityState.VIEW_ONLY}>View Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Selection</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllFiltered}
                disabled={filteredProducts.length === 0}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={selectedProducts.size === 0}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Selection Summary */}
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span>Showing {filteredProducts.length} of {products.length} products</span>
          {selectedProducts.size > 0 && (
            <span className="font-medium text-indigo-600">
              {selectedProducts.size} selected
            </span>
          )}
        </div>

        {/* Products Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p.id))}
                      onCheckedChange={checked => {
                        if (checked) {
                          selectAllFiltered();
                        } else {
                          clearSelection();
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Rules</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingProducts ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <p className="text-sm text-gray-600">Loading products...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map(product => (
                    <TableRow
                      key={product.id}
                      className={cn(
                        'hover:bg-gray-50',
                        selectedProducts.has(product.id) && 'bg-indigo-50/50'
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() => toggleProduct(product.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        {product.currentAvailabilityState && (
                          <AvailabilityStatusBadge state={product.currentAvailabilityState} size="sm" />
                        )}
                      </TableCell>
                      <TableCell>
                        {product.activeRulesCount ? (
                          <Badge variant="outline">
                            {product.activeRulesCount} rule{product.activeRulesCount !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">No rules</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </FormSection>

      {/* Rule Configuration */}
      <FormSection
        title="Rule Configuration"
        description="Configure the availability rule to apply to selected products"
        icon={<Settings className="w-6 h-6" />}
        variant="green"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name *</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="e.g., Holiday Sale Availability"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                )}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    placeholder="0"
                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                  />
                )}
              />
              <p className="text-xs text-gray-500">Higher priority rules override lower priority ones</p>
            </div>
          </div>

          {/* Rule Type and State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <Controller
                name="ruleType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RuleType.DATE_RANGE}>Date Range</SelectItem>
                      <SelectItem value={RuleType.SEASONAL}>Seasonal</SelectItem>
                      <SelectItem value={RuleType.TIME_BASED}>Time Based</SelectItem>
                      <SelectItem value={RuleType.CUSTOM}>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Availability State</Label>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AvailabilityState.AVAILABLE}>Available</SelectItem>
                      <SelectItem value={AvailabilityState.PRE_ORDER}>Pre-Order</SelectItem>
                      <SelectItem value={AvailabilityState.VIEW_ONLY}>View Only</SelectItem>
                      <SelectItem value={AvailabilityState.HIDDEN}>Hidden</SelectItem>
                      <SelectItem value={AvailabilityState.COMING_SOON}>Coming Soon</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Date Range */}
          {selectedRuleType === RuleType.DATE_RANGE && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'PPP') : 'Select start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'PPP') : 'Select end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={date => {
                            const startDate = watch('startDate');
                            return startDate ? date < startDate : false;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
            </div>
          )}

          {/* State-specific Settings */}
          {selectedState === AvailabilityState.PRE_ORDER && (
            <div className="space-y-2">
              <Label>Pre-Order Message</Label>
              <Controller
                name="preOrderMessage"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="e.g., Available for pre-order. Expected delivery in 2 weeks."
                    rows={2}
                  />
                )}
              />
            </div>
          )}

          {selectedState === AvailabilityState.VIEW_ONLY && (
            <div className="space-y-2">
              <Label>View-Only Message</Label>
              <Controller
                name="viewOnlyMessage"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    placeholder="e.g., Currently unavailable for purchase. Check back soon!"
                    rows={2}
                  />
                )}
              />
            </div>
          )}

          {/* Enable Switch */}
          <div className="flex items-center space-x-2">
            <Controller
              name="enabled"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label>Rule enabled</Label>
          </div>

          {/* Preview */}
          {selectedProducts.size > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2 text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                Preview
              </h4>
              <p className="text-sm text-amber-800 mb-2">
                This rule will be applied to {selectedProducts.size} selected product
                {selectedProducts.size !== 1 ? 's' : ''}:
              </p>
              <div className="text-sm space-y-1 text-amber-900">
                <p>
                  <strong>Rule:</strong> {watch('name') || 'Unnamed rule'}
                </p>
                <p>
                  <strong>State:</strong> {watch('state')}
                </p>
                <p>
                  <strong>Type:</strong> {watch('ruleType')}
                </p>
                {watch('startDate') && (
                  <p>
                    <strong>Start:</strong> {format(watch('startDate')!, 'PPP')}
                  </p>
                )}
                {watch('endDate') && (
                  <p>
                    <strong>End:</strong> {format(watch('endDate')!, 'PPP')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedProducts.size > 0 ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Ready to apply to {selectedProducts.size} product
                  {selectedProducts.size !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Select products to continue
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isLoading || selectedProducts.size === 0}
                className="min-w-[180px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Applying Rules...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Apply to {selectedProducts.size} Product{selectedProducts.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </FormSection>
    </div>
  );
}