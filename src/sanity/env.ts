export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-03-25';

// Clean and validate environment variables
function cleanEnvValue(value: string | undefined): string | undefined {
  if (!value) return value;
  // Remove any whitespace, newlines, and trim the value
  return value.replace(/[\r\n\t]/g, '').trim();
}

function validateProjectId(projectId: string): boolean {
  // Sanity project IDs can only contain a-z, 0-9, and dashes
  return /^[a-z0-9-]+$/.test(projectId);
}

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage);
  }
  return v;
}

// Clean the environment variables first
const rawDataset = cleanEnvValue(process.env.NEXT_PUBLIC_SANITY_DATASET);
const rawProjectId = cleanEnvValue(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
const rawToken = cleanEnvValue(process.env.NEXT_PUBLIC_SANITY_API_TOKEN);

export const dataset = assertValue(
  rawDataset,
  'Missing environment variable: NEXT_PUBLIC_SANITY_DATASET'
);

// Validate and clean project ID
const cleanProjectId = assertValue(
  rawProjectId,
  'Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID'
);

if (!validateProjectId(cleanProjectId)) {
  throw new Error(
    `Invalid NEXT_PUBLIC_SANITY_PROJECT_ID: "${cleanProjectId}". Project ID can only contain lowercase letters (a-z), numbers (0-9), and dashes.`
  );
}

export const projectId = cleanProjectId;

// Token is optional - only needed for content creation operations
export const token = rawToken;
