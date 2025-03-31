// src/lib/square/client.ts
import { SquareClient, SquareEnvironment } from 'square';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Square client config
const config = {
  environment: process.env.NODE_ENV === 'production' 
    ? SquareEnvironment.Production 
    : SquareEnvironment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  userAgentDetail: "destino-sf" 
};

// Configure instance of Square client
const squareClient = new SquareClient(config);

export default squareClient;