// src/components/Products/ProductDetails.tsx

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product, Variant } from '@/types/product';
import { Decimal } from '@prisma/client/runtime/library';
import { useCartStore } from '@/store/cart';
import { useCartAlertStore } from '@/components/ui/cart-alert';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Clock, Thermometer, Leaf, Users } from 'lucide-react';

interface ProductDetailsProps {
  product: Product;
}

// Helper function to safely format prices
const formatPrice = (price: number | Decimal | null | undefined): string => {
  if (price === null || price === undefined) return '0.00';
  // If it's a Decimal object from Prisma
  if (typeof price === 'object' && price !== null && 'toFixed' in price) {
    return price.toFixed(2);
  }
  // If it's a regular number
  return Number(price).toFixed(2);
};

// FAQ data specific to different product categories
const getFAQForProduct = (product: Product) => {
  const categoryName = product.category?.name?.toLowerCase() || '';
  const productName = product.name.toLowerCase();

  // Check if it's alfajores (either by category or product name)
  if (categoryName.includes('alfajor') || productName.includes('alfajor')) {
    return [
      {
        question: 'How should I store these alfajores?',
        answer:
          'Store in a cool, dry place at room temperature. They will stay fresh for up to two weeks. For longer storage, you can refrigerate them after opening to extend freshness, or freeze them for up to 3 months - just wrap tightly and thaw at room temperature before enjoying.',
      },
      {
        question: 'Do these alfajores contain allergens?',
        answer:
          'Yes, our alfajores contain common allergens including wheat, eggs, and dairy. Some flavors may also contain or be produced in a facility that handles nuts. Please check the ingredient label or contact us if you have specific allergies or dietary concerns.',
      },
      {
        question: 'What makes these alfajores special?',
        answer:
          'Our alfajores are handmade using traditional Argentine recipes with premium dulce de leche and high-quality ingredients. Each cookie is carefully crafted to deliver the authentic taste and texture of classic Argentine alfajores.',
      },
      {
        question: 'How many alfajores should I order?',
        answer:
          "Each alfajore is a perfect individual treat! Most customers enjoy 1-2 alfajores with coffee or tea. They're great for sharing, gifting, or enjoying as a sweet treat throughout the week.",
      },
    ];
  }

  // Default to empanadas FAQ
  return [
    {
      question: 'How do I cook these empanadas?',
      answer:
        'Air Fryer: Preheat to 375°F. Cook for 15–20 minutes until golden brown. Conventional Oven: Preheat to 400°F. Bake for 20–25 minutes until golden brown. Remove parchment liners before cooking.',
    },
    {
      question: 'How should I store them?',
      answer:
        'Keep frozen until ready to cook. Once cooked, consume immediately for best taste. Uncooked empanadas can be stored in the freezer for up to 3 months.',
    },
    {
      question: 'Are these empanadas gluten-free?',
      answer:
        'Our traditional empanadas contain wheat flour. Please check with us about gluten-free options if you have dietary restrictions.',
    },
    {
      question: 'How many empanadas per person?',
      answer:
        'Each empanada is one serving, perfect for a light meal or snack. Most customers enjoy 2-3 for a full meal, especially when paired with salad or sides.',
    },
  ];
};

// Related Products Component
interface RelatedProductsProps {
  currentProduct: Product;
}

