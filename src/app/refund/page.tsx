import React from 'react';
import Head from 'next/head';
import { twMerge } from 'tailwind-merge';

const RefundPolicyPage: React.FC = () => {
  return (
    <div className={twMerge('w-full max-w-full px-4 py-8 bg-white text-gray-900')}>
      <Head>
        <title>Refund Policy | Destino</title>
        <meta name="description" content="Refund Policy for Destino San Francisco" />
      </Head>

      <main className={twMerge('flex flex-col gap-8')}>
        <h1 className={twMerge('text-4xl font-extrabold mb-6 text-center')}>Refund Policy</h1>

        <section className="mb-8">
          <p className="mb-4">
            We have a <span className="font-semibold">14-day return policy</span>, which means you
            have
            <span className="font-semibold"> 14 </span>
            days after receiving your item to request a return.
          </p>

          <p className="mb-4">
            To be eligible for a return, your item must be in the same condition that you received
            it, unworn or unused, with tags, and in its original packaging. You&apos;ll also need
            the receipt or proof of purchase.
          </p>

          <p className="mb-4">
            To start a return, you can contact us at{' '}
            <a
              href="mailto:james@destinosf.com"
              className="text-blue-600 underline hover:text-blue-800"
            >
              james@destinosf.com
            </a>
            . If your return is accepted, we&apos;ll send you a return shipping label, as well as
            instructions on how and where to send your package. Items sent back to us without first
            requesting a return will not be accepted.
          </p>

          <p className="mb-4">
            You can always contact us for any return question at{' '}
            <a
              href="mailto:james@destinosf.com"
              className="text-blue-600 underline hover:text-blue-800"
            >
              james@destinosf.com
            </a>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Damages and Issues</h2>
          <p className="mb-4">
            Please inspect your order upon reception and contact us immediately if the item is
            defective, damaged or if you receive the wrong item, so that we can evaluate the issue
            and make it right.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Exceptions / Non-Returnable Items</h2>
          <p className="mb-4">
            Certain types of items cannot be returned, like perishable goods (such as food, flowers,
            or plants), custom products (such as special orders or personalized items), and personal
            care goods (such as beauty products). We also do not accept returns for hazardous
            materials, flammable liquids, or gases. Please get in touch if you have questions or
            concerns about your specific item.
          </p>

          <p className="mb-4">
            Unfortunately, we cannot accept returns on sale items or gift cards.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Exchanges</h2>
          <p className="mb-4">
            The fastest way to ensure you get what you want is to return the item you have, and once
            the return is accepted, make a separate purchase for the new item.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-3">Refunds</h2>
          <p className="mb-4">
            We will notify you once we&apos;ve received and inspected your return, and let you know
            if the refund was approved or not. If approved, you&apos;ll be automatically refunded on
            your original payment method. Please remember it can take some time for your bank or
            credit card company to process and post the refund too.
          </p>
        </section>
      </main>
    </div>
  );
};

export default RefundPolicyPage;
