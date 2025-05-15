<a href="https://demo-nextjs-with-supabase.vercel.app/">
  <img alt="Next.js and Supabase Starter Kit - the fastest way to build apps with Next.js and Supabase" src="https://demo-nextjs-with-supabase.vercel.app/opengraph-image.png">
  <h1 align="center">Next.js and Supabase Starter Kit</h1>
</a>

<p align="center">
 The fastest way to build apps with Next.js and Supabase
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#demo"><strong>Demo</strong></a> ·
  <a href="#deploy-to-vercel"><strong>Deploy to Vercel</strong></a> ·
  <a href="#clone-and-run-locally"><strong>Clone and run locally</strong></a> ·
  <a href="#feedback-and-issues"><strong>Feedback and issues</strong></a>
  <a href="#more-supabase-examples"><strong>More Examples</strong></a>
</p>
<br/>

## Features

- Works across the entire [Next.js](https://nextjs.org) stack
  - App Router
  - Pages Router
  - Middleware
  - Client
  - Server
  - It just works!
- supabase-ssr. A package to configure Supabase Auth to use cookies
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components with [shadcn/ui](https://ui.shadcn.com/)
- Optional deployment with [Supabase Vercel Integration and Vercel deploy](#deploy-your-own)
  - Environment variables automatically assigned to Vercel project

## Demo

You can view a fully working demo at [demo-nextjs-with-supabase.vercel.app](https://demo-nextjs-with-supabase.vercel.app/).

## Deploy to Vercel

Vercel deployment will guide you through creating a Supabase account and project.

After installation of the Supabase integration, all relevant environment variables will be assigned to the project so the deployment is fully functioning.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&project-name=nextjs-with-supabase&repository-name=nextjs-with-supabase&demo-title=nextjs-with-supabase&demo-description=This+starter+configures+Supabase+Auth+to+use+cookies%2C+making+the+user%27s+session+available+throughout+the+entire+Next.js+app+-+Client+Components%2C+Server+Components%2C+Route+Handlers%2C+Server+Actions+and+Middleware.&demo-url=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2F&external-id=https%3A%2F%2Fgithub.com%2Fvercel%2Fnext.js%2Ftree%2Fcanary%2Fexamples%2Fwith-supabase&demo-image=https%3A%2F%2Fdemo-nextjs-with-supabase.vercel.app%2Fopengraph-image.png)

The above will also clone the Starter kit to your GitHub, you can clone that locally and develop locally.

If you wish to just develop locally and not deploy to Vercel, [follow the steps below](#clone-and-run-locally).

## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

   ```
   NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[INSERT SUPABASE PROJECT API ANON KEY]
   ```

   Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can be found in [your Supabase project's API settings](https://app.supabase.com/project/_/settings/api)

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)

## Square Integration

### Product Sync

The application syncs products from Square to the local database using the Square API. This ensures that product information is always up-to-date with what's in Square.

### Manual Payment Options

In addition to Square payment processing, the application now supports manual payment methods:

1. **Venmo**: Customers can choose to pay via Venmo and receive detailed payment instructions.
2. **Cash**: For pickup orders, customers can choose to pay with cash upon pickup.

#### Implementation Details

- A `PaymentMethod` enum was added to the database schema with values `SQUARE`, `VENMO`, and `CASH`.
- The `PaymentMethodSelector` component allows users to select their preferred payment method during checkout.
- Manual payments follow a different flow than Square payments, collecting order information first and then updating the payment method.
- Payment-specific success pages provide customers with relevant instructions based on their selected payment method.
- Email confirmations are sent using Resend API with detailed payment instructions.

### Catering Categories Integration

The application now supports syncing catering categories from Square. This functionality allows for better organization of catering items in the system.

#### Features

- **Automatic Category Detection**: Identifies categories that start with "CATERING" or "CATERING-" prefixes in Square
- **Category Mapping**: Maps Square catering categories to the `CateringItemCategory` enum in the database schema
- **Catering Items Sync**: Automatically syncs catering items to the appropriate categories
- **Mapping Persistence**: Stores category mappings in `catering-categories-mapping.json` for future reference

#### Category Mapping

The system maps Square catering categories to the following `CateringItemCategory` enum values:

- STARTER (for appetizers, starters)
- ENTREE (for main dishes, entrees)
- SIDE (for side dishes, platters)
- SALAD (for salads)
- DESSERT (for desserts)
- BEVERAGE (for drinks)

#### Using the Sync Script

To sync both regular products and catering categories/items from Square, run:

```bash
node src/scripts/sync-production.mjs
```

This script will:
1. Fetch all categories from Square
2. Process and identify catering vs. regular categories
3. Sync regular categories to the Product/Category models
4. Map catering categories to appropriate types
5. Sync products and catering items

### Email Notifications

Order confirmation emails are sent automatically using Resend API (https://resend.com) and include:
- Order details (ID, status, total)
- Payment method information
- Specific instructions for Venmo and Cash payments
- Beautifully formatted HTML templates

To configure email sending, set the following environment variables:
```
RESEND_API_KEY=your_resend_api_key
SHOP_NAME=Destino SF
FROM_EMAIL=orders@destino-sf.com
```

### Restrictions

- Cash payment is only available for pickup orders, not for delivery or shipping.
- Venmo payments include the order ID in the payment note for tracking purposes.
- Service fees are waived for manual payment methods.
