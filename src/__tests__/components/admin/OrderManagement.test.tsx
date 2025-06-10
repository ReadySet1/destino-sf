import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

// Mock external dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock order data
const mockOrders = [
  {
    id: 'order-1',
    status: 'PENDING',
    paymentStatus: 'PAID',
    customerName: 'John Doe',
    email: 'john@example.com',
    phone: '555-0123',
    total: 45.50,
    items: [
      { id: 'item-1', name: 'Alfajores', quantity: 6, price: 7.50 },
    ],
    createdAt: '2024-01-15T10:00:00Z',
    pickupTime: '2024-01-16T14:00:00Z',
    type: 'regular',
  },
  {
    id: 'order-2',
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    customerName: 'Jane Smith',
    email: 'jane@example.com',
    phone: '555-0456',
    total: 89.25,
    items: [
      { id: 'item-2', name: 'Empanadas', quantity: 12, price: 7.25 },
    ],
    createdAt: '2024-01-14T09:30:00Z',
    pickupTime: '2024-01-15T16:00:00Z',
    type: 'regular',
  },
  {
    id: 'order-3',
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    customerName: 'Bob Wilson',
    email: 'bob@example.com',
    phone: '555-0789',
    total: 250.00,
    items: [
      { id: 'item-3', name: 'Catering Package', quantity: 1, price: 250.00 },
    ],
    createdAt: '2024-01-13T11:15:00Z',
    eventDate: '2024-01-20T18:00:00Z',
    type: 'catering',
  },
];

// Order status options
const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

// Mock OrderManagement component interface
interface OrderManagementProps {
  orders: any[];
  onOrderUpdate?: (order: any) => void;
  onBulkUpdate?: (orderIds: string[], updates: any) => void;
}

