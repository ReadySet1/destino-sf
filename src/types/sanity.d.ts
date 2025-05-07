/**
 * Custom declaration file to handle Sanity client type conflicts
 */

declare module '@sanity/client' {
  // This empty declaration allows us to import the module without TypeScript errors
}

declare module 'next-sanity' {
  import { SanityClient } from '@sanity/client';
  
  // Override defineLive to accept any client type
  export function defineLive(config: { client: any }): {
    sanityFetch: any;
    SanityLive: any;
  };
} 