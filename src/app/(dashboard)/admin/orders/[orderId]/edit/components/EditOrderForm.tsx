'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createManualOrder } from '@/app/(dashboard)/admin/orders/manual/actions';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Helper function to safely format price
const convertDecimalToNumber = (decimal: unknown): number => {
  // Check if it's already a number
  if (typeof decimal === 'number') {
    return isNaN(decimal) ? 0 : decimal;
  }
  // Check if it looks like a Decimal object (has toFixed method)
  if (decimal !== null && typeof decimal === 'object' && 'toFixed' in decimal && typeof decimal.toFixed === 'function') {
    // Convert Decimal to string, then parse as float
    const num = parseFloat(decimal.toFixed());
    return isNaN(num) ? 0 : num;
  }
   // Check if it's a string representation of a number
   if (typeof decimal === 'string') {
     const num = parseFloat(decimal);
     return isNaN(num) ? 0 : num;
   }
  // Default to 0 if it's none of the above or conversion failed
  return 0;
};

// Define our own PaymentMethod enum to match the Prisma schema
enum PaymentMethod {
  SQUARE = "SQUARE",
  VENMO = "VENMO",
  CASH = "CASH"
}

// Helper function to safely format price
const formatPrice = (price: any): string => {
  // Handle null or undefined
  if (price === null || price === undefined) return '0.00';
  
  // If it's already a number, format it
  if (typeof price === 'number') return price.toFixed(2);
  
  // If it's a string that can be parsed as a number
  if (typeof price === 'string') {
    const parsedPrice = parseFloat(price);
    return isNaN(parsedPrice) ? '0.00' : parsedPrice.toFixed(2);
  }
  
  // For objects (like Decimal) try to convert to number
  if (typeof price === 'object') {
    try {
      // If it has a toNumber method (Prisma Decimal)
      if (typeof price.toNumber === 'function') {
        return price.toNumber().toFixed(2);
      }
      
      // If it has a toString method
      if (typeof price.toString === 'function') {
        const parsedPrice = parseFloat(price.toString());
        return isNaN(parsedPrice) ? '0.00' : parsedPrice.toFixed(2);
      }
    } catch (e) {
      console.error('Error formatting price:', e);
    }
  }
  
  // Fallback
  return '0.00';
};

// Types
type ProductWithVariants = {
  id: string;
  name: string;
  price: number;
  variants: {
    id: string;
    name: string;
    price: number | null;
  }[];
};

type OrderItem = {
  id?: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  productName: string;
  variantName: string | null;
};

type FormState = {
  customerName: string;
  email: string;
  phone: string;
  fulfillmentType: string;
  pickupTime: string;
  notes: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  items: OrderItem[];
  existingOrderId: string;
};

type Order = {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  fulfillmentType: string | null;
  pickupTime: string | null;
  notes: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  total: string | number;
  items: OrderItem[];
  [key: string]: any;
};

interface EditOrderFormProps {
  initialOrder: Order;
}

