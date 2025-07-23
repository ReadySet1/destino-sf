'use client';

/**
 * This route is responsible for the built-in authoring environment using Sanity Studio.
 * All routes under your studio path is handled by this file using Next.js' catch-all routes:
 * https://nextjs.org/docs/routing/dynamic-routes#catch-all-routes
 *
 * You can learn more about the next-sanity package here:
 * https://github.com/sanity-io/next-sanity
 */

import dynamic from 'next/dynamic';
import { NextStudio } from 'next-sanity/studio';
import config from '../../../../sanity.config';

// Dynamically import the NextStudio component with SSR disabled
const NextStudioComponent = dynamic(
  () => import('next-sanity/studio').then(mod => mod.NextStudio),
  {
    ssr: false,
  }
);

export default function StudioPage() {
  // Use the dynamically imported component
  return <NextStudioComponent config={config} />;
}
