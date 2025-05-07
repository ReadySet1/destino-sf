// Use require syntax for compatibility
const { createClient } = require('@sanity/client');

import { apiVersion, dataset, projectId, token } from '../env';

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Disabled CDN to prevent stale data in admin section
  token, // Add token for write access
});
