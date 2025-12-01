'use client';

/**
 * Visual Components Test Page
 *
 * This page renders all UI components in their various states for visual regression testing.
 * Used by Playwright visual tests to capture baseline screenshots.
 *
 * Only accessible in development/test environments.
 * Route: /test/visual-components
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Info, Plus, Minus, X } from 'lucide-react';

// Block access in production
if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_PAGES) {
  throw new Error('Visual components test page is not available in production');
}

export default function VisualComponentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [errorToastVisible, setErrorToastVisible] = useState(false);

  const showToast = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 5000);
  };

  const showErrorToast = () => {
    setErrorToastVisible(true);
    setTimeout(() => setErrorToastVisible(false), 5000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Visual Components Test Page
          </h1>
          <p className="text-gray-600">
            Component showcase for visual regression testing (DES-62)
          </p>
        </header>

        {/* Toast notifications - positioned fixed */}
        {toastVisible && (
          <div
            data-testid="toast-success"
            className="fixed top-4 right-4 z-[9999] w-96 animate-in duration-300 fade-in-0 slide-in-from-top"
          >
            <Alert className="border-[#FF9F1C] bg-white shadow-lg">
              <CheckCircle2 className="h-4 w-4 text-[#FF9F1C]" />
              <AlertTitle className="text-black font-medium">Added to Cart!</AlertTitle>
              <AlertDescription className="text-gray-600">
                Beef Empanada has been added to your cart.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {errorToastVisible && (
          <div
            data-testid="toast-error"
            className="fixed top-4 right-4 z-[9999] w-96 animate-in duration-300 fade-in-0 slide-in-from-top"
          >
            <Alert className="border-red-500 bg-white shadow-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertTitle className="text-black font-medium">Error</AlertTitle>
              <AlertDescription className="text-gray-600">
                Failed to add item to cart. Please try again.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Section 1: Buttons */}
        <section id="buttons" className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b">Buttons</h2>

          {/* Button Variants */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-700">Variants</h3>
            <div
              className="flex flex-wrap gap-4 items-center"
              data-testid="button-variants"
            >
              <Button variant="default">Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>

          {/* Button Sizes */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-700">Sizes</h3>
            <div
              className="flex flex-wrap gap-4 items-center"
              data-testid="button-sizes"
            >
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Button States */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 text-gray-700">States</h3>
            <div
              className="flex flex-wrap gap-4 items-center"
              data-testid="button-states"
            >
              <Button>Normal</Button>
              <Button disabled>Disabled</Button>
              <Button className="opacity-50 cursor-wait">Loading...</Button>
            </div>
          </div>

          {/* Button with Icons */}
          <div>
            <h3 className="text-lg font-medium mb-4 text-gray-700">With Icons</h3>
            <div
              className="flex flex-wrap gap-4 items-center"
              data-testid="button-icons"
            >
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
              <Button variant="destructive">
                <X className="mr-2 h-4 w-4" /> Remove
              </Button>
              <Button variant="outline">
                <Info className="mr-2 h-4 w-4" /> Info
              </Button>
            </div>
          </div>
        </section>

        {/* Section 2: Form Inputs */}
        <section id="form-inputs" className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b">Form Inputs</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Text Inputs */}
            <div data-testid="text-inputs">
              <h3 className="text-lg font-medium mb-4 text-gray-700">Text Inputs</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="input-default">Default Input</Label>
                  <Input id="input-default" placeholder="Enter text..." />
                </div>
                <div>
                  <Label htmlFor="input-filled">Filled Input</Label>
                  <Input id="input-filled" defaultValue="Sample text value" />
                </div>
                <div>
                  <Label htmlFor="input-disabled">Disabled Input</Label>
                  <Input id="input-disabled" disabled placeholder="Disabled..." />
                </div>
                <div>
                  <Label htmlFor="input-error" className="text-red-600">
                    Input with Error
                  </Label>
                  <Input
                    id="input-error"
                    className="border-red-500 focus-visible:ring-red-500"
                    defaultValue="Invalid value"
                  />
                  <p className="text-sm text-red-600 mt-1">This field is required</p>
                </div>
              </div>
            </div>

            {/* Textarea */}
            <div data-testid="textarea-inputs">
              <h3 className="text-lg font-medium mb-4 text-gray-700">Textarea</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="textarea-default">Default Textarea</Label>
                  <Textarea id="textarea-default" placeholder="Enter long text..." />
                </div>
                <div>
                  <Label htmlFor="textarea-filled">Filled Textarea</Label>
                  <Textarea
                    id="textarea-filled"
                    defaultValue="This is a sample textarea with some content that spans multiple lines to show how the textarea handles longer text."
                  />
                </div>
                <div>
                  <Label htmlFor="textarea-disabled">Disabled Textarea</Label>
                  <Textarea id="textarea-disabled" disabled placeholder="Disabled..." />
                </div>
              </div>
            </div>

            {/* Select */}
            <div data-testid="select-inputs">
              <h3 className="text-lg font-medium mb-4 text-gray-700">Select</h3>
              <div className="space-y-4">
                <div>
                  <Label>Default Select</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Select with Value</Label>
                  <Select defaultValue="option2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Disabled Select</Label>
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Disabled..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Checkbox and Radio */}
            <div data-testid="checkbox-radio-inputs">
              <h3 className="text-lg font-medium mb-4 text-gray-700">
                Checkbox & Radio
              </h3>
              <div className="space-y-6">
                {/* Checkboxes */}
                <div className="space-y-3">
                  <Label className="text-base">Checkboxes</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="checkbox-unchecked" />
                    <Label htmlFor="checkbox-unchecked" className="font-normal">
                      Unchecked
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="checkbox-checked" defaultChecked />
                    <Label htmlFor="checkbox-checked" className="font-normal">
                      Checked
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="checkbox-disabled" disabled />
                    <Label htmlFor="checkbox-disabled" className="font-normal opacity-50">
                      Disabled
                    </Label>
                  </div>
                </div>

                {/* Radio Buttons */}
                <div className="space-y-3">
                  <Label className="text-base">Radio Buttons</Label>
                  <RadioGroup defaultValue="option2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option1" id="radio-1" />
                      <Label htmlFor="radio-1" className="font-normal">
                        Option 1
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option2" id="radio-2" />
                      <Label htmlFor="radio-2" className="font-normal">
                        Option 2 (Selected)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option3" id="radio-3" disabled />
                      <Label htmlFor="radio-3" className="font-normal opacity-50">
                        Option 3 (Disabled)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Product Card */}
        <section id="product-card" className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b">Product Card</h2>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            data-testid="product-cards"
          >
            {/* Standard Product Card */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <div className="aspect-square bg-gray-100 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  Product Image
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg">Beef Empanada</h3>
                <p className="text-gray-600 text-sm mb-2">
                  Traditional Argentine beef empanada
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-[#FF9F1C]">$4.50</span>
                  <Button size="sm">Add to Cart</Button>
                </div>
              </div>
            </div>

            {/* Product with Badge */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <div className="aspect-square bg-gray-100 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  Product Image
                </div>
                <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  Popular
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg">Chicken Empanada</h3>
                <p className="text-gray-600 text-sm mb-2">Seasoned chicken filling</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-[#FF9F1C]">$4.50</span>
                  <Button size="sm">Add to Cart</Button>
                </div>
              </div>
            </div>

            {/* Pre-order Product */}
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <div className="aspect-square bg-gray-100 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  Product Image
                </div>
                <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  Pre-order
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg">Holiday Special</h3>
                <p className="text-gray-600 text-sm mb-2">Limited edition flavors</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-[#FF9F1C]">$6.00</span>
                  <Button size="sm" variant="outline">
                    Pre-order
                  </Button>
                </div>
              </div>
            </div>

            {/* Out of Stock Product */}
            <div className="border rounded-lg overflow-hidden shadow-sm opacity-75">
              <div className="aspect-square bg-gray-100 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  Product Image
                </div>
                <span className="absolute top-2 left-2 bg-gray-500 text-white text-xs px-2 py-1 rounded">
                  Out of Stock
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg">Spinach Empanada</h3>
                <p className="text-gray-600 text-sm mb-2">Vegetarian option</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-400">$4.50</span>
                  <Button size="sm" disabled>
                    Sold Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Cart Item */}
        <section id="cart-item" className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b">Cart Item</h2>

          <div className="space-y-4 max-w-2xl" data-testid="cart-items">
            {/* Cart Item Row */}
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                Image
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Beef Empanada</h4>
                <p className="text-sm text-gray-600">$4.50 each</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">2</span>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#FF9F1C]">$9.00</p>
              </div>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Another Cart Item */}
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                Image
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Chicken Empanada</h4>
                <p className="text-sm text-gray-600">$4.50 each</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">1</span>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#FF9F1C]">$4.50</p>
              </div>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Cart Summary */}
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-xl font-bold text-[#FF9F1C]">$13.50</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Dialog */}
        <section id="dialog" className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b">Dialog</h2>

          <div className="space-y-4" data-testid="dialog-section">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="dialog-trigger">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-content">
                <DialogHeader>
                  <DialogTitle>Confirm Action</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to proceed? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-gray-600">
                    This is the dialog body content. You can put any content here including
                    forms, images, or other components.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Static dialog preview (always visible for screenshot) */}
            <div className="mt-8 border rounded-lg p-6 bg-gray-50">
              <h3 className="text-lg font-medium mb-4 text-gray-700">
                Dialog Preview (Static)
              </h3>
              <div
                className="bg-white border rounded-lg p-6 shadow-lg max-w-md"
                data-testid="dialog-preview"
              >
                <div className="mb-4">
                  <h4 className="text-lg font-semibold">Dialog Title</h4>
                  <p className="text-sm text-gray-500">
                    This is the dialog description text.
                  </p>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  Dialog body content goes here. This could be a form, message, or any
                  other content.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm">
                    Cancel
                  </Button>
                  <Button size="sm">Confirm</Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Toast/Notifications */}
        <section id="toast" className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b">
            Toast Notifications
          </h2>

          <div className="space-y-6" data-testid="toast-section">
            {/* Toast Triggers */}
            <div className="flex gap-4">
              <Button onClick={showToast} data-testid="trigger-success-toast">
                Show Success Toast
              </Button>
              <Button
                variant="destructive"
                onClick={showErrorToast}
                data-testid="trigger-error-toast"
              >
                Show Error Toast
              </Button>
            </div>

            {/* Static toast previews */}
            <div className="space-y-4 max-w-md">
              <h3 className="text-lg font-medium text-gray-700">Toast Variants</h3>

              {/* Success Toast */}
              <Alert
                className="border-[#FF9F1C] bg-white shadow-lg"
                data-testid="toast-success-preview"
              >
                <CheckCircle2 className="h-4 w-4 text-[#FF9F1C]" />
                <AlertTitle className="text-black font-medium">
                  Added to Cart!
                </AlertTitle>
                <AlertDescription className="text-gray-600">
                  Beef Empanada has been added to your cart.
                </AlertDescription>
              </Alert>

              {/* Error Toast */}
              <Alert
                className="border-red-500 bg-white shadow-lg"
                data-testid="toast-error-preview"
              >
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertTitle className="text-black font-medium">Error</AlertTitle>
                <AlertDescription className="text-gray-600">
                  Failed to add item to cart. Please try again.
                </AlertDescription>
              </Alert>

              {/* Info Toast */}
              <Alert
                className="border-blue-500 bg-white shadow-lg"
                data-testid="toast-info-preview"
              >
                <Info className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-black font-medium">Information</AlertTitle>
                <AlertDescription className="text-gray-600">
                  Your order is being processed.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </section>

        {/* Section 7: Loading States */}
        <section id="loading" className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b">Loading States</h2>

          <div className="space-y-8" data-testid="loading-section">
            {/* Loading Spinners */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-700">Loading Spinner</h3>
              <div className="flex items-end gap-8" data-testid="loading-spinners">
                <div className="text-center">
                  <LoadingSpinner size="sm" />
                  <p className="text-sm text-gray-500 mt-2">Small</p>
                </div>
                <div className="text-center">
                  <LoadingSpinner size="md" />
                  <p className="text-sm text-gray-500 mt-2">Medium</p>
                </div>
                <div className="text-center">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm text-gray-500 mt-2">Large</p>
                </div>
              </div>
            </div>

            {/* Skeleton Loaders */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-700">Skeleton</h3>
              <div className="space-y-4 max-w-md" data-testid="skeleton-loaders">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-4">
                  <Skeleton className="h-20 w-20 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </div>
            </div>

            {/* Product Card Skeleton */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-700">
                Product Card Skeleton
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <div className="flex justify-between items-center pt-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-9 w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 8: Error Display */}
        <section id="error-display" className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b">Error Display</h2>

          <div className="space-y-6 max-w-xl" data-testid="error-displays">
            {/* Default Error */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-700">Default Error</h3>
              <ErrorDisplay />
            </div>

            {/* Custom Error */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-700">Custom Error</h3>
              <ErrorDisplay
                title="Payment Failed"
                message="Your payment could not be processed. Please check your card details and try again."
                returnLink={{
                  href: '/checkout',
                  label: 'Return to checkout',
                }}
              />
            </div>

            {/* 404 Style Error */}
            <div>
              <h3 className="text-lg font-medium mb-4 text-gray-700">Not Found Error</h3>
              <ErrorDisplay
                title="Page Not Found"
                message="The page you are looking for does not exist or has been moved."
                returnLink={{
                  href: '/',
                  label: 'Go to homepage',
                }}
              />
            </div>
          </div>
        </section>

        {/* Section 9: Navigation Preview */}
        <section id="navigation" className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b">Navigation</h2>

          <div data-testid="navigation-preview">
            <p className="text-gray-600 mb-4">
              Navigation components are tested on the actual page layouts. The visual
              tests capture the Navbar from the main site pages.
            </p>

            {/* Mock Navigation Bar */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-6">
                  <span className="font-bold text-xl text-[#FF9F1C]">Destino</span>
                  <nav className="hidden md:flex gap-4">
                    <span className="text-gray-600 hover:text-gray-900 cursor-pointer">
                      Menu
                    </span>
                    <span className="text-gray-600 hover:text-gray-900 cursor-pointer">
                      Catering
                    </span>
                    <span className="text-gray-600 hover:text-gray-900 cursor-pointer">
                      About
                    </span>
                    <span className="text-gray-600 hover:text-gray-900 cursor-pointer">
                      Contact
                    </span>
                  </nav>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Button variant="ghost" size="icon">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </Button>
                    <span className="absolute -top-1 -right-1 bg-[#FF9F1C] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      3
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="hidden md:inline-flex">
                    Sign In
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 10: Footer Preview */}
        <section id="footer" className="mb-16 bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold mb-6 pb-2 border-b">Footer</h2>

          <div data-testid="footer-preview">
            <p className="text-gray-600 mb-4">
              Footer component is tested on the actual page layouts. The visual tests
              capture the Footer from the main site pages.
            </p>

            {/* Mock Footer */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-[#FDC32D] px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <h4 className="font-bold text-lg mb-4 text-gray-900">Destino SF</h4>
                    <p className="text-gray-800 text-sm">
                      Authentic Argentine empanadas and alfajores, made with love in San
                      Francisco.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-4 text-gray-900">Quick Links</h4>
                    <ul className="space-y-2 text-sm text-gray-800">
                      <li>Menu</li>
                      <li>Catering</li>
                      <li>About Us</li>
                      <li>Contact</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-4 text-gray-900">Follow Us</h4>
                    <div className="flex gap-4">
                      <span className="text-gray-800">Facebook</span>
                      <span className="text-gray-800">Instagram</span>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-4 border-t border-yellow-500 text-center text-sm text-gray-800">
                  &copy; 2024 Destino SF. All rights reserved.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
