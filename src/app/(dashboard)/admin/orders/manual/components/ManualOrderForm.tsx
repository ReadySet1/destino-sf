'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createManualOrder,
  updateOrderStatus,
} from '@/app/(dashboard)/admin/orders/manual/actions';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { FormContainer } from '@/components/ui/form/FormContainer';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormSection } from '@/components/ui/form/FormSection';
import { FormField } from '@/components/ui/form/FormField';
import { FormInput } from '@/components/ui/form/FormInput';
import { FormTextarea } from '@/components/ui/form/FormTextarea';
import { FormSelect } from '@/components/ui/form/FormSelect';
import { FormCheckbox } from '@/components/ui/form/FormCheckbox';
import { FormGrid } from '@/components/ui/form/FormGrid';
import { FormStack } from '@/components/ui/form/FormStack';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';
import { calculateTaxForItems } from '@/utils/tax-exemption';

// Define our own PaymentMethod enum to match the Prisma schema
enum PaymentMethod {
  SQUARE = 'SQUARE',
  CASH = 'CASH',
}

// Types
type ProductWithVariants = {
  id: string;
  name: string;
  price: number;
  category?: {
    id: string;
    name: string;
  } | null;
  variants: {
    id: string;
    name: string;
    price: number | null;
  }[];
};

type OrderItem = {
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
  // Detailed breakdown fields
  taxAmount: number;
  deliveryFee: number;
  serviceFee: number;
  gratuityAmount: number;
  gratuityPercentage: number;
  gratuityMode: 'amount' | 'percentage';
  shippingCostCents: number;
  shippingCarrier: string;
  // Auto-calculate flags
  autoCalculateTax: boolean;
  autoCalculateServiceFee: boolean;
  existingOrderId?: string;
};

const initialState: FormState = {
  customerName: '',
  email: '',
  phone: '',
  fulfillmentType: 'pickup',
  pickupTime: '',
  notes: '',
  paymentMethod: PaymentMethod.CASH,
  paymentStatus: PaymentStatus.PENDING,
  status: OrderStatus.PENDING,
  items: [],
  // Detailed breakdown fields
  taxAmount: 0,
  deliveryFee: 0,
  serviceFee: 0,
  gratuityAmount: 0,
  gratuityPercentage: 0,
  gratuityMode: 'amount',
  shippingCostCents: 0,
  shippingCarrier: '',
  // Auto-calculate flags
  autoCalculateTax: false, // Changed to false by default
  autoCalculateServiceFee: true,
};

