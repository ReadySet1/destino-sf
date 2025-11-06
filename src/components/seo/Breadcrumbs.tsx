import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  currentPage?: string;
  showCurrentPageOnMobile?: boolean;
}

/**
 * Breadcrumbs Component
 *
 * Provides visual breadcrumb navigation and BreadcrumbList JSON-LD schema.
 * Improves navigation UX and helps search engines understand site structure.
 *
 * @param items - Array of breadcrumb items to display
 * @param currentPage - Optional name of the current page (shown as plain text, not a link)
 * @param showCurrentPageOnMobile - Whether to show current page on mobile (default: false, hidden on mobile to save space)
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
export function Breadcrumbs({ items, currentPage, showCurrentPageOnMobile = false }: BreadcrumbsProps) {
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
        className="inline-flex items-center text-xs mb-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-md shadow-sm max-w-full overflow-x-auto"
      >
        <ol className="flex items-center space-x-1 text-gray-700 whitespace-nowrap" itemScope itemType="https://schema.org/BreadcrumbList">
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
                  className="h-3 w-3 text-gray-500 mx-1 flex-shrink-0"
                  aria-hidden="true"
                />
              )}
              <Link
                href={item.href}
                className="hover:text-destino-orange transition-colors inline-flex items-center font-medium"
                itemProp="item"
              >
                {index === 0 && (
                  <Home className="h-3 w-3 mr-1 flex-shrink-0" aria-hidden="true" />
                )}
                <span itemProp="name">{item.name}</span>
              </Link>
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          ))}

          {/* Current Page (if provided) */}
          {currentPage && (
            <li
              className={`flex items-center ${showCurrentPageOnMobile ? '' : 'hidden sm:flex'}`}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              aria-current="page"
            >
              <ChevronRight
                className="h-3 w-3 text-gray-500 mx-1 flex-shrink-0"
                aria-hidden="true"
              />
              <span className="text-gray-900 font-semibold truncate max-w-[200px] sm:max-w-[300px]" itemProp="name">
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
