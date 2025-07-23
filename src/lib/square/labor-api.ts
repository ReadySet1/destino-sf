import { logger } from '@/utils/logger';
import https from 'https';
import type { ScheduledShift, Timecard } from '@/types/square';

/**
 * Sanitizes a Square API token by removing whitespace and invalid characters
 */
function sanitizeToken(token: string): string {
  if (!token) return '';
  return token.trim().replace(/[\r\n\t\s]/g, '');
}

/**
 * Validates that a token has the correct format for Square API
 */
function validateToken(token: string): boolean {
  if (!token) return false;
  const tokenPattern = /^[A-Za-z0-9_-]+$/;
  return tokenPattern.test(token);
}

// Function to get the current Square configuration
function getSquareConfig() {
  const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';

  let accessToken;
  let tokenSource;

  if (useSandbox) {
    accessToken = process.env.SQUARE_SANDBOX_TOKEN;
    tokenSource = 'SQUARE_SANDBOX_TOKEN';
  } else if (process.env.NODE_ENV === 'production') {
    accessToken = process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;
    tokenSource = process.env.SQUARE_PRODUCTION_TOKEN
      ? 'SQUARE_PRODUCTION_TOKEN'
      : 'SQUARE_ACCESS_TOKEN';
  } else {
    accessToken = process.env.SQUARE_ACCESS_TOKEN;
    tokenSource = 'SQUARE_ACCESS_TOKEN';
  }

  // Validate and sanitize the token
  if (accessToken) {
    const sanitizedToken = sanitizeToken(accessToken);

    if (!validateToken(sanitizedToken)) {
      logger.error(`Invalid token format from ${tokenSource}. Token length: ${accessToken.length}`);
      throw new Error(
        `Invalid Square token format from ${tokenSource}. Please check your environment variables.`
      );
    }

    accessToken = sanitizedToken;
  }

  const apiHost = useSandbox ? 'sandbox.squareup.com' : 'connect.squareup.com';

  return {
    useSandbox,
    accessToken,
    apiHost,
    tokenSource,
  };
}

/**
 * Makes an HTTPS request to the Square API
 */
async function httpsRequest(options: any, requestBody?: any): Promise<any> {
  const squareConfig = getSquareConfig();

  if (!squareConfig.accessToken) {
    throw new Error(`Square access token not configured for ${squareConfig.tokenSource}`);
  }

  if (options.headers) {
    options.headers['Authorization'] = `Bearer ${squareConfig.accessToken}`;
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        } else {
          if (res.statusCode === 401) {
            logger.error(`Authentication error with token from ${squareConfig.tokenSource}`);
          }
          reject(new Error(`Request failed with status: ${res.statusCode}, body: ${data}`));
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (requestBody) {
      req.write(JSON.stringify(requestBody));
    }

    req.end();
  });
}

/**
 * NEW: Create a scheduled shift (Beta feature from 2025-05-21)
 */
export async function createScheduledShift(requestBody: {
  scheduled_shift: Partial<ScheduledShift>;
}): Promise<{ result: { scheduled_shift: ScheduledShift } }> {
  const squareConfig = getSquareConfig();

  logger.info(`Creating scheduled shift on ${squareConfig.apiHost}`);

  const options = {
    hostname: squareConfig.apiHost,
    path: '/v2/labor/scheduled-shifts',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${squareConfig.accessToken}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await httpsRequest(options, requestBody);
    return {
      result: {
        scheduled_shift: response.scheduled_shift,
      },
    };
  } catch (error) {
    logger.error('Error creating scheduled shift:', error);
    throw error;
  }
}

/**
 * NEW: Update a scheduled shift
 */
