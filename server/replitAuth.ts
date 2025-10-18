// Replit Auth integration - blueprint:javascript_log_in_with_replit
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Validate required environment variables
if (!process.env.REPL_ID) {
  console.error("❌ ERRO CRÍTICO: REPL_ID não está configurado!");
  console.error("Para corrigir:");
  console.error("1. Acesse a aba 'Secrets' (ícone de cadeado)");
  console.error("2. Adicione a variável REPL_ID com o valor do ID deste Repl");
  console.error("3. Reinicie o servidor");
  throw new Error("REPL_ID é obrigatório para autenticação OAuth");
}

if (!process.env.REPLIT_DOMAINS) {
  console.error("❌ ERRO CRÍTICO: REPLIT_DOMAINS não está configurado!");
  throw new Error("REPLIT_DOMAINS é obrigatório para autenticação OAuth");
}

if (!process.env.SESSION_SECRET) {
  console.error("❌ ERRO CRÍTICO: SESSION_SECRET não está configurado!");
  throw new Error("SESSION_SECRET é obrigatório para sessões");
}

console.log("✅ Configuração OAuth validada com sucesso");
console.log(`📍 REPL_ID: ${process.env.REPL_ID.substring(0, 8)}...`);
console.log(`🌐 Domínios configurados: ${process.env.REPLIT_DOMAINS}`);

// Parse domains - remove protocol and paths
const rawDomains = process.env.REPLIT_DOMAINS!.split(",");
const parsedDomains = rawDomains.map(domain => {
  // Remove https://, http://, and any path
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim();
});

console.log(`🔍 Domínios parseados: ${parsedDomains.join(", ")}`);

const getOidcConfig = memoize(
  async () => {
    try {
      console.log("🔍 Descobrindo configuração OIDC...");
      const config = await client.discovery(
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        process.env.REPL_ID!,
        undefined,
        { execute: [client.allowInsecureRequests] } // Allow HTTP for development
      );
      console.log("✅ Configuração OIDC descoberta com sucesso");
      return config;
    } catch (error: any) {
      console.error("❌ Erro ao descobrir configuração OIDC:", error);
      console.error("❌ Stack trace:", error.stack);
      throw new Error(`Falha na configuração OAuth do Replit: ${error.message}`);
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of parsedDomains) {
    console.log(`📝 Registrando estratégia para domínio: ${domain}`);
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
        client: {
          client_id: process.env.REPL_ID!,
          token_endpoint_auth_method: "none", // Public client - no secret needed
        },
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Helper to ensure strategy exists for a hostname
  const ensureStrategy = async (hostname: string) => {
    const strategyName = `replitauth:${hostname}`;
    
    // Check if strategy already exists
    try {
      const existingStrategy = passport._strategies[strategyName];
      if (existingStrategy) {
        console.log(`✅ Estratégia já existe: ${strategyName}`);
        return strategyName;
      }
    } catch (e) {
      // Strategy doesn't exist, create it
      console.log(`⚠️ Erro ao verificar estratégia: ${e}`);
    }

    console.log(`📝 Registrando estratégia dinamicamente para: ${hostname}`);
    const strategy = new Strategy(
      {
        name: strategyName,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${hostname}/api/callback`,
        client: {
          client_id: process.env.REPL_ID!,
          token_endpoint_auth_method: "none", // Public client - no secret needed
        },
      },
      verify,
    );
    passport.use(strategy);
    console.log(`✅ Estratégia registrada com sucesso: ${strategyName}`);
    return strategyName;
  };

  app.get("/api/login", async (req, res, next) => {
    console.log(`🔐 Tentativa de login - Hostname: ${req.hostname}`);
    const strategyName = await ensureStrategy(req.hostname);
    console.log(`🔐 Estratégia buscada: ${strategyName}`);
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", async (req, res, next) => {
    console.log(`🔙 Callback OAuth - Hostname: ${req.hostname}`);
    console.log(`🔙 Query params:`, req.query);
    console.log(`🔙 Headers:`, req.headers);
    
    try {
      const strategyName = await ensureStrategy(req.hostname);
      console.log(`🔙 Estratégia buscada: ${strategyName}`);
      console.log(`🔙 Iniciando passport.authenticate...`);
      
      const authenticator = passport.authenticate(strategyName, (err: any, user: any, info: any) => {
        console.log(`🔙 Callback do authenticate invocado!`);
        console.log(`🔙 Erro: ${err}`);
        console.log(`🔙 User: ${JSON.stringify(user)}`);
        console.log(`🔙 Info:`, info);
        
        if (err) {
          console.error("❌ Erro no callback OAuth:", err);
          console.error("❌ Stack trace:", err.stack);
          return res.status(500).send(`
            <html>
              <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h1>❌ Erro de Autenticação</h1>
                <p><strong>Erro:</strong> ${err.message}</p>
                <p><strong>Detalhes:</strong> ${err.stack}</p>
                <p>Verifique se as variáveis de ambiente REPL_ID e REPLIT_DOMAINS estão configuradas corretamente.</p>
                <a href="/api/login">Tentar novamente</a>
              </body>
            </html>
          `);
        }
        
        if (!user) {
          console.error("❌ Falha na autenticação - sem usuário:", info);
          return res.redirect("/api/login");
        }
        
        console.log(`✅ Usuário autenticado, fazendo login...`);
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("❌ Erro ao fazer login:", loginErr);
            console.error("❌ Stack trace:", loginErr.stack);
            return next(loginErr);
          }
          console.log(`✅ Login realizado com sucesso! Redirecionando para /`);
          return res.redirect("/");
        });
      });
      
      console.log(`🔙 Executando authenticator...`);
      authenticator(req, res, next);
      console.log(`🔙 Authenticator executado`);
    } catch (error: any) {
      console.error("❌ Erro fatal no callback:", error);
      console.error("❌ Stack trace:", error.stack);
      res.status(500).send(`Erro ao processar callback OAuth: ${error.message}`);
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};