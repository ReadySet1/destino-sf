import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy | Destino',
  description: 'Refund Policy for CHASQUI LLC (dba DESTINO)',
};

const RefundPolicyPage: React.FC = () => {
  // Helper component for sections for structure
  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <div className="space-y-4 text-gray-700">{children}</div>
    </section>
  );

  return (
    <div className={twMerge('w-full px-4 py-12 bg-white text-gray-900 font-quicksand')}>
      <main className={twMerge('flex flex-col gap-8')}>
        <h1 className={twMerge('text-4xl font-bold mb-6 text-center')}>Refund Policy</h1>

        <p className="text-base leading-relaxed">
          At DESTINO, we take great pride in the quality of our food and customer service. Due to
          the perishable nature of our products, we have a specialized refund and replacement policy
          as outlined below.
        </p>

        <Section title="Shipped Products (Alfajores, Empanadas, Sauces, and Other Food Items)">
          <p>All sales of food products are final.</p>
          <p>We do not accept returns or offer refunds once products have been shipped.</p>
          <p>
            However, if your order arrives damaged, is incorrect, or has any quality issues, please
            contact us within 24 hours of delivery at&nbsp;
            <a
              href="mailto:james@destinosf.com"
              className="text-blue-600 underline hover:text-blue-800"
            >
              james@destinosf.com
            </a>
            .
          </p>
          <p>
            To assist us, please include your order number, a description of the issue, and clear
            photos of the product and packaging.
          </p>
          <p>
            After reviewing your case, we may offer a replacement or store credit at our discretion.
          </p>
          <p>
            <strong>Please note:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              We pack our products carefully and use appropriate shipping materials to maintain
              temperature during transit.
            </li>
            <li>
              DESTINO is not responsible for delays caused by shipping carriers, weather conditions,
              or incorrect address information provided by the customer.
            </li>
          </ul>
        </Section>

        <Section title="Catering Orders (Direct Delivery)">
          <p>For catering deliveries, we inspect all orders carefully prior to handoff.</p>
          <p>
            If there is an issue with your catering order upon delivery, please notify our delivery
            team immediately, or contact us at&nbsp;
            <a
              href="mailto:james@destinosf.com"
              className="text-blue-600 underline hover:text-blue-800"
            >
              james@destinosf.com
            </a>
            &nbsp;at the time of delivery.
          </p>
          <p>
            We will review any concerns reported at the time of delivery and, if appropriate, may
            offer a store credit toward a future order at our discretion.
          </p>
          <p>
            After delivery has been accepted, all sales are final, and no refunds or adjustments can
            be made.
          </p>
        </Section>

        <Section title="Non-Returnable Items">
          <p>
            Because we sell perishable food items, we cannot accept returns on any shipped or
            delivered orders.
          </p>
          <p>Additionally, we do not accept returns on sale items or gift cards.</p>
        </Section>

        <p className="text-base leading-relaxed">
          We appreciate your understanding and support of our small business.
        </p>
        <p className="text-base leading-relaxed font-semibold text-center mt-4">
          Thank you for choosing DESTINO!
        </p>
      </main>
    </div>
  );
};

export default RefundPolicyPage;