// Mock component implementation for testing
const MockOrderManagement: React.FC<OrderManagementProps> = ({
  orders,
  onOrderUpdate,
  onBulkUpdate,
}) => {
  const [filteredOrders, setFilteredOrders] = React.useState(orders);
  const [selectedOrders, setSelectedOrders] = React.useState<string[]>([]);
  const [filters, setFilters] = React.useState({
    status: '',
    paymentStatus: '',
    type: '',
    searchQuery: '',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);
  const [bulkAction, setBulkAction] = React.useState('');

  // Apply filters whenever filters change
  React.useEffect(() => {
    let filtered = [...orders];

    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    if (filters.paymentStatus) {
      filtered = filtered.filter(order => order.paymentStatus === filters.paymentStatus);
    }

    if (filters.type) {
      filtered = filtered.filter(order => order.type === filters.type);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.customerName.toLowerCase().includes(query) ||
        order.email.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query)
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(order => 
        new Date(order.createdAt) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(order => 
        new Date(order.createdAt) <= new Date(filters.dateTo)
      );
    }

    setFilteredOrders(filtered);
  }, [filters, orders]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      paymentStatus: '',
      type: '',
      searchQuery: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const handleOrderSelect = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(filteredOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update order');
      }

      const updatedOrder = await response.json();
      toast.success(`Order ${orderId} status updated to ${newStatus}`);
      onOrderUpdate?.(updatedOrder);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update order');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedOrders.length === 0) return;

    setIsBulkUpdating(true);
    try {
      const updates = { status: bulkAction };
      
      const response = await fetch('/api/admin/orders/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderIds: selectedOrders,
          updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update orders');
      }

      toast.success(`${selectedOrders.length} orders updated successfully`);
      onBulkUpdate?.(selectedOrders, updates);
      setSelectedOrders([]);
      setBulkAction('');
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update orders');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-orange-100 text-orange-800',
      READY: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div data-testid="order-management">
      <div className="mb-6">
        <h2>Order Management</h2>
        <p>Manage and track customer orders</p>
      </div>

      {/* Filters */}
      <div data-testid="order-filters" className="mb-6 p-4 bg-gray-50 rounded space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">All Statuses</option>
              {ORDER_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="payment-filter">Payment Status</label>
            <select
              id="payment-filter"
              value={filters.paymentStatus}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">All Payment Statuses</option>
              {PAYMENT_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="type-filter">Order Type</label>
            <select
              id="type-filter"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">All Types</option>
              <option value="regular">Regular</option>
              <option value="catering">Catering</option>
            </select>
          </div>

          <div>
            <label htmlFor="search-filter">Search</label>
            <input
              id="search-filter"
              type="text"
              placeholder="Customer name, email, or order ID"
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label htmlFor="date-from">From Date</label>
            <input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label htmlFor="date-to">To Date</label>
            <input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            data-testid="clear-filters-btn"
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Clear Filters
          </button>
          <div data-testid="results-count" className="text-sm text-gray-600">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div data-testid="bulk-actions" className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center space-x-4">
            <span>{selectedOrders.length} orders selected</span>
            <select
              data-testid="bulk-action-select"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">Select action</option>
              {ORDER_STATUSES.map(status => (
                <option key={status} value={status}>Set to {status}</option>
              ))}
            </select>
            <button
              data-testid="apply-bulk-action-btn"
              onClick={handleBulkAction}
              disabled={!bulkAction || isBulkUpdating}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {isBulkUpdating ? 'Updating...' : 'Apply'}
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div data-testid="orders-table" className="bg-white rounded shadow overflow-hidden">
        <div className="p-4 border-b">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            <span>Select All</span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Select</th>
                <th className="p-3 text-left">Order ID</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Payment</th>
                <th className="p-3 text-left">Total</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} data-testid={`order-row-${order.id}`} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={(e) => handleOrderSelect(order.id, e.target.checked)}
                    />
                  </td>
                  <td className="p-3 font-mono text-sm">{order.id}</td>
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-sm text-gray-500">{order.email}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                      disabled={isUpdating}
                      className={`px-2 py-1 rounded text-sm ${getStatusColor(order.status)}`}
                    >
                      {ORDER_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{formatCurrency(order.total)}</td>
                  <td className="p-3 text-sm">{formatDate(order.createdAt)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.type === 'catering' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {order.type}
                    </span>
                  </td>
                  <td className="p-3">
                    <button
                      data-testid={`view-details-${order.id}`}
                      onClick={() => openOrderDetails(order)}
                      className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div data-testid="no-orders" className="p-8 text-center text-gray-500">
            No orders found matching your criteria
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div data-testid="order-details-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Order Details</h3>
              <button
                data-testid="close-modal-btn"
                onClick={closeOrderDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Order Information</h4>
                <p>ID: {selectedOrder.id}</p>
                <p>Status: {selectedOrder.status}</p>
                <p>Payment: {selectedOrder.paymentStatus}</p>
                <p>Total: {formatCurrency(selectedOrder.total)}</p>
                <p>Created: {formatDate(selectedOrder.createdAt)}</p>
                {selectedOrder.pickupTime && (
                  <p>Pickup: {formatDate(selectedOrder.pickupTime)}</p>
                )}
                {selectedOrder.eventDate && (
                  <p>Event: {formatDate(selectedOrder.eventDate)}</p>
                )}
              </div>

              <div>
                <h4 className="font-medium">Customer Information</h4>
                <p>Name: {selectedOrder.customerName}</p>
                <p>Email: {selectedOrder.email}</p>
                <p>Phone: {selectedOrder.phone}</p>
              </div>

              <div>
                <h4 className="font-medium">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between border-b pb-2">
                      <span>{item.name} × {item.quantity}</span>
                      <span>{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

describe('OrderManagement', () => {
  const defaultProps: OrderManagementProps = {
    orders: mockOrders,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    
    // Mock successful API response by default
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success', order: mockOrders[0] }),
    });
  });

  describe('Order filtering', () => {
    it('should display all orders by default', () => {
      render(<MockOrderManagement {...defaultProps} />);

      expect(screen.getByTestId('order-row-order-1')).toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-2')).toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-3')).toBeInTheDocument();
      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 3 of 3 orders');
    });

    it('should filter orders by status', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/status/i), 'PENDING');

      expect(screen.getByTestId('order-row-order-1')).toBeInTheDocument();
      expect(screen.queryByTestId('order-row-order-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-row-order-3')).not.toBeInTheDocument();
      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 1 of 3 orders');
    });

    it('should filter orders by type', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      await user.selectOptions(screen.getByLabelText(/order type/i), 'catering');

      expect(screen.queryByTestId('order-row-order-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-row-order-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-3')).toBeInTheDocument();
      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 1 of 3 orders');
    });

    it('should filter orders by search query', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      await user.type(screen.getByLabelText(/search/i), 'john');

      expect(screen.getByTestId('order-row-order-1')).toBeInTheDocument();
      expect(screen.queryByTestId('order-row-order-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-row-order-3')).not.toBeInTheDocument();
    });

    it('should clear all filters', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      // Apply some filters
      await user.selectOptions(screen.getByLabelText(/status/i), 'PENDING');
      await user.type(screen.getByLabelText(/search/i), 'john');

      // Clear filters
      await user.click(screen.getByTestId('clear-filters-btn'));

      // All orders should be visible again
      expect(screen.getByTestId('order-row-order-1')).toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-2')).toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-3')).toBeInTheDocument();
      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 3 of 3 orders');
    });

    it('should show no orders message when no matches', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      await user.type(screen.getByLabelText(/search/i), 'nonexistent');

      expect(screen.getByTestId('no-orders')).toBeInTheDocument();
      expect(screen.getByText('No orders found matching your criteria')).toBeInTheDocument();
    });
  });

  describe('Order status updates', () => {
    it('should update order status via dropdown', async () => {
      const user = userEvent.setup();
      const mockOnUpdate = jest.fn();
      render(<MockOrderManagement {...defaultProps} onOrderUpdate={mockOnUpdate} />);

      const statusSelect = screen.getByDisplayValue('PENDING');
      await user.selectOptions(statusSelect, 'CONFIRMED');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/orders/order-1', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'CONFIRMED' }),
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Order order-1 status updated to CONFIRMED');
      expect(mockOnUpdate).toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Update failed' }),
      });

      render(<MockOrderManagement {...defaultProps} />);

      const statusSelect = screen.getByDisplayValue('PENDING');
      await user.selectOptions(statusSelect, 'CONFIRMED');

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Update failed');
      });
    });
  });

  describe('Order details modal', () => {
    it('should open order details modal when details button is clicked', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      await user.click(screen.getByTestId('view-details-order-1'));

      expect(screen.getByTestId('order-details-modal')).toBeInTheDocument();
      expect(screen.getByText('Order Details')).toBeInTheDocument();
      expect(screen.getByText('ID: order-1')).toBeInTheDocument();
      expect(screen.getByText('Name: John Doe')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      await user.click(screen.getByTestId('view-details-order-1'));
      expect(screen.getByTestId('order-details-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('close-modal-btn'));
      expect(screen.queryByTestId('order-details-modal')).not.toBeInTheDocument();
    });
  });

  describe('Bulk operations', () => {
    it('should show bulk actions when orders are selected', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      // Select first order
      const firstCheckbox = screen.getAllByRole('checkbox')[1]; // Skip "Select All"
      await user.click(firstCheckbox);

      expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
      expect(screen.getByText('1 orders selected')).toBeInTheDocument();
    });

    it('should apply bulk status update', async () => {
      const user = userEvent.setup();
      const mockOnBulkUpdate = jest.fn();
      render(<MockOrderManagement {...defaultProps} onBulkUpdate={mockOnBulkUpdate} />);

      // Select orders
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      // Select bulk action
      await user.selectOptions(screen.getByTestId('bulk-action-select'), 'CONFIRMED');

      // Apply action
      await user.click(screen.getByTestId('apply-bulk-action-btn'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/orders/bulk', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderIds: ['order-1', 'order-2', 'order-3'],
            updates: { status: 'CONFIRMED' },
          }),
        });
      });

      expect(toast.success).toHaveBeenCalledWith('3 orders updated successfully');
      expect(mockOnBulkUpdate).toHaveBeenCalledWith(['order-1', 'order-2', 'order-3'], { status: 'CONFIRMED' });
    });
  });
}); 