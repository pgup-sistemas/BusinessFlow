// Database configuration - blueprint:javascript_database
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configuração do WebSocket para Neon
neonConfig.webSocketConstructor = ws;

// Desabilitar pipeline e TLS para evitar problemas de certificado em desenvolvimento
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;
neonConfig.useSecureWebSocket = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
