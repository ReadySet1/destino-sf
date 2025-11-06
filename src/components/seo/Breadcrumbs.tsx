import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  currentPage?: string;
}

/**
 * Breadcrumbs Component
 *
 * Provides visual breadcrumb navigation and BreadcrumbList JSON-LD schema.
 * Improves navigation UX and helps search engines understand site structure.
 *
 * @param items - Array of breadcrumb items to display
 * @param currentPage - Optional name of the current page (shown as plain text, not a link)
 *
 * @example
 * ```tsx
 * <Breadcrumbs
 *   items={[
 *     { name: 'Products', href: '/products' },
 *     { name: 'Alfajores', href: '/products/category/alfajores' }
 *   ]}
 *   currentPage="Chocolate Alfajores"
 * />
 * ```
 *
 * @see https://schema.org/BreadcrumbList
 * @see https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 */
export function Breadcrumbs({ items, currentPage }: BreadcrumbsProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://destinosf.com';

  // Build complete breadcrumb list starting with Home
  const allItems: BreadcrumbItem[] = [{ name: 'Home', href: '/' }, ...items];

  // Generate BreadcrumbList JSON-LD schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      ...allItems.map((item, index) => ({
        '@type': 'ListItem' as const,
        position: index + 1,
        name: item.name,
        item: `${baseUrl}${item.href}`,
      })),
      // Add current page to schema if provided
      ...(currentPage
        ? [
            {
              '@type': 'ListItem' as const,
              position: allItems.length + 1,
              name: currentPage,
            },
          ]
        : []),
    ],
  };

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {/* Visual Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center space-x-2 text-sm text-gray-600 mb-4"
      >
        <ol className="flex items-center space-x-2" itemScope itemType="https://schema.org/BreadcrumbList">
          {allItems.map((item, index) => (
            <li
              key={item.href}
              className="flex items-center"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {index > 0 && (
                <ChevronRight
                  className="h-4 w-4 text-gray-400 mx-2"
                  aria-hidden="true"
                />
              )}
              <Link
                href={item.href}
                className="hover:text-amber-600 transition-colors inline-flex items-center"
                itemProp="item"
              >
                {index === 0 && (
                  <Home className="h-4 w-4 mr-1" aria-hidden="true" />
                )}
                <span itemProp="name">{item.name}</span>
              </Link>
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          ))}

          {/* Current Page (if provided) */}
          {currentPage && (
            <li
              className="flex items-center"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              aria-current="page"
            >
              <ChevronRight
                className="h-4 w-4 text-gray-400 mx-2"
                aria-hidden="true"
              />
              <span className="text-gray-900 font-medium" itemProp="name">
                {currentPage}
              </span>
              <meta itemProp="position" content={String(allItems.length + 1)} />
            </li>
          )}
        </ol>
      </nav>
    </>
  );
}