export function ManualOrderForm() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(initialState);
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
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Convert numeric fields to numbers
    const numericFields = ['deliveryFee', 'taxAmount', 'serviceFee', 'gratuityAmount', 'gratuityPercentage', 'shippingCostCents'];
    const convertedValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
    
    setFormState(prev => ({
      ...prev,
      [name]: convertedValue,
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

    const newItem: OrderItem = {
      productId: selectedProduct,
      variantId: selectedVariant || null,
      quantity,
      price,
      productName: product.name,
      variantName,
    };

    setFormState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
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
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Calculate detailed totals - ensure all values are numbers
  const subtotal = formState.items.reduce((total, item) => total + item.price * item.quantity, 0);
  const deliveryFee = Number(formState.deliveryFee) || 0;
  const shippingCost = Number(formState.shippingCostCents) / 100 || 0;
  const manualTax = Number(formState.taxAmount) || 0;
  const manualServiceFee = Number(formState.serviceFee) || 0;
  
  // Auto-calculate tax if enabled - using exemption logic (only catering items taxed)
  const calculatedTax = formState.autoCalculateTax ? (() => {
    // Create items for tax calculation with product details
    const itemsForTaxCalculation = formState.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        product: product ? {
          category: product.category,
          name: product.name,
        } : undefined,
        price: item.price,
        quantity: item.quantity,
      };
    });
    
    // Calculate tax on items using exemption logic
    const itemTaxResult = calculateTaxForItems(itemsForTaxCalculation, 0.0825);
    
    // Add delivery fee and shipping cost to taxable amount if they exist (these are always taxable)
    const additionalTaxableAmount = deliveryFee + shippingCost;
    const additionalTax = additionalTaxableAmount * 0.0825;
    
    return itemTaxResult.taxAmount + additionalTax;
  })() : manualTax;
    
  // Auto-calculate service fee if enabled (3.5% on subtotal + delivery fee + shipping + tax)
  const totalBeforeServiceFee = subtotal + deliveryFee + shippingCost + calculatedTax;
  const calculatedServiceFee = formState.autoCalculateServiceFee 
    ? totalBeforeServiceFee * 0.035
    : manualServiceFee;
    
  // Calculate the total BEFORE gratuity (this is what we calculate tip percentage on)
  const totalBeforeGratuity = subtotal + deliveryFee + shippingCost + calculatedTax + calculatedServiceFee;
  
  // Calculate gratuity based on mode (amount or percentage) - AFTER taxes and fees
  // This ensures tips are not taxed, as they should be calculated on the grand total
  const gratuityAmount = formState.gratuityMode === 'percentage' 
    ? totalBeforeGratuity * (Number(formState.gratuityPercentage) / 100)
    : Number(formState.gratuityAmount) || 0;
    
  // Calculate grand total (subtotal + fees + tax + service fee + tip)
  const orderTotal = totalBeforeGratuity + gratuityAmount;

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

      // Submit the order with calculated values
      const result = await createManualOrder({
        ...formState,
        total: orderTotal,
        taxAmount: calculatedTax,
        deliveryFee: deliveryFee,
        serviceFee: calculatedServiceFee,
        gratuityAmount: gratuityAmount,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setSuccess(`Order ${result.orderId} created successfully!`);

      // Reset form after successful submission
      setFormState(initialState);

      // Navigate to the order details page
      setTimeout(() => {
        router.push(`/admin/orders/${result.orderId}`);
      }, 1500);
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <FormContainer>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <FormHeader
        title="Create Manual Order"
        description="Create a new order manually for customers"
        backUrl="/admin/orders"
        backLabel="Back to Orders"
      />

      <form onSubmit={handleSubmit}>
        <FormStack spacing={10}>
        {/* Customer Information */}
        <FormSection
          title="Customer Information"
          description="Required customer details for the order"
          icon={FormIcons.user}
        >
          <FormGrid cols={2}>
            <FormField label="Customer Name" required>
              <FormInput
                name="customerName"
                placeholder="Enter customer name"
                value={formState.customerName}
                onChange={handleChange}
                required
              />
            </FormField>
            <FormField label="Email" required>
              <FormInput
                type="email"
                name="email"
                placeholder="customer@example.com"
                value={formState.email}
                onChange={handleChange}
                required
              />
            </FormField>
            <FormField label="Phone" required>
              <FormInput
                type="tel"
                name="phone"
                placeholder="(555) 123-4567"
                value={formState.phone}
                onChange={handleChange}
                required
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Order Details */}
        <FormSection
          title="Order Details"
          description="Fulfillment and order configuration"
          icon={FormIcons.truck}
          variant="blue"
        >
          <FormGrid cols={2}>
            <FormField label="Fulfillment Type">
              <FormSelect
                name="fulfillmentType"
                value={formState.fulfillmentType}
                onChange={handleChange}
              >
                <option value="pickup">Pickup</option>
                <option value="local_delivery">Local Delivery</option>
                <option value="nationwide_shipping">Nationwide Shipping</option>
              </FormSelect>
            </FormField>
            <FormField label="Pickup/Delivery Time">
              <FormInput
                type="datetime-local"
                name="pickupTime"
                value={formState.pickupTime}
                onChange={handleChange}
              />
            </FormField>
            <FormField label="Order Status">
              <FormSelect
                name="status"
                value={formState.status}
                onChange={handleChange}
              >
                {Object.values(OrderStatus).map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="Order Notes">
              <FormTextarea
                name="notes"
                placeholder="Special instructions or notes..."
                value={formState.notes}
                onChange={handleChange}
                rows={2}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Payment Information */}
        <FormSection
          title="Payment Information"
          description="Payment method and status"
          icon={FormIcons.creditCard}
          variant="green"
        >
          <FormGrid cols={2}>
            <FormField label="Payment Method">
              <FormSelect
                name="paymentMethod"
                value={formState.paymentMethod}
                onChange={handleChange}
              >
                <option value={PaymentMethod.CASH}>Cash</option>
                <option value={PaymentMethod.SQUARE}>Square</option>
              </FormSelect>
            </FormField>
            <FormField label="Payment Status">
              <FormSelect
                name="paymentStatus"
                value={formState.paymentStatus}
                onChange={handleChange}
              >
                {Object.values(PaymentStatus).map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </FormSelect>
            </FormField>
          </FormGrid>
        </FormSection>

        {/* Fee Breakdown */}
        <FormSection
          title="Fee Breakdown"
          description="Configure taxes, fees, and shipping costs"
          icon={FormIcons.creditCard}
          variant="purple"
        >
          <FormGrid cols={2}>
            <FormField label="Tax Amount">
              <div className="space-y-2">
                <FormCheckbox
                  name="autoCalculateTax"
                  label="Auto-calculate tax (8.25% on catering items only)"
                  checked={formState.autoCalculateTax}
                  onChange={(e) => setFormState(prev => ({ ...prev, autoCalculateTax: e.target.checked }))}
                />
                {!formState.autoCalculateTax && (
                  <FormInput
                    type="number"
                    name="taxAmount"
                    placeholder="0.00"
                    value={formState.taxAmount.toString()}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                  />
                )}
                {formState.autoCalculateTax && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                    Calculated: ${calculatedTax.toFixed(2)}
                  </div>
                )}
              </div>
            </FormField>
            
            <FormField label="Delivery Fee">
              <FormInput
                type="number"
                name="deliveryFee"
                placeholder="0.00"
                value={formState.deliveryFee.toString()}
                onChange={handleChange}
                step="0.01"
                min="0"
              />
            </FormField>
            
            <FormField label="Convenience Fee">
              <div className="space-y-2">
                <FormCheckbox
                  name="autoCalculateServiceFee"
                  label="Auto-calculate service fee (3.5%)"
                  checked={formState.autoCalculateServiceFee}
                  onChange={(e) => setFormState(prev => ({ ...prev, autoCalculateServiceFee: e.target.checked }))}
                />
                {!formState.autoCalculateServiceFee && (
                  <FormInput
                    type="number"
                    name="serviceFee"
                    placeholder="0.00"
                    value={formState.serviceFee.toString()}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                  />
                )}
                {formState.autoCalculateServiceFee && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                    Calculated: ${calculatedServiceFee.toFixed(2)}
                  </div>
                )}
              </div>
            </FormField>
            
            <FormField label="Gratuity/Tip">
              <div className="space-y-3">
                {/* Mode Toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, gratuityMode: 'amount' }))}
                    className={`px-3 py-1 text-sm rounded ${
                      formState.gratuityMode === 'amount'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Amount ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, gratuityMode: 'percentage' }))}
                    className={`px-3 py-1 text-sm rounded ${
                      formState.gratuityMode === 'percentage'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Percentage (%)
                  </button>
                </div>

                {/* Amount Input */}
                {formState.gratuityMode === 'amount' && (
                  <FormInput
                    type="number"
                    name="gratuityAmount"
                    placeholder="0.00"
                    value={formState.gratuityAmount.toString()}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                  />
                )}

                {/* Percentage Input with Presets */}
                {formState.gratuityMode === 'percentage' && (
                  <div className="space-y-2">
                    {/* Preset Buttons */}
                    <div className="flex gap-2">
                      {[10, 15, 20].map(percent => (
                        <button
                          key={percent}
                          type="button"
                          onClick={() => setFormState(prev => ({ ...prev, gratuityPercentage: percent }))}
                          className={`px-3 py-2 text-sm rounded border ${
                            formState.gratuityPercentage === percent
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {percent}%
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom Percentage Input */}
                    <FormInput
                      type="number"
                      name="gratuityPercentage"
                      placeholder="0"
                      value={formState.gratuityPercentage.toString()}
                      onChange={handleChange}
                      step="0.1"
                      min="0"
                      max="100"
                    />
                    
                    {/* Calculated Amount Display */}
                    <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                      Calculated: ${gratuityAmount.toFixed(2)} ({formState.gratuityPercentage}% of ${totalBeforeGratuity.toFixed(2)})
                    </div>
                  </div>
                )}
              </div>
            </FormField>
            
            {formState.fulfillmentType === 'nationwide_shipping' && (
              <FormField label="Shipping Cost (cents)">
                <FormInput
                  type="number"
                  name="shippingCostCents"
                  placeholder="0"
                  value={formState.shippingCostCents.toString()}
                  onChange={handleChange}
                  min="0"
                />
              </FormField>
            )}
          </FormGrid>
          
          {formState.fulfillmentType === 'nationwide_shipping' && (
            <FormField label="Shipping Carrier">
              <FormSelect
                name="shippingCarrier"
                value={formState.shippingCarrier}
                onChange={handleChange}
              >
                <option value="">Select carrier</option>
                <option value="USPS">USPS</option>
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="DHL">DHL</option>
                <option value="Other">Other</option>
              </FormSelect>
            </FormField>
          )}
        </FormSection>

        {/* Order Items */}
        <FormSection
          title="Order Items"
          description="Add products to the order"
          icon={FormIcons.package}
          variant="amber"
        >

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
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ${product.price.toFixed(2)}
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
                  disabled={
                    !selectedProduct ||
                    products.find(p => p.id === selectedProduct)?.variants.length === 0
                  }
                >
                  <option value="">No variant</option>
                  {selectedProduct &&
                    products
                      .find(p => p.id === selectedProduct)
                      ?.variants.map(variant => (
                        <option key={variant.id} value={variant.id}>
                          {variant.name}{' '}
                          {variant.price !== null ? `- $${variant.price.toFixed(2)}` : ''}
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
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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
                  onChange={e => setPrice(parseFloat(e.target.value) || 0)}
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
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        ${(item.price * item.quantity).toFixed(2)}
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
                  {/* Detailed breakdown */}
                  <tr className="border-t border-gray-300">
                    <td colSpan={4} className="px-4 py-2 text-sm text-gray-600 text-right">
                      Subtotal:
                    </td>
                    <td className="px-4 py-2 text-sm text-right">${subtotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                  
                  {deliveryFee > 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-sm text-gray-600 text-right">
                        Delivery Fee:
                      </td>
                      <td className="px-4 py-2 text-sm text-right">${deliveryFee.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  )}
                  
                  {shippingCost > 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-sm text-gray-600 text-right">
                        Shipping ({formState.shippingCarrier || 'N/A'}):
                      </td>
                      <td className="px-4 py-2 text-sm text-right">${shippingCost.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  )}
                  
                  {calculatedTax > 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-sm text-gray-600 text-right">
                        Tax (8.25% on catering items + fees):
                      </td>
                      <td className="px-4 py-2 text-sm text-right">${calculatedTax.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-sm text-gray-600 text-right">
                        Tax (No tax on non-catering items):
                      </td>
                      <td className="px-4 py-2 text-sm text-right">$0.00</td>
                      <td></td>
                    </tr>
                  )}
                  
                  {calculatedServiceFee > 0.01 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-sm text-gray-600 text-right">
                      Convenience Fee (3.5%):
                      </td>
                      <td className="px-4 py-2 text-sm text-right">${calculatedServiceFee.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  )}
                  
                  {gratuityAmount > 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-sm text-gray-600 text-right">
                        Gratuity/Tip{formState.gratuityMode === 'percentage' ? ` (${formState.gratuityPercentage}%)` : ''}:
                      </td>
                      <td className="px-4 py-2 text-sm text-right">${gratuityAmount.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  )}
                  
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-400">
                    <td colSpan={4} className="px-4 py-3 text-sm text-right">
                      Grand Total:
                    </td>
                    <td className="px-4 py-3 text-sm text-right">${orderTotal.toFixed(2)}</td>
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
        </FormSection>

        {/* Error and Success Messages */}
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-md">{error}</div>}

        {success && <div className="bg-green-50 text-green-700 p-3 rounded-md">{success}</div>}

        {/* Submit Button */}
        <FormActions>
          <FormButton
            variant="secondary"
            href="/admin/orders"
          >
            Cancel
          </FormButton>
          <FormButton
            type="submit"
            disabled={isSubmitting || formState.items.length === 0}
            leftIcon={isSubmitting ? undefined : FormIcons.save}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" /> Processing...
              </>
            ) : (
              'Create Order'
            )}
          </FormButton>
        </FormActions>
        </FormStack>
      </form>
    </FormContainer>
  );
}
