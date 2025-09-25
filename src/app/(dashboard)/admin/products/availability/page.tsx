'use client';

import { useState, useEffect } from 'react';
import { Plus, Filter, Download, Upload, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvailabilityForm } from '@/components/admin/availability/AvailabilityForm';
import { AvailabilityTimeline } from '@/components/admin/availability/AvailabilityTimeline';
import { AvailabilityBulkEditor } from '@/components/admin/availability/AvailabilityBulkEditor';
import { AvailabilityRulesList } from '@/components/admin/availability/AvailabilityRulesList';
import { useAvailability } from '@/hooks/useAvailability';
import { 
  getAvailabilityStatistics,
  processPendingChanges 
} from '@/actions/availability';
import { AvailabilityState } from '@/types/availability';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  category?: {
    id: string;
    name: string;
    slug?: string | null;
  };
  categoryId?: string;
  currentAvailabilityState: AvailabilityState;
  activeRulesCount: number;
}

interface Category {
  id: string;
  name: string;
  slug?: string | null;
}

interface AvailabilityStats {
  totalRules: number;
  activeRules: number;
  rulesByType: Record<string, number>;
  rulesByState: Record<string, number>;
}

export default function AvailabilityManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [editingRule, setEditingRule] = useState<any>(null);
  const [stats, setStats] = useState<AvailabilityStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load initial data
  useEffect(() => {
    console.log('🎬 Component useEffect triggered - loading initial data');
    Promise.all([
      loadStats(),
      loadProducts(),
      loadCategories()
    ]).then(() => {
      console.log('✨ All initial data loading completed');
    }).catch((error) => {
      console.error('💥 Error in initial data loading:', error);
    });
  }, []);

  const loadStats = async () => {
    try {
      setIsLoadingStats(true);
      const result = await getAvailabilityStatistics();
      
      if (result.success) {
        setStats(result.data);
      } else {
        toast.error('Failed to load statistics');
      }
    } catch (error) {
      toast.error('Error loading statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/products?includeAvailabilityEvaluation=true&onlyActive=false&excludeCatering=true');
      if (response.ok) {
        const data = await response.json();
        const productsData = Array.isArray(data) ? data : data.data || [];
        
        // Transform products to include availability state from evaluation
        // Also filter out any remaining catering products on the frontend as a safety measure
        console.log('🔍 Raw products received:', productsData.length);
        console.log('🔍 Sample product categories:', productsData.slice(0, 3).map((p: any) => p.category?.name));
        
        const transformedProducts: Product[] = productsData
          .filter((product: any) => {
            const categoryName = product.category?.name || '';
            const shouldKeep = !categoryName.toUpperCase().startsWith('CATERING');
            if (!shouldKeep) {
              console.log('🚫 Filtering out product:', product.name, 'from category:', categoryName);
            }
            return shouldKeep;
          })
          .map((product: any) => ({
            id: product.id,
            name: product.name,
            price: product.price || 0,
            category: product.category,
            categoryId: product.categoryId,
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
    }
  };

  const loadCategories = async () => {
    console.log('🚀 loadCategories function called!');
    try {
      const response = await fetch('/api/categories');
      console.log('📡 Categories API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        const categoriesData = Array.isArray(data) ? data : data.data || [];
        console.log('📦 Raw data from API:', data);
        console.log('📋 CategoriesData length:', categoriesData.length);
        
        // Filter out catering categories from the dropdown
        console.log('🔍 Raw categories received:', categoriesData.map((c: any) => c.name));
        const nonCateringCategories = categoriesData.filter((category: Category) => {
          const categoryName = category.name || '';
          const shouldKeep = !categoryName.toUpperCase().startsWith('CATERING');
          if (!shouldKeep) {
            console.log('🚫 Filtering out:', categoryName);
          }
          return shouldKeep;
        });
        
        console.log('✅ Final categories after filter:', nonCateringCategories.map((c: any) => c.name));
        console.log('📝 Setting categories state with', nonCateringCategories.length, 'items');
        setCategories(nonCateringCategories);
      } else {
        console.error('❌ Categories API failed with status:', response.status);
        toast.error('Failed to load categories');
      }
    } catch (error) {
      console.error('💥 Error loading categories:', error);
      toast.error('Error loading categories');
    } finally {
      console.log('🏁 Categories loading finished, setting isLoadingData to false');
      setIsLoadingData(false);
    }
  };

  const handleProcessPendingChanges = async () => {
    try {
      const result = await processPendingChanges();
      
      if (result.success) {
        toast.success('Pending changes processed successfully');
        loadStats(); // Refresh stats
      } else {
        toast.error(result.error || 'Failed to process pending changes');
      }
    } catch (error) {
      toast.error('Error processing pending changes');
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    setEditingRule(null);
    setSelectedProductId('');
    loadStats(); // Refresh stats
    loadProducts(); // Refresh products
    toast.success(editingRule ? 'Rule updated successfully' : 'Rule created successfully');
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    setSelectedProductId(rule.productId);
    setShowCreateForm(true);
    setActiveTab('rules');
  };

  const handleCancelEdit = () => {
    setShowCreateForm(false);
    setEditingRule(null);
    setSelectedProductId('');
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Paginate filtered products
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (newSearchTerm: string, newCategoryFilter: string) => {
    setSearchTerm(newSearchTerm);
    setCategoryFilter(newCategoryFilter);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Availability Management</h1>
          <p className="text-muted-foreground">
            Manage product availability rules, scheduling, and automation
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleProcessPendingChanges}
          >
            <Settings className="h-4 w-4 mr-2" />
            Process Pending
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rule
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {!isLoadingStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRules}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeRules} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Date Range Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rulesByType.date_range || 0}</div>
              <p className="text-xs text-muted-foreground">Time-based rules</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pre-Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rulesByState.pre_order || 0}</div>
              <p className="text-xs text-muted-foreground">Products in pre-order</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Seasonal Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rulesByType.seasonal || 0}</div>
              <p className="text-xs text-muted-foreground">Seasonal automation</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Editor</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('rules')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Rule
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('bulk')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Update Products
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setActiveTab('timeline')}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  View Timeline
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleProcessPendingChanges}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Process Pending Changes
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Holiday Sale rules created</span>
                    <span className="text-muted-foreground">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Pre-order rules updated</span>
                    <span className="text-muted-foreground">1 day ago</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Seasonal availability processed</span>
                    <span className="text-muted-foreground">2 days ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Products Overview</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="search">Search:</Label>
                  <Input
                    id="search"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => handleFilterChange(e.target.value, categoryFilter)}
                    className="w-[200px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="category">Category:</Label>
                  <Select value={categoryFilter} onValueChange={(value) => handleFilterChange(searchTerm, value)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingData ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading products...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm || categoryFilter !== 'all' 
                      ? `No products match your filters (${searchTerm ? `search: "${searchTerm}"` : ''}${searchTerm && categoryFilter !== 'all' ? ', ' : ''}${categoryFilter !== 'all' ? `category: "${categories.find(c => c.id === categoryFilter)?.name || categoryFilter}"` : ''})` 
                      : 'No products found'
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Total products loaded: {products.length}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Results summary */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-2">
                    <span>
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
                      {filteredProducts.length !== products.length && ` (filtered from ${products.length} total)`}
                    </span>
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>

                  {/* Products list */}
                  <div className="space-y-2">
                    {paginatedProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {product.category?.name || 'No Category'} • ${product.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          product.currentAvailabilityState === AvailabilityState.AVAILABLE && "bg-green-100 text-green-800",
                          product.currentAvailabilityState === AvailabilityState.PRE_ORDER && "bg-blue-100 text-blue-800",
                          product.currentAvailabilityState === AvailabilityState.VIEW_ONLY && "bg-yellow-100 text-yellow-800"
                        )}>
                          {product.currentAvailabilityState.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {product.activeRulesCount} rule{product.activeRulesCount !== 1 ? 's' : ''}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setShowCreateForm(true);
                          }}
                        >
                          Manage
                        </Button>
                      </div>
                    </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => prev - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* Show page numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules">
          {showCreateForm ? (
            <AvailabilityForm
              productId={selectedProductId || '1'}
              rule={editingRule}
              onSuccess={handleCreateSuccess}
              onCancel={handleCancelEdit}
            />
          ) : (
            <AvailabilityRulesList
              onEditRule={handleEditRule}
              onCreateNew={() => setShowCreateForm(true)}
            />
          )}
        </TabsContent>

        {/* Bulk Editor Tab */}
        <TabsContent value="bulk">
          <AvailabilityBulkEditor
            products={products.map(product => ({
              id: product.id,
              name: product.name,
              price: product.price,
              category: product.category?.name || 'No Category',
              currentAvailabilityState: product.currentAvailabilityState,
              activeRulesCount: product.activeRulesCount
            }))}
            onSuccess={() => {
              loadStats();
              loadProducts(); // Refresh products data
              toast.success('Bulk update completed successfully');
            }}
          />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <AvailabilityTimeline
            productId="1"
            rules={[]}
            timeRange={60}
            className="w-full"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
