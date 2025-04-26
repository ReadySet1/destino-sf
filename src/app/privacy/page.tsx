import React from 'react';
import Head from 'next/head';
import { twMerge } from 'tailwind-merge';
import Link from 'next/link';

const PrivacyPolicyPage: React.FC = () => {
  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <div className="space-y-4 text-gray-700">{children}</div>
    </section>
  );

  return (
    <div className={twMerge('w-full px-4 py-12 bg-white text-gray-900 font-quicksand')}>
      <Head>
        <title>Privacy Policy | Destino</title>
        <meta name="description" content="Privacy Policy for CHASQUI LLC (dba DESTINO)" />
      </Head>

      <main className={twMerge('flex flex-col gap-8')}>
        <h1 className={twMerge('text-4xl font-bold mb-6 text-center')}>Privacy Policy</h1>

        <p className="text-base leading-relaxed">
          This Privacy Policy describes how&nbsp;
          <strong>CHASQUI LLC (dba DESTINO)</strong>&nbsp;(&quot;we,&quot; &quot;our,&quot; or
          &quot;the Site&quot;) collects, uses, and shares your Personal Information when you visit,
          interact with, or make a purchase from our online store, powered by Square.
        </p>
        <p className="text-base leading-relaxed">
          We respect your privacy and are committed to protecting your personal information. This
          Policy explains what we collect, how we use it, and the choices you have regarding your
          information. Thank you for trusting DESTINO to bring a little more Latin flavor to your
          table!
        </p>

        <Section title="Collecting Personal Information">
          <p>
            When you visit our Site, we collect certain information about your device, your
            interaction with the Site, and details necessary to process your purchases. We may also
            collect information when you contact us for customer support. In this Privacy Policy, we
            refer to any information that can uniquely identify an individual (as described below)
            as &quot;Personal Information.&quot;
          </p>
          <p>Here&apos;s what we collect and why:</p>

          <h3 className="text-xl font-semibold mt-6 mb-2">Device Information</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>Examples collected:</strong> Web browser version, IP address, time zone,
              cookie information, pages or products you view, search terms, and how you interact
              with the Site.
            </li>
            <li>
              <strong>Purpose of collection:</strong> To ensure the Site loads properly for you and
              to help us better understand and improve how visitors use our Site.
            </li>
            <li>
              <strong>Source of collection:</strong> Collected automatically using cookies, log
              files, web beacons, tags, or pixels.
            </li>
            <li>
              <strong>Disclosure for a business purpose:</strong> Shared with Square, our online
              shopping cart and payment processor.
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">Order Information</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>Examples collected:</strong> Name, billing address, shipping address, payment
              details (including credit card numbers), email address, and phone number.
            </li>
            <li>
              <strong>Purpose of collection:</strong> To fulfill your order — including processing
              payments, arranging shipping, providing invoices and order confirmations,
              communicating with you, and screening for potential fraud.
            </li>
            <li>
              <strong>Source of collection:</strong> Collected directly from you.
            </li>
            <li>
              <strong>Disclosure for a business purpose:</strong> Shared with Square for payment
              processing.
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">Customer Support Information</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>Examples collected:</strong> Information you provide when you contact us for
              help.
            </li>
            <li>
              <strong>Purpose of collection:</strong> To respond to your inquiries and provide
              customer support.
            </li>
            <li>
              <strong>Source of collection:</strong> Collected directly from you.
            </li>
          </ul>
        </Section>

        <Section title="Minors">
          <p>
            Our Site is not intended for individuals under the age of 18. We do not knowingly
            collect Personal Information from children. If you are a parent or guardian and believe
            that your child has provided us with Personal Information, please contact us at&nbsp;
            <a
              href="mailto:james@destinosf.com"
              className="text-blue-600 underline hover:text-blue-800"
            >
              james@destinosf.com
            </a>
            . We will promptly delete any information we have if we learn that it was collected
            without appropriate consent.
          </p>
        </Section>

        <Section title="Sharing Personal Information">
          <p>
            We share your Personal Information with trusted service providers to help us deliver our
            products and services to you, as described above. For example:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              We use <strong>Square</strong> to power our online store and securely process your
              payments. You can learn more about how Square handles your information here:&nbsp;
              <a
                href="https://squareup.com/us/en/legal/general/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                https://squareup.com/us/en/legal/general/privacy
              </a>
              .
            </li>
            <li>
              We may also share your Personal Information if required to comply with applicable laws
              and regulations, respond to a subpoena, search warrant, or other lawful request for
              information, or to otherwise protect our rights.
            </li>
          </ul>
          <p>We value your trust and will always work to keep your information secure.</p>
        </Section>

        <Section title="Behavioral Advertising">
          <p>
            We may use your Personal Information to provide you with marketing communications or
            advertisements we believe you&apos;ll enjoy. For example:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              We share information about how you use our Site, what you purchase, and how you
              interact with our ads on other websites (like Instagram and Facebook).
            </li>
            <li>
              Some of this information is collected directly with the help of cookies and similar
              technologies, depending on your preferences and location.
            </li>
          </ul>
          <p>
            You can learn more about how targeted advertising works by visiting the Network
            Advertising Initiative&apos;s educational page here:&nbsp;
            <a
              href="http://www.networkadvertising.org/understanding-online-advertising/how-does-it-work"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              http://www.networkadvertising.org/understanding-online-advertising/how-does-it-work
            </a>
            .
          </p>
          <p>Opting Out of Targeted Advertising:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>Facebook:</strong>&nbsp;
              <a
                href="https://www.facebook.com/settings/?tab=ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                https://www.facebook.com/settings/?tab=ads
              </a>
            </li>
            <li>
              You can also opt out of some advertising services by visiting the Digital Advertising
              Alliance&apos;s portal here:&nbsp;
              <a
                href="http://optout.aboutads.info/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                http://optout.aboutads.info/
              </a>
              .
            </li>
          </ul>
          <p>
            We believe in offering you transparency and control over your experience with DESTINO.
          </p>
        </Section>

        <Section title="Using Personal Information">
          <p>We use your Personal Information to help us provide our services to you, including:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Offering and delivering our products</li>
            <li>Processing your payments securely</li>
            <li>Fulfilling and shipping your orders</li>
            <li>Communicating with you about your order status</li>
            <li>Keeping you updated about new products, services, and special offers</li>
          </ul>
          <p>
            Everything we do with your information is aimed at making your DESTINO experience
            smooth, enjoyable, and secure.
          </p>
        </Section>

        <Section title="Your Rights (CCPA)">
          <p>
            If you are a resident of California, you have special rights under the California
            Consumer Privacy Act (CCPA), including the right to:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              Request access to the Personal Information we hold about you (the &quot;Right to
              Know&quot;)
            </li>
            <li>Request that we correct, update, or delete your Personal Information</li>
            <li>Request a copy of your information (the &quot;Right to Portability&quot;)</li>
          </ul>
          <p>
            To exercise any of these rights, you can contact us anytime at&nbsp;
            <a
              href="mailto:james@destinosf.com"
              className="text-blue-600 underline hover:text-blue-800"
            >
              james@destinosf.com
            </a>
            . If you would like to authorize someone else to make a request on your behalf, please
            contact us directly at the same email address.
          </p>
          <p>We respect your privacy rights and are happy to assist you.</p>
        </Section>

        <Section title="Cookies">
          <p>
            A cookie is a small piece of data that gets stored on your computer or device when you
            visit our Site. We use cookies to make your browsing experience better — for example, by
            remembering your preferences and helping the website load faster for you.
          </p>
          <p>We use cookies for a few key reasons:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>To help you navigate our store and complete your purchases</li>
            <li>To remember your login or region settings</li>
            <li>
              To analyze how our visitors use the Site, so we can continue improving your experience
            </li>
            <li>To support marketing and advertising efforts (when you consent)</li>
          </ul>
          <h3 className="text-xl font-semibold mt-6 mb-2">Types of Cookies We Use:</h3>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>Necessary Cookies:</strong> These are essential for the site to function
              properly (for example, allowing you to log in, add items to your cart, or complete a
              checkout).
            </li>
            <li>
              <strong>Performance and Analytics Cookies:</strong> These help us understand how
              people are using our Site so we can improve things like navigation and speed.
            </li>
            <li>
              <strong>Advertising Cookies:</strong> These allow us (and our partners) to deliver
              personalized ads based on your interests.
            </li>
          </ul>
          <p>
            <strong>Managing Your Cookies:</strong> Most browsers automatically accept cookies, but
            you can adjust your settings to decline or delete cookies if you prefer. To learn more
            about how to manage cookies, visit&nbsp;
            <a
              href="http://www.allaboutcookies.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              www.allaboutcookies.org
            </a>
            .
          </p>
          <p>
            <strong>Please note:</strong> If you block cookies, some parts of our website may not
            work correctly.
          </p>
        </Section>

        <Section title="Do Not Track">
          <p>
            Some web browsers offer a &quot;Do Not Track&quot; feature that lets you tell websites
            that you prefer not to have your online activity tracked. Currently, there is no
            consistent industry standard for responding to these signals, so we do not alter our
            data practices when we detect a &quot;Do Not Track&quot; request.
          </p>
          <p>
            We are committed to being transparent about how we collect and use your information, and
            we encourage you to manage your privacy settings through your browser if you wish.
          </p>
        </Section>

        <Section title="Changes to This Privacy Policy">
          <p>
            We may update this Privacy Policy from time to time to reflect changes to our practices,
            or for operational, legal, or regulatory reasons. When we make changes, we will update
            the &quot;Last Updated&quot; date at the top of this page so you can easily stay
            informed.
          </p>
          <p>
            We encourage you to review this Privacy Policy regularly to stay up to date on how we
            are protecting your information.
          </p>
        </Section>

        <Section title="Contact Information">
          <p>
            If you have any questions, concerns, or would like to make a complaint about how we
            handle your Personal Information, you can contact us at:
          </p>
          <ul className="list-none space-y-1 mt-2">
            <li>
              <strong>Email:</strong>&nbsp;
              <a
                href="mailto:james@destinosf.com"
                className="text-blue-600 underline hover:text-blue-800"
              >
                james@destinosf.com
              </a>
            </li>
            <li>
              <strong>Mailing Address:</strong>
              <br />
              CHASQUI LLC (dba DESTINO)
              <br />
              377 Corbett Avenue
              <br />
              San Francisco, CA 94114
              <br />
              United States
            </li>
          </ul>
          <p className="mt-4">
            We take privacy seriously and will do our best to address your concerns promptly.
          </p>
        </Section>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