function RelatedProducts({ currentProduct }: RelatedProductsProps) {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRelatedProducts() {
      try {
        // Fetch products from the same category, excluding the current product and catering products
        const response = await fetch(
          `/api/products?categoryId=${currentProduct.categoryId}&exclude=${currentProduct.id}&limit=6&excludeCatering=true`
        );
        if (response.ok) {
          const products = await response.json();
          // Filter out any products with $0.00 price as an additional safety measure
          const filteredProducts = products.filter((product: Product) => {
            const price =
              typeof product.price === 'object' &&
              product.price !== null &&
              'toNumber' in product.price
                ? product.price.toNumber()
                : Number(product.price);
            return price > 0;
          });
          // Take only the first 3 products after filtering
          setRelatedProducts(filteredProducts.slice(0, 3));
        }
      } catch (error) {
        console.error('Error fetching related products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRelatedProducts();
  }, [currentProduct.categoryId, currentProduct.id]);

  if (loading) {
    return (
      <div className="mt-12 bg-white rounded-3xl p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">You Might Also Like</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (relatedProducts.length === 0) {
    return null; // Don't show the section if no related products
  }

  return (
    <div className="mt-12 bg-white rounded-3xl p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">You Might Also Like</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {relatedProducts.map(product => (
          <Link
            key={product.id}
            href={`/products/${product.slug || product.id}`}
            className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow block"
          >
            <div className="aspect-square bg-gray-200 rounded-lg mb-3 overflow-hidden">
              <Image
                src={product.images?.[0] || '/images/menu/empanadas.png'}
                alt={product.name}
                width={200}
                height={200}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
              {product.description || 'Delicious handmade product'}
            </p>
            <p className="text-lg font-bold text-gray-900">${formatPrice(product.price)}</p>
          </Link>
        ))}
      </div>

      {/* Trust Signals */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <Leaf className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Fresh Ingredients</h3>
            <p className="text-gray-600 text-sm">Made with premium, locally-sourced ingredients</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <Thermometer className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Flash Frozen</h3>
            <p className="text-gray-600 text-sm">Locks in freshness and flavor</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Quick & Easy</h3>
            <p className="text-gray-600 text-sm">Ready in just 15-20 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Dynamic product highlights based on product type
const getProductHighlights = (product: Product) => {
  const categoryName = product.category?.name?.toLowerCase() || '';
  const productName = product.name.toLowerCase();

  // Check if it's alfajores
  if (categoryName.includes('alfajor') || productName.includes('alfajor')) {
    return [
      {
        icon: <Leaf className="w-4 h-4 text-green-300" />,
        text: 'Ready to Eat',
        color: 'text-green-300',
      },
      {
        icon: <Clock className="w-4 h-4 text-blue-300" />,
        text: '2 weeks fresh',
        color: 'text-blue-300',
      },
      {
        icon: <Users className="w-4 h-4 text-purple-300" />,
        text: '6-pack combo',
        color: 'text-purple-300',
      },
    ];
  }

  // Default empanadas highlights
  return [
    {
      icon: <Thermometer className="w-4 h-4 text-orange-300" />,
      text: 'Ready to Cook',
      color: 'text-orange-300',
    },
    {
      icon: <Clock className="w-4 h-4 text-green-300" />,
      text: '15-20 min',
      color: 'text-green-300',
    },
    {
      icon: <Users className="w-4 h-4 text-blue-300" />,
      text: '4 pack',
      color: 'text-blue-300',
    },
  ];
};

// Dynamic cooking and storage content based on product type
const getCookingStorageContent = (product: Product) => {
  const categoryName = product.category?.name?.toLowerCase() || '';
  const productName = product.name.toLowerCase();

  // Check if it's alfajores
  if (categoryName.includes('alfajor') || productName.includes('alfajor')) {
    return (
      <>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">🍪 Enjoying Your Alfajores</h3>
          <ul className="text-green-800 text-sm space-y-1">
            <li>• Ready to eat - no preparation needed!</li>
            <li>• Perfect with coffee, tea, or mate</li>
            <li>• Let them come to room temperature for best flavor</li>
            <li>• Great for sharing or gifting</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📦 Storage Instructions</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Store in a cool, dry place at room temperature</li>
            <li>• Keep in original packaging or airtight container</li>
            <li>• Best consumed within 2 weeks of purchase</li>
            <li>• Can be refrigerated to extend freshness</li>
            <li>• Freeze for up to 3 months if needed</li>
          </ul>
        </div>
      </>
    );
  }

  // Default empanadas content
  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">🔥 Cooking Tips for Best Results</h3>
        <ul className="text-amber-800 text-sm space-y-1">
          <li>• Don&apos;t thaw before cooking - cook directly from frozen</li>
          <li>• Remove parchment liners before cooking</li>
          <li>• Let cool for 2-3 minutes before eating (filling will be hot!)</li>
          <li>• For extra crispiness, brush with egg wash before baking</li>
        </ul>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">❄️ Storage Instructions</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Keep frozen until ready to cook</li>
          <li>• Best consumed within 3 months of purchase</li>
          <li>• Once cooked, eat immediately for best taste</li>
          <li>• Can be reheated in oven at 350°F for 5-7 minutes</li>
        </ul>
      </div>
    </>
  );
};

export default function ProductDetails({ product }: ProductDetailsProps) {
  // Check if product has valid variants and more than one
  const hasMultipleVariants =
    product?.variants &&
    Array.isArray(product.variants) &&
    product.variants.filter(v => v && v.id).length > 1;

  // Call hooks unconditionally at the top level
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product?.variants && product.variants.length > 0 ? product.variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'faq' | 'nutrition'>('details');
  const [openFAQItems, setOpenFAQItems] = useState<number[]>([]);
  const { addItem } = useCartStore();
  const { showAlert } = useCartAlertStore();

  // Ensure product exists and has required fields before rendering
  if (!product || !product.id || !product.name) {
    return (
      <div className="min-h-screen bg-[hsl(var(--header-orange))]">
        <div className="py-8 mb-0">
          <div className="max-w-4xl mx-auto px-4 text-center text-white">
            <div className="py-20">
              <h1 className="text-2xl font-bold mb-4">Product not found</h1>
              <p className="text-white/80">
                The product you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle both Sanity and DB product structures
  const displayPrice = selectedVariant?.price || product.price || 0;
  const mainImage = product.images?.[0] || '/images/menu/empanadas.png';
  const productId = product.id;
  const productName = product.name;
  const isActive = product.active ?? true;
  const stock: number = 999; // Explicitly type as number

  const handleAddToCart = () => {
    console.log('Adding to cart:', { productName, quantity, selectedVariant });
    const priceToAdd =
      typeof displayPrice === 'object' && displayPrice !== null && 'toNumber' in displayPrice
        ? displayPrice.toNumber()
        : Number(displayPrice);

    const cartItem = {
      id: productId,
      name: productName + (selectedVariant ? ` - ${selectedVariant.name}` : ''),
      price: priceToAdd,
      quantity: quantity,
      image: mainImage,
      variantId: selectedVariant?.id,
    };

    addItem(cartItem);
    console.log('Showing alert for:', cartItem);
    showAlert(
      `${quantity} ${productName}${selectedVariant ? ` (${selectedVariant.name})` : ''} has been added to your cart.`
    );
  };

  const incrementQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, 20));
  };

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(prev - 1, 1));
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQItems(prev =>
      prev.includes(index) ? prev.filter(item => item !== index) : [...prev, index]
    );
  };

  return (
    <div className="relative mb-0">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <div className="w-full">
          <div className="aspect-square overflow-hidden rounded-3xl bg-white/10">
            <Image
              src={mainImage}
              alt={productName}
              width={800}
              height={800}
              className="h-full w-full object-cover object-center"
              priority
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col justify-between text-white">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold">{productName}</h1>

            {/* Product highlights */}
            <div className="mt-6 flex flex-wrap gap-3">
              {getProductHighlights(product).map((highlight, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-full"
                >
                  <span className={`${highlight.color} w-4 h-4`}>{highlight.icon}</span>
                  <span className="text-sm text-white">{highlight.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Product Details with Tabs */}
      <div className="mt-8 bg-[hsl(var(--header-orange))] rounded-3xl p-2 mb-0">
        <div className="bg-white rounded-2xl p-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Product Details
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'faq'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              FAQ
            </button>
            <button
              onClick={() => setActiveTab('nutrition')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'nutrition'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Cooking & Storage
            </button>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {product.description && (
                  <p className="text-gray-600 mb-8 text-lg">{product.description}</p>
                )}

                <p className="text-3xl font-semibold mb-8 text-gray-900">
                  ${formatPrice(displayPrice)}
                </p>

                {/* Variant Selector - Only shown if multiple variants exist */}
                {hasMultipleVariants && (
                  <div className="mb-8">
                    <label
                      htmlFor="variant-select"
                      className="block text-lg font-medium text-gray-900 mb-2"
                    >
                      Options:
                    </label>
                    <select
                      id="variant-select"
                      className="w-full border border-gray-200 rounded-xl py-3 px-4 text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={selectedVariant?.id || ''}
                      onChange={e => {
                        const variant = product.variants?.find(v => v.id === e.target.value);
                        setSelectedVariant(variant || null);
                      }}
                    >
                      {product.variants?.map(variant => (
                        <option key={variant.id} value={variant.id}>
                          {variant.name} - $
                          {formatPrice(variant.price) || formatPrice(product.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quantity and Add to Cart Row */}
                <div className="flex items-center justify-between">
                  <div className="flex-shrink-0">
                    <label className="block text-base text-gray-900 mb-2">Quantity:</label>
                    <div className="flex items-center">
                      <button
                        onClick={decrementQuantity}
                        disabled={quantity <= 1}
                        className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
                      >
                        -
                      </button>
                      <span className="text-base font-medium w-8 text-center text-gray-900">
                        {quantity}
                      </span>
                      <button
                        onClick={incrementQuantity}
                        disabled={quantity >= 20}
                        className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    className="h-10 px-6 bg-[#F7B614] text-white rounded-full text-sm font-semibold hover:bg-[#E5A912] transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isActive || stock === 0}
                  >
                    Add to Cart
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'faq' && (
              <motion.div
                key="faq"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {getFAQForProduct(product).map((faq, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-900">{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          openFAQItems.includes(index) ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {openFAQItems.includes(index) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 py-3 text-gray-600">{faq.answer}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'nutrition' && (
              <motion.div
                key="nutrition"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {getCookingStorageContent(product)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Related Products Section */}
      <RelatedProducts currentProduct={product} />
    </div>
  );
}
