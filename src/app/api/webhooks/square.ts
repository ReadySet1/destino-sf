import { type NextApiRequest, type NextApiResponse } from 'next';
import { handleSquareWebhook } from '@/lib/square/webhooks';

export const config = {
  api: {
    bodyParser: {
      raw: true,
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Parse the raw body
    const rawBody = req.body;
    const body = JSON.parse(rawBody.toString());
    const modifiedReq = {
      ...req,
      body,
    };

    const result = await handleSquareWebhook(modifiedReq);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
} 