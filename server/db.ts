// Database configuration - blueprint:javascript_database
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configuração do WebSocket para Neon
neonConfig.webSocketConstructor = ws;

// Configuração SSL para ambiente Replit (desenvolvimento e produção)
const isProduction = process.env.NODE_ENV === 'production';
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;
neonConfig.useSecureWebSocket = true; // Always use secure WebSocket
neonConfig.fetchEndpoint = (host) => {
  // Force HTTPS for all database operations
  return `https://${host}`;
};

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