export async function updateScheduledShift(
  shiftId: string,
  requestBody: {
    scheduled_shift: Partial<ScheduledShift>;
  }
): Promise<{ result: { scheduled_shift: ScheduledShift } }> {
  const squareConfig = getSquareConfig();

  logger.info(`Updating scheduled shift ${shiftId} on ${squareConfig.apiHost}`);

  const options = {
    hostname: squareConfig.apiHost,
    path: `/v2/labor/scheduled-shifts/${shiftId}`,
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${squareConfig.accessToken}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await httpsRequest(options, requestBody);
    return {
      result: {
        scheduled_shift: response.scheduled_shift,
      },
    };
  } catch (error) {
    logger.error(`Error updating scheduled shift ${shiftId}:`, error);
    throw error;
  }
}

/**
 * NEW: Search scheduled shifts
 */
export async function searchScheduledShifts(requestBody: {
  query?: {
    filter?: {
      location_ids?: string[];
      team_member_ids?: string[];
      start_at_min?: string;
      start_at_max?: string;
    };
  };
  limit?: number;
  cursor?: string;
}): Promise<{ result: { scheduled_shifts?: ScheduledShift[]; cursor?: string } }> {
  const squareConfig = getSquareConfig();

  logger.info(`Searching scheduled shifts on ${squareConfig.apiHost}`);

  const options = {
    hostname: squareConfig.apiHost,
    path: '/v2/labor/scheduled-shifts/search',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${squareConfig.accessToken}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await httpsRequest(options, requestBody);
    return {
      result: {
        scheduled_shifts: response.scheduled_shifts || [],
        cursor: response.cursor,
      },
    };
  } catch (error) {
    logger.error('Error searching scheduled shifts:', error);
    throw error;
  }
}

/**
 * NEW: Create timecard (replaces deprecated CreateShift)
 */
export async function createTimecard(requestBody: {
  timecard: Partial<Timecard>;
}): Promise<{ result: { timecard: Timecard } }> {
  const squareConfig = getSquareConfig();

  logger.info(`Creating timecard on ${squareConfig.apiHost}`);

  const options = {
    hostname: squareConfig.apiHost,
    path: '/v2/labor/timecards',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${squareConfig.accessToken}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await httpsRequest(options, requestBody);
    return {
      result: {
        timecard: response.timecard,
      },
    };
  } catch (error) {
    logger.error('Error creating timecard:', error);
    throw error;
  }
}

/**
 * NEW: Search timecards (replaces deprecated SearchShifts)
 */
export async function searchTimecards(requestBody: {
  query?: {
    filter?: {
      location_ids?: string[];
      team_member_ids?: string[];
      start_at_min?: string;
      start_at_max?: string;
    };
  };
  limit?: number;
  cursor?: string;
}): Promise<{ result: { timecards?: Timecard[]; cursor?: string } }> {
  const squareConfig = getSquareConfig();

  logger.info(`Searching timecards on ${squareConfig.apiHost}`);

  const options = {
    hostname: squareConfig.apiHost,
    path: '/v2/labor/timecards/search',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${squareConfig.accessToken}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await httpsRequest(options, requestBody);
    return {
      result: {
        timecards: response.timecards || [],
        cursor: response.cursor,
      },
    };
  } catch (error) {
    logger.error('Error searching timecards:', error);
    throw error;
  }
}

/**
 * NEW: Retrieve timecard by ID (replaces deprecated GetShift)
 */
export async function retrieveTimecard(
  timecardId: string
): Promise<{ result: { timecard: Timecard } }> {
  const squareConfig = getSquareConfig();

  logger.info(`Retrieving timecard ${timecardId} from ${squareConfig.apiHost}`);

  const options = {
    hostname: squareConfig.apiHost,
    path: `/v2/labor/timecards/${timecardId}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${squareConfig.accessToken}`,
      'Square-Version': '2025-05-21',
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await httpsRequest(options);
    return {
      result: {
        timecard: response.timecard,
      },
    };
  } catch (error) {
    logger.error(`Error retrieving timecard ${timecardId}:`, error);
    throw error;
  }
}

/**
 * Direct Labor API implementation object
 */
export const directLaborApi = {
  createScheduledShift,
  updateScheduledShift,
  searchScheduledShifts,
  createTimecard,
  searchTimecards,
  retrieveTimecard,
};
