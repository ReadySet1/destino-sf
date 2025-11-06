import { FaqItem } from '@/data/faq-data';

interface FaqSchemaProps {
  items: FaqItem[];
}

/**
 * FAQ Schema Component
 *
 * Generates FAQPage JSON-LD structured data for search engines.
 * Helps FAQ content appear as rich snippets in search results.
 *
 * @param items - Array of FAQ items with question and answer
 *
 * @example
 * ```tsx
 * import { FaqSchema } from '@/components/seo/FaqSchema';
 * import { menuFaqData } from '@/data/faq-data';
 *
 * <FaqSchema items={menuFaqData} />
 * ```
 *
 * @see https://schema.org/FAQPage
 * @see https://developers.google.com/search/docs/appearance/structured-data/faqpage
 */
export function FaqSchema({ items }: FaqSchemaProps) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(faqSchema),
      }}
    />
  );
}