export function EditOrderForm({ initialOrder }: EditOrderFormProps) {
  const router = useRouter();
  
  // Initialize form with the existing order data
  const [formState, setFormState] = useState<FormState>({
    customerName: initialOrder.customerName,
    email: initialOrder.email,
    phone: initialOrder.phone,
    fulfillmentType: initialOrder.fulfillmentType || 'pickup',
    pickupTime: initialOrder.pickupTime || '',
    notes: initialOrder.notes || '',
    paymentMethod: initialOrder.paymentMethod,
    paymentStatus: initialOrder.paymentStatus,
    status: initialOrder.status,
    items: initialOrder.items.map(item => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: typeof item.price === 'string' ? parseFloat(item.price) : (item.price || 0),
      productName: item.productName,
      variantName: item.variantName,
    })),
    existingOrderId: initialOrder.id,
  });
  
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/products?includeVariants=true');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please refresh and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle product selection
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    setSelectedProduct(productId);
    setSelectedVariant('');
    
    // Set default price from the selected product
    if (productId) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setPrice(product.price);
      }
    } else {
      setPrice(0);
    }
  };

  // Handle variant selection
  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const variantId = e.target.value;
    setSelectedVariant(variantId);
    
    // Update price if variant has custom price
    if (variantId) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        const variant = product.variants.find(v => v.id === variantId);
        if (variant && variant.price !== null) {
          setPrice(variant.price);
        } else {
          setPrice(product.price);
        }
      }
    }
  };

  // Add item to order
  const addItem = () => {
    if (!selectedProduct) return;
    
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    
    let variantName: string | null = null;
    if (selectedVariant) {
      const variant = product.variants.find(v => v.id === selectedVariant);
      variantName = variant ? variant.name : null;
    }
    
    // Ensure price is a number
    const itemPrice = typeof price === 'number' ? price : 
                     (typeof price === 'string' ? parseFloat(price) || 0 : 0);
    
    const newItem: OrderItem = {
      productId: selectedProduct,
      variantId: selectedVariant || null,
      quantity,
      price: itemPrice,
      productName: product.name,
      variantName,
    };
    
    setFormState(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    // Reset item selection
    setSelectedProduct('');
    setSelectedVariant('');
    setQuantity(1);
    setPrice(0);
  };
  
  // Remove item from order
  const removeItem = (index: number) => {
    setFormState(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Calculate order total
  const orderTotal = formState.items.reduce(
    (total, item) => {
      // Ensure both price and quantity are treated as numbers
      const itemPrice = typeof item.price === 'number' ? item.price : 
                        (typeof item.price === 'string' ? parseFloat(item.price) || 0 : 0);
      const itemQuantity = typeof item.quantity === 'number' ? item.quantity : 
                          (typeof item.quantity === 'string' ? parseInt(item.quantity) || 0 : 0);
      return total + (itemPrice * itemQuantity);
    },
    0
  );

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Validation
      if (formState.items.length === 0) {
        throw new Error('Please add at least one item to the order');
      }
      
      if (!formState.customerName || !formState.email || !formState.phone) {
        throw new Error('Please fill in all required customer information');
      }
      
      // Submit the order update
      const result = await createManualOrder({
        ...formState,
        total: orderTotal,
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setSuccess(`Order ${result.orderId} updated successfully!`);
      
      // Navigate back to the order details after success
      setTimeout(() => {
        router.push(`/admin/orders/${result.orderId}`);
      }, 1500);
      
    } catch (err) {
      console.error('Error updating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle cancel button
  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Customer Information */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                id="customerName"
                name="customerName"
                value={formState.customerName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formState.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formState.phone}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fulfillmentType" className="block text-sm font-medium text-gray-700 mb-1">
                Fulfillment Type
              </label>
              <select
                id="fulfillmentType"
                name="fulfillmentType"
                value={formState.fulfillmentType}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="pickup">Pickup</option>
                <option value="local_delivery">Local Delivery</option>
                <option value="nationwide_shipping">Nationwide Shipping</option>
              </select>
            </div>
            <div>
              <label htmlFor="pickupTime" className="block text-sm font-medium text-gray-700 mb-1">
                Pickup/Delivery Time
              </label>
              <input
                type="datetime-local"
                id="pickupTime"
                name="pickupTime"
                value={formState.pickupTime}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Order Status
              </label>
              <select
                id="status"
                name="status"
                value={formState.status}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {Object.values(OrderStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Order Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formState.notes}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                value={formState.paymentMethod}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value={PaymentMethod.CASH}>Cash</option>
                <option value={PaymentMethod.VENMO}>Venmo</option>
                <option value={PaymentMethod.SQUARE}>Square</option>
              </select>
            </div>
            <div>
              <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                id="paymentStatus"
                name="paymentStatus"
                value={formState.paymentStatus}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {Object.values(PaymentStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Order Items</h2>
          
          {/* Add new item */}
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <h3 className="text-md font-medium mb-3">Add Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2">
                <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <select
                  id="product"
                  value={selectedProduct}
                  onChange={handleProductChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ${formatPrice(product.price)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="variant" className="block text-sm font-medium text-gray-700 mb-1">
                  Variant
                </label>
                <select
                  id="variant"
                  value={selectedVariant}
                  onChange={handleVariantChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={!selectedProduct || products.find(p => p.id === selectedProduct)?.variants.length === 0}
                >
                  <option value="">No variant</option>
                  {selectedProduct &&
                    products
                      .find(p => p.id === selectedProduct)
                      ?.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.name} {variant.price !== null ? `- $${formatPrice(variant.price)}` : ''}
                        </option>
                      ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!selectedProduct}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
          
          {/* Item list */}
          {formState.items.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variant
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formState.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.productName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.variantName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">${formatPrice(item.price)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        ${formatPrice(item.price * item.quantity)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={4} className="px-4 py-3 text-sm text-right">
                      Order Total:
                    </td>
                    <td className="px-4 py-3 text-sm text-right">${formatPrice(orderTotal)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 border border-dashed rounded-md">
              No items added yet. Please add at least one item.
            </div>
          )}
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md">
            {success}
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || formState.items.length === 0}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" /> Processing...
              </>
            ) : (
              'Update Order'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 