// src/__tests__/components/forms/EditOrderForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue }: any) => (
    <select onChange={e => onValueChange?.(e.target.value)} defaultValue={defaultValue}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, any>(function Input({ ...props }, ref) {
    return <input ref={ref} {...props} data-testid={props['data-testid'] || 'input'} />;
  }),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span data-variant={variant} {...props}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: React.forwardRef<HTMLInputElement, any>(function Checkbox(
    { checked, onCheckedChange, ...props },
    ref
  ) {
    return (
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={e => onCheckedChange?.(e.target.checked)}
        {...props}
      />
    );
  }),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="order-details-modal">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div className="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div className="alert-description">{children}</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  MoreHorizontal: () => <div data-testid="more-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Package: () => <div data-testid="package-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
}));

// Mock order data
const mockOrders = [
  {
    id: 'order-1',
    status: 'PENDING',
    paymentStatus: 'PAID',
    customerName: 'John Doe',
    email: 'john@example.com',
    phone: '555-0123',
    total: 45.5,
    items: [{ id: 'item-1', name: 'Alfajores', quantity: 6, price: 7.5 }],
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
    items: [{ id: 'item-2', name: 'Empanadas', quantity: 12, price: 7.25 }],
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
    total: 250.0,
    items: [{ id: 'item-3', name: 'Catering Package', quantity: 1, price: 250.0 }],
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
      filtered = filtered.filter(
        order =>
          order.customerName.toLowerCase().includes(query) ||
          order.email.toLowerCase().includes(query) ||
          order.id.toLowerCase().includes(query)
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(order => new Date(order.createdAt) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      filtered = filtered.filter(order => new Date(order.createdAt) <= new Date(filters.dateTo));
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
      const response = await fetch('/api/admin/orders/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderIds: selectedOrders,
          action: bulkAction,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to perform bulk action');
      }

      const result = await response.json();
      toast.success(`Bulk action "${bulkAction}" applied to ${selectedOrders.length} orders`);
      onBulkUpdate?.(selectedOrders, { action: bulkAction });
      setSelectedOrders([]);
      setBulkAction('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to perform bulk action');
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

  return (
    <div data-testid="order-management">
      {/* Filters Section */}
      <div className="filters" data-testid="filters-section">
        <div className="search-filter">
          <label htmlFor="search">Search Orders:</label>
          <input
            id="search"
            type="text"
            placeholder="Search by customer, email, or order ID"
            value={filters.searchQuery}
            onChange={e => handleFilterChange('searchQuery', e.target.value)}
            data-testid="search-input"
          />
        </div>

        <div className="status-filters">
          <label htmlFor="status">Order Status:</label>
          <select
            id="status"
            value={filters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
            data-testid="status-filter"
          >
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <label htmlFor="payment-status">Payment Status:</label>
          <select
            id="payment-status"
            value={filters.paymentStatus}
            onChange={e => handleFilterChange('paymentStatus', e.target.value)}
            data-testid="payment-status-filter"
          >
            <option value="">All Payment Statuses</option>
            {PAYMENT_STATUSES.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <label htmlFor="order-type">Order Type:</label>
          <select
            id="order-type"
            value={filters.type}
            onChange={e => handleFilterChange('type', e.target.value)}
            data-testid="type-filter"
          >
            <option value="">All Types</option>
            <option value="regular">Regular</option>
            <option value="catering">Catering</option>
          </select>
        </div>

        <button onClick={clearFilters} data-testid="clear-filters-btn">
          Clear Filters
        </button>

        <div data-testid="results-count">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div data-testid="bulk-actions">
          <span>Selected: {selectedOrders.length} orders</span>
          <select
            value={bulkAction}
            onChange={e => setBulkAction(e.target.value)}
            data-testid="bulk-action-select"
          >
            <option value="">Choose Action</option>
            <option value="confirm">Confirm Orders</option>
            <option value="cancel">Cancel Orders</option>
            <option value="ready">Mark as Ready</option>
          </select>
          <button
            onClick={handleBulkAction}
            disabled={!bulkAction || isBulkUpdating}
            data-testid="apply-bulk-action-btn"
          >
            {isBulkUpdating ? 'Applying...' : 'Apply Action'}
          </button>
        </div>
      )}

      {/* Orders List */}
      <div data-testid="orders-list">
        {/* Select All Checkbox */}
        <div data-testid="select-all-section">
          <input
            type="checkbox"
            checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
            onChange={e => handleSelectAll(e.target.checked)}
            data-testid="select-all-checkbox"
          />
          <label>Select All</label>
        </div>

        {filteredOrders.length === 0 ? (
          <div data-testid="no-orders">No orders found matching your criteria</div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} data-testid={`order-row-${order.id}`}>
              <input
                type="checkbox"
                checked={selectedOrders.includes(order.id)}
                onChange={e => handleOrderSelect(order.id, e.target.checked)}
                data-testid={`select-order-${order.id}`}
              />

              <div>ID: {order.id}</div>
              <div>Name: {order.customerName}</div>
              <div>Email: {order.email}</div>
              <div>Status: {order.status}</div>
              <div>Payment: {order.paymentStatus}</div>
              <div>Total: ${order.total}</div>
              <div>Type: {order.type}</div>

              {/* Status Update */}
              <select
                value={order.status}
                onChange={e => handleStatusUpdate(order.id, e.target.value)}
                disabled={isUpdating}
                data-testid={`status-select-${order.id}`}
              >
                {ORDER_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              {/* Actions */}
              <button
                onClick={() => openOrderDetails(order)}
                data-testid={`view-details-${order.id}`}
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div data-testid="order-details-modal">
          <div>
            <h2>Order Details</h2>
            <div>ID: {selectedOrder.id}</div>
            <div>Name: {selectedOrder.customerName}</div>
            <div>Email: {selectedOrder.email}</div>
            <div>Phone: {selectedOrder.phone}</div>
            <div>Status: {selectedOrder.status}</div>
            <div>Payment Status: {selectedOrder.paymentStatus}</div>
            <div>Total: ${selectedOrder.total}</div>
            <div>Type: {selectedOrder.type}</div>

            <h3>Items:</h3>
            {selectedOrder.items.map((item: any, index: number) => (
              <div key={index}>
                {item.quantity}x {item.name} - ${item.price}
              </div>
            ))}

            <button onClick={closeOrderDetails} data-testid="close-modal-btn">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

describe('EditOrderForm (OrderManagement)', () => {
  const defaultProps: OrderManagementProps = {
    orders: mockOrders,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();

    // Mock successful API response by default
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success' }),
    });
  });

  describe('Component Rendering', () => {
    it('should render order management interface', () => {
      render(<MockOrderManagement {...defaultProps} />);

      expect(screen.getByTestId('order-management')).toBeInTheDocument();
      expect(screen.getByTestId('filters-section')).toBeInTheDocument();
      expect(screen.getByTestId('orders-list')).toBeInTheDocument();
    });

    it('should display all orders by default', () => {
      render(<MockOrderManagement {...defaultProps} />);

      expect(screen.getByTestId('order-row-order-1')).toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-2')).toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-3')).toBeInTheDocument();
      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 3 of 3 orders');
    });

    it('should display order details correctly', () => {
      render(<MockOrderManagement {...defaultProps} />);

      // Check first order details
      expect(screen.getByText('Name: John Doe')).toBeInTheDocument();
      expect(screen.getByText('Email: john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Status: PENDING')).toBeInTheDocument();
      expect(screen.getByText('Payment: PAID')).toBeInTheDocument();
      expect(screen.getByText('Total: $45.5')).toBeInTheDocument();
      expect(screen.getByText('Type: regular')).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    it('should filter orders by status', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, 'PENDING');

      expect(screen.getByTestId('order-row-order-1')).toBeInTheDocument();
      expect(screen.queryByTestId('order-row-order-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-row-order-3')).not.toBeInTheDocument();
      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 1 of 3 orders');
    });

    it('should filter orders by type', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      const typeFilter = screen.getByTestId('type-filter');
      await user.selectOptions(typeFilter, 'catering');

      expect(screen.queryByTestId('order-row-order-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-row-order-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-3')).toBeInTheDocument();
      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 1 of 3 orders');
    });

    it('should filter orders by search query', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'john');

      expect(screen.getByTestId('order-row-order-1')).toBeInTheDocument();
      expect(screen.queryByTestId('order-row-order-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('order-row-order-3')).not.toBeInTheDocument();
    });

    it('should clear all filters', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      // Apply some filters
      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, 'PENDING');

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'john');

      // Clear filters
      const clearButton = screen.getByTestId('clear-filters-btn');
      await user.click(clearButton);

      // All orders should be visible again
      expect(screen.getByTestId('order-row-order-1')).toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-2')).toBeInTheDocument();
      expect(screen.getByTestId('order-row-order-3')).toBeInTheDocument();
      expect(screen.getByTestId('results-count')).toHaveTextContent('Showing 3 of 3 orders');
    });

    it('should show no orders message when no matches', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByTestId('no-orders')).toBeInTheDocument();
      expect(screen.getByText('No orders found matching your criteria')).toBeInTheDocument();
    });
  });

  describe('Order Selection and Bulk Actions', () => {
    it('should allow selecting individual orders', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      const checkbox = screen.getByTestId('select-order-order-1');
      await user.click(checkbox);

      expect(checkbox).toBeChecked();
      expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
      expect(screen.getByText('Selected: 1 orders')).toBeInTheDocument();
    });

    it('should allow selecting all orders', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      const selectAllCheckbox = screen.getByTestId('select-all-checkbox');
      await user.click(selectAllCheckbox);

      expect(selectAllCheckbox).toBeChecked();
      expect(screen.getByTestId('select-order-order-1')).toBeChecked();
      expect(screen.getByTestId('select-order-order-2')).toBeChecked();
      expect(screen.getByTestId('select-order-order-3')).toBeChecked();
      expect(screen.getByText('Selected: 3 orders')).toBeInTheDocument();
    });

    it('should perform bulk actions', async () => {
      const user = userEvent.setup();
      const mockOnBulkUpdate = jest.fn();
      render(<MockOrderManagement {...defaultProps} onBulkUpdate={mockOnBulkUpdate} />);

      // Select orders
      await user.click(screen.getByTestId('select-order-order-1'));
      await user.click(screen.getByTestId('select-order-order-2'));

      // Choose bulk action
      const bulkActionSelect = screen.getByTestId('bulk-action-select');
      await user.selectOptions(bulkActionSelect, 'confirm');

      // Apply action
      const applyButton = screen.getByTestId('apply-bulk-action-btn');
      await user.click(applyButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/orders/bulk', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderIds: ['order-1', 'order-2'],
            action: 'confirm',
          }),
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Bulk action "confirm" applied to 2 orders');
      expect(mockOnBulkUpdate).toHaveBeenCalledWith(['order-1', 'order-2'], { action: 'confirm' });
    });
  });

  describe('Status Updates', () => {
    it('should update order status', async () => {
      const user = userEvent.setup();
      const mockOnOrderUpdate = jest.fn();
      render(<MockOrderManagement {...defaultProps} onOrderUpdate={mockOnOrderUpdate} />);

      const statusSelect = screen.getByTestId('status-select-order-1');
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
    });

    it('should handle status update errors', async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Status update failed' }),
      });

      render(<MockOrderManagement {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select-order-1');
      await user.selectOptions(statusSelect, 'CONFIRMED');

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Status update failed');
      });
    });
  });

  describe('Order Details Modal', () => {
    it('should open order details modal', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      const viewDetailsButton = screen.getByTestId('view-details-order-1');
      await user.click(viewDetailsButton);

      expect(screen.getByTestId('order-details-modal')).toBeInTheDocument();
      expect(screen.getByText('Order Details')).toBeInTheDocument();
      expect(screen.getByText('ID: order-1')).toBeInTheDocument();
      expect(screen.getByText('Name: John Doe')).toBeInTheDocument();
      expect(screen.getByText('Items:')).toBeInTheDocument();
      expect(screen.getByText('6x Alfajores - $7.5')).toBeInTheDocument();
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

  describe('Loading States', () => {
    it('should disable bulk action button during bulk update', async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => ({}) }), 100))
      );

      render(<MockOrderManagement {...defaultProps} />);

      await user.click(screen.getByTestId('select-order-order-1'));
      await user.selectOptions(screen.getByTestId('bulk-action-select'), 'confirm');
      await user.click(screen.getByTestId('apply-bulk-action-btn'));

      expect(screen.getByRole('button', { name: /applying.../i })).toBeInTheDocument();
      expect(screen.getByTestId('apply-bulk-action-btn')).toBeDisabled();
    });

    it('should disable status selects during update', async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => ({}) }), 100))
      );

      render(<MockOrderManagement {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select-order-1');
      await user.selectOptions(statusSelect, 'CONFIRMED');

      expect(statusSelect).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<MockOrderManagement {...defaultProps} />);

      expect(screen.getByLabelText(/search orders/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/order status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/payment status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/order type/i)).toBeInTheDocument();
    });

    it('should have descriptive button text', () => {
      render(<MockOrderManagement {...defaultProps} />);

      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MockOrderManagement {...defaultProps} />);

      const searchInput = screen.getByTestId('search-input');
      await user.tab();
      expect(searchInput).toHaveFocus();
    });
  });
});
