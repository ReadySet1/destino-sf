import React from 'react';
import Head from 'next/head';
import { twMerge } from 'tailwind-merge';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <section className={twMerge('mb-8')}>
    <h2 className={twMerge('text-2xl font-bold mb-4 border-b border-gray-200 pb-2')}>{title}</h2>
    {children}
  </section>
);

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className={twMerge('w-full max-w-full px-4 py-8 bg-white text-gray-900')}>
      <Head>
        <title>Privacy Policy | Destino</title>
        <meta name="description" content="Privacy Policy for Destino San Francisco" />
      </Head>

      <main className={twMerge('flex flex-col gap-8')}>
        <h1 className={twMerge('text-4xl font-extrabold mb-6 text-center')}>Privacy Policy</h1>

        <p className={twMerge('mb-6 text-lg')}>
          This Privacy Policy describes how destino-san-francisco.myshopify.com (the
          &quot;Site&quot; or &quot;we&quot;) collects, uses, and discloses your Personal
          Information when you visit or make a purchase from the Site.
        </p>

        <Section title="Collecting Personal Information">
          <p>
            When you visit the Site, we collect certain information about your device, your
            interaction with the Site, and information necessary to process your purchases. We may
            also collect additional information if you contact us for customer support. In this
            Privacy Policy, we refer to any information that can uniquely identify an individual
            (including the information below) as &quot;Personal Information&quot;. See the list
            below for more information about what Personal Information we collect and why.
          </p>

          <h3 className={twMerge('text-xl font-semibold mt-6 mb-2 underline')}>
            Device information
          </h3>
          <ul className={twMerge('list-disc pl-6 mb-4')}>
            <li>
              <strong>Examples of Personal Information collected:</strong> version of web browser,
              IP address, time zone, cookie information, what sites or products you view, search
              terms, and how you interact with the Site.
            </li>
            <li>
              <strong>Purpose of collection:</strong> to load the Site accurately for you, and to
              perform analytics on Site usage to optimize our Site.
            </li>
            <li>
              <strong>Source of collection:</strong> Collected automatically when you access our
              Site using cookies, log files, web beacons, tags, or pixels.
            </li>
            <li>
              <strong>Disclosure for a business purpose:</strong> shared with our processor Shopify.
            </li>
          </ul>

          <h3 className={twMerge('text-xl font-semibold mt-6 mb-2 underline')}>
            Order information
          </h3>
          <ul className={twMerge('list-disc pl-6 mb-4')}>
            <li>
              <strong>Examples of Personal Information collected:</strong> name, billing address,
              shipping address, payment information (including credit card numbers), email address,
              and phone number.
            </li>
            <li>
              <strong>Purpose of collection:</strong> to provide products or services to you to
              fulfill our contract, to process your payment information, arrange for shipping, and
              provide you with invoices and/or order confirmations, communicate with you, screen our
              orders for potential risk or fraud, and when in line with the preferences you have
              shared with us, provide you with information or advertising relating to our products
              or services.
            </li>
            <li>
              <strong>Source of collection:</strong> collected from you.
            </li>
            <li>
              <strong>Disclosure for a business purpose:</strong> shared with our processor Shopify.
            </li>
          </ul>

          <h3 className={twMerge('text-xl font-semibold mt-6 mb-2 underline')}>
            Customer support information
          </h3>
          <ul className={twMerge('list-disc pl-6 mb-4')}>
            <li>
              <strong>Purpose of collection:</strong> to provide customer support.
            </li>
            <li>
              <strong>Source of collection:</strong> collected from you.
            </li>
          </ul>
        </Section>

        <Section title="Minors">
          <p>
            The Site is not intended for individuals under the age of 18. We do not intentionally
            collect Personal Information from children. If you are the parent or guardian and
            believe your child has provided us with Personal Information, please contact us at the
            address below to request deletion.
          </p>
        </Section>

        <Section title="Sharing Personal Information">
          <p>
            We share your Personal Information with service providers to help us provide our
            services and fulfill our contracts with you, as described above. For example:
          </p>
          <ul className={twMerge('list-disc pl-6 mb-4')}>
            <li>
              We use Shopify to power our online store. You can read more about how Shopify uses
              your Personal Information here:{' '}
              <a
                href="https://www.shopify.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                https://www.shopify.com/legal/privacy
              </a>
              .
            </li>
            <li>
              We may share your Personal Information to comply with applicable laws and regulations,
              to respond to a subpoena, search warrant or other lawful request for information we
              receive, or to otherwise protect our rights.
            </li>
          </ul>
        </Section>

        <Section title="Behavioural Advertising">
          <p>
            As described above, we use your Personal Information to provide you with targeted
            advertisements or marketing communications we believe may be of interest to you. For
            example:
          </p>
          <ul className={twMerge('list-disc pl-6 mb-4')}>
            <li>
              We share information about your use of the Site, your purchases, and your interaction
              with our ads on other websites with our advertising partners. We collect and share
              some of this information directly with our advertising partners, and in some cases
              through the use of cookies or other similar technologies (which you may consent to,
              depending on your location).
            </li>
            <li>Instagram and Facebook</li>
          </ul>
          <p>
            For more information about how targeted advertising works, you can visit the Network
            Advertising Initiative&apos;s (&quot;NAI&quot;) educational page at{' '}
            <a
              href="http://www.networkadvertising.org/understanding-online-advertising/how-does-it-work"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              http://www.networkadvertising.org/understanding-online-advertising/how-does-it-work
            </a>
            .
          </p>
          <p>You can opt out of targeted advertising by:</p>
          <ul className={twMerge('list-disc pl-6 mb-4')}>
            <li>
              FACEBOOK -{' '}
              <a
                href="https://www.facebook.com/settings/?tab=ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                https://www.facebook.com/settings/?tab=ads
              </a>
            </li>
          </ul>
          <p>
            Additionally, you can opt out of some of these services by visiting the Digital
            Advertising Alliance&apos;s opt-out portal at:{' '}
            <a
              href="http://optout.aboutads.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              http://optout.aboutads.info/
            </a>
            .
          </p>
        </Section>

        <Section title="Using Personal Information">
          <p>
            We use your personal Information to provide our services to you, which includes:
            offering products for sale, processing payments, shipping and fulfillment of your order,
            and keeping you up to date on new products, services, and offers.
          </p>
        </Section>

        <Section title="CCPA">
          <p>
            If you are a resident of California, you have the right to access the Personal
            Information we hold about you (also known as the &apos;Right to Know&apos;), to port it
            to a new service, and to ask that your Personal Information be corrected, updated, or
            erased. If you would like to exercise these rights, please contact us through our
            shopify address/e-mail.
          </p>
          <p>
            If you would like to designate an authorized agent to submit these requests on your
            behalf, please contact us at the address below.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            A cookie is a small amount of information that&apos;s downloaded to your computer or
            device when you visit our Site. We use a number of different cookies, including
            functional, performance, advertising, and social media or content cookies. Cookies make
            your browsing experience better by allowing the website to remember your actions and
            preferences (such as login and region selection). This means you don&apos;t have to
            re-enter this information each time you return to the site or browse from one page to
            another. Cookies also provide information on how people use the website, for instance
            whether it&apos;s their first time visiting or if they are a frequent visitor.
          </p>
          <p>
            We use the following cookies to optimize your experience on our Site and to provide our
            services.
          </p>

          <h3 className={twMerge('text-xl font-semibold mt-6 mb-2 underline')}>
            Cookies Necessary for the Functioning of the Store
          </h3>
          <div className={twMerge('overflow-x-auto mb-6')}>
            <table className={twMerge('min-w-full border border-gray-200 text-sm')}>
              <thead>
                <tr>
                  <th className="px-4 py-2 border-b">Name</th>
                  <th className="px-4 py-2 border-b">Function</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 border-b">_ab</td>
                  <td className="px-4 py-2 border-b">Used in connection with access to admin.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">_secure_session_id</td>
                  <td className="px-4 py-2 border-b">
                    Used in connection with navigation through a storefront.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">cart</td>
                  <td className="px-4 py-2 border-b">Used in connection with shopping cart.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">cart_sig</td>
                  <td className="px-4 py-2 border-b">Used in connection with checkout.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">cart_ts</td>
                  <td className="px-4 py-2 border-b">Used in connection with checkout.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">checkout_token</td>
                  <td className="px-4 py-2 border-b">Used in connection with checkout.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">secret</td>
                  <td className="px-4 py-2 border-b">Used in connection with checkout.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">secure_customer_sig</td>
                  <td className="px-4 py-2 border-b">Used in connection with customer login.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">storefront_digest</td>
                  <td className="px-4 py-2 border-b">Used in connection with customer login.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">_shopify_u</td>
                  <td className="px-4 py-2 border-b">
                    Used to facilitate updating customer account information.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className={twMerge('text-xl font-semibold mt-6 mb-2 underline')}>
            Reporting and Analytics
          </h3>
          <div className={twMerge('overflow-x-auto mb-6')}>
            <table className={twMerge('min-w-full border border-gray-200 text-sm')}>
              <thead>
                <tr>
                  <th className="px-4 py-2 border-b">Name</th>
                  <th className="px-4 py-2 border-b">Function</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-2 border-b">_tracking_consent</td>
                  <td className="px-4 py-2 border-b">Tracking preferences.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">_landing_page</td>
                  <td className="px-4 py-2 border-b">Track landing pages</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">_orig_referrer</td>
                  <td className="px-4 py-2 border-b">Track landing pages</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">_s</td>
                  <td className="px-4 py-2 border-b">Shopify analytics.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">_shopify_s</td>
                  <td className="px-4 py-2 border-b">Shopify analytics.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">_shopify_sa_p</td>
                  <td className="px-4 py-2 border-b">
                    Shopify analytics relating to marketing & referrals.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">_shopify_sa_t</td>
                  <td className="px-4 py-2 border-b">
                    Shopify analytics relating to marketing & referrals.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">_shopify_y</td>
                  <td className="px-4 py-2 border-b">Shopify analytics.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 border-b">_y</td>
                  <td className="px-4 py-2 border-b">Shopify analytics.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            The length of time that a cookie remains on your computer or mobile device depends on
            whether it is a &quot;persistent&quot; or &quot;session&quot; cookie. Session cookies
            last until you stop browsing and persistent cookies last until they expire or are
            deleted. Most of the cookies we use are persistent and will expire between 30 minutes
            and two years from the date they are downloaded to your device.
          </p>
          <p>
            You can control and manage cookies in various ways. Please keep in mind that removing or
            blocking cookies can negatively impact your user experience and parts of our website may
            no longer be fully accessible.
          </p>
          <p>
            Most browsers automatically accept cookies, but you can choose whether or not to accept
            cookies through your browser controls, often found in your browser&apos;s
            &quot;Tools&quot; or &quot;Preferences&quot; menu. For more information on how to modify
            your browser settings or how to block, manage or filter cookies can be found in your
            browser&apos;s help file or through such sites as{' '}
            <a
              href="http://www.allaboutcookies.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              www.allaboutcookies.org
            </a>
            .
          </p>
          <p>
            Additionally, please note that blocking cookies may not completely prevent how we share
            information with third parties such as our advertising partners. To exercise your rights
            or opt-out of certain uses of your information by these parties, please follow the
            instructions in the &quot;Behavioural Advertising&quot; section above.
          </p>
        </Section>

        <Section title="Do Not Track">
          <p>
            Please note that because there is no consistent industry understanding of how to respond
            to &quot;Do Not Track&quot; signals, we do not alter our data collection and usage
            practices when we detect such a signal from your browser.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update this Privacy Policy from time to time in order to reflect, for example,
            changes to our practices or for other operational, legal, or regulatory reasons.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For more information about our privacy practices, if you have questions, or if you would
            like to make a complaint, please contact us by e-mail at [email address] or by mail
            using the details provided below:
          </p>
          <p className={twMerge('mt-2 font-medium')}>
            Destino, 377 Corbett Avenue, San Francisco CA 94114, United States
          </p>
          <p>
            If you are not satisfied with our response to your complaint, you have the right to
            lodge your complaint with the relevant data protection authority. You can contact your
            local data protection authority, or our supervisory authority here: [ADD CONTACT
            INFORMATION OR WEBSITE FOR THE DATA PROTECTION AUTHORITY IN YOUR JURISDICTION. FOR
            EXAMPLE: https://ico.org.uk/make-a-complaint/]
          </p>
        </Section>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
