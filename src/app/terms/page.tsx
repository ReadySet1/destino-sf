import React from 'react';
import Head from 'next/head';
import { twMerge } from 'tailwind-merge';

const TermsOfServicePage: React.FC = () => {
  // Helper component for sections for structure
  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <div className="space-y-4 text-gray-700">{children}</div>
    </section>
  );

  return (
    <div className={twMerge('w-full px-4 py-12 bg-white text-gray-900 font-quicksand')}>
      <Head>
        <title>Terms of Service | Destino</title>
        <meta name="description" content="Terms of Service for CHASQUI LLC (dba DESTINO)" />
      </Head>

      <main className={twMerge('flex flex-col gap-8')}>
        <h1 className={twMerge('text-4xl font-bold mb-6 text-center')}>TERMS OF SERVICE</h1>

        <Section title="Overview">
          <p>
            This website is operated by CHASQUI LLC (dba DESTINO). Throughout the site, the terms
            &quot;we,&quot; &quot;us,&quot; and &quot;our&quot; refer to DESTINO.
          </p>
          <p>
            DESTINO offers this website, including all information, tools, and services available
            from this site to you, the user, conditioned upon your acceptance of all terms,
            conditions, policies, and notices stated here.
          </p>
          <p>
            By visiting our Site and/or purchasing something from us, you engage in our
            &quot;Service&quot; and agree to be bound by these Terms of Service (&quot;Terms&quot;),
            including any additional terms and policies referenced herein or available by hyperlink.
            These Terms of Service apply to all users of the site, including browsers, vendors,
            customers, merchants, and contributors of content.
          </p>
          <p>
            Please read these Terms of Service carefully before accessing or using our website. By
            accessing or using any part of the site, you agree to be bound by these Terms. If you do
            not agree to all the terms and conditions of this agreement, you may not access the
            website or use any services.
          </p>
          <p>
            Any new features or tools added to the current store shall also be subject to these
            Terms. You can review the most current version of the Terms of Service at any time on
            this page.
          </p>
          <p>
            We reserve the right to update, change, or replace any part of these Terms by posting
            updates or changes to our website. It is your responsibility to check this page
            periodically for changes. Your continued use of or access to the website following the
            posting of any changes constitutes acceptance of those changes.
          </p>
          <p>Our online store and payment services are provided through Square.</p>
        </Section>

        <Section title="Section 1 – Online Store Terms">
          <p>
            By agreeing to these Terms of Service, you confirm that you are at least the age of
            majority in your state or province of residence, or that you are the age of majority and
            have given us your consent to allow any minor dependents to use this Site.
          </p>
          <p>
            You may not use our products for any illegal or unauthorized purpose, nor may you, in
            the use of the Service, violate any laws in your jurisdiction (including but not limited
            to copyright laws).
          </p>
          <p>You must not transmit any worms, viruses, or any code of a destructive nature.</p>
          <p>
            A breach or violation of any of the Terms will result in an immediate termination of
            your Services.
          </p>
        </Section>

        <Section title="Section 2 – General Conditions">
          <p>We reserve the right to refuse service to anyone for any reason at any time.</p>
          <p>
            You understand that your content (excluding credit card information) may be transferred
            unencrypted and may involve transmissions over various networks and changes to conform
            and adapt to technical requirements of connecting networks or devices. Credit card
            information is always encrypted during transfer over networks.
          </p>
          <p>
            You agree not to reproduce, duplicate, copy, sell, resell, or exploit any portion of the
            Service without express written permission by us.
          </p>
          <p>
            The headings used in this agreement are included for convenience only and will not limit
            or otherwise affect these Terms.
          </p>
        </Section>

        <Section title="Section 3 – Accuracy, Completeness, and Timeliness of Information">
          <p>
            We are not responsible if information made available on this Site is not accurate,
            complete, or current. The material is provided for general information only and should
            not be relied upon without consulting more accurate, complete, or timely sources of
            information. Any reliance on the material on this Site is at your own risk.
          </p>
          <p>
            Historical information may not be current and is provided for reference only. We reserve
            the right to modify the Site&apos;s contents at any time but are not obligated to update
            any information. It is your responsibility to monitor changes to our Site.
          </p>
        </Section>

        <Section title="Section 4 – Modifications to the Service and Prices">
          <p>Prices for our products are subject to change without notice.</p>
          <p>
            We reserve the right to modify or discontinue the Service (or any part of it) without
            notice at any time.
          </p>
          <p>
            We are not liable for any modification, price change, suspension, or discontinuance of
            the Service.
          </p>
        </Section>

        <Section title="Section 5 – Products or Services">
          <p>
            Certain products or services may be available exclusively online through our Site. They
            may have limited quantities and are subject to return or exchange according to our
            Return Policy.
          </p>
          <p>
            We strive to display product colors and images as accurately as possible but cannot
            guarantee color accuracy on your monitor.
          </p>
          <p>
            We reserve the right to limit sales geographically, by jurisdiction, or on a
            case-by-case basis. We also reserve the right to limit quantities and discontinue
            products at any time.
          </p>
          <p>
            We do not guarantee that the quality of products, services, or information purchased
            will meet your expectations.
          </p>
        </Section>

        <Section title="Section 6 – Accuracy of Billing and Account Information">
          <p>
            We reserve the right to refuse any order you place with us. We may limit or cancel
            quantities purchased per person, per household, or per order.
          </p>
          <p>
            If we modify or cancel an order, we may attempt to notify you using the contact
            information you provided.
          </p>
          <p>
            You agree to provide current, complete, and accurate account information for all
            purchases. You agree to promptly update your account and other information.
          </p>
        </Section>

        <Section title="Section 7 – Optional Tools">
          <p>
            We may provide access to third-party tools &quot;as is&quot; and &quot;as
            available&quot; without warranties or endorsement.
          </p>
          <p>
            Your use of optional tools is entirely at your own risk. Future new features or services
            will also be subject to these Terms.
          </p>
        </Section>

        <Section title="Section 8 – Third-Party Links">
          <p>
            Certain content, products, and services available through our Service may include
            materials from third parties.
          </p>
          <p>
            Third-party links on our Site may direct you to third-party websites. We are not
            responsible for their content or accuracy.
          </p>
          <p>
            Complaints or concerns regarding third-party products should be directed to the third
            party.
          </p>
        </Section>

        <Section title="Section 9 – User Comments, Feedback, and Other Submissions">
          <p>You agree that any comments you send us may be used by us without restriction.</p>
          <p>
            We may monitor, edit, or remove unlawful, offensive, or objectionable content but are
            not obligated to do so.
          </p>
          <p>You are solely responsible for any comments you post.</p>
        </Section>

        <Section title="Section 10 – Personal Information">
          <p>Your submission of personal information is governed by our Privacy Policy.</p>
        </Section>

        <Section title="Section 11 – Errors, Inaccuracies, and Omissions">
          <p>
            We reserve the right to correct any errors, inaccuracies, or omissions and to change or
            update information at any time without prior notice.
          </p>
        </Section>

        <Section title="Section 12 – Prohibited Uses">
          <p>
            You are prohibited from using the Site or its content for any unlawful purpose or to
            violate any applicable laws, infringe intellectual property, harass others, submit false
            information, upload viruses, collect personal information, spam, or interfere with
            security features.
          </p>
          <p>We may terminate your use of the Service for violating any prohibited uses.</p>
        </Section>

        <Section title="Section 13 – Disclaimer of Warranties; Limitation of Liability">
          <p>We do not guarantee that use of the Service will be uninterrupted or error-free.</p>
          <p>You agree that your use of the Service is at your sole risk.</p>
          <p>
            In no case shall CHASQUI LLC (dba DESTINO) be liable for any damages arising from your
            use of the Service.
          </p>
        </Section>

        <Section title="Section 14 – Indemnification">
          <p>
            You agree to indemnify and hold harmless CHASQUI LLC (dba DESTINO) and affiliates from
            any claim arising out of your breach of these Terms.
          </p>
        </Section>

        <Section title="Section 15 – Severability">
          <p>
            If any provision is determined to be unlawful, it shall be severed without affecting the
            validity of the remaining provisions.
          </p>
        </Section>

        <Section title="Section 16 – Termination">
          <p>
            These Terms are effective until terminated by either party. We may terminate your access
            without notice if you fail to comply with these Terms.
          </p>
        </Section>

        <Section title="Section 17 – Entire Agreement">
          <p>
            These Terms and any posted policies constitute the entire agreement between you and us.
          </p>
        </Section>

        <Section title="Section 18 – Governing Law">
          <p>
            These Terms are governed by the laws of the United States and the State of California.
          </p>
        </Section>

        <Section title="Section 19 – Changes to Terms of Service">
          <p>
            We reserve the right to update, change, or replace any part of these Terms by posting
            updates to our Site.
          </p>
        </Section>

        <Section title="Section 20 – Contact Information">
          <p>Questions about the Terms of Service should be sent to us at:</p>
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
        </Section>
      </main>
    </div>
  );
};

export default TermsOfServicePage;
