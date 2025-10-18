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
console.log(`🌐 Domínios: ${process.env.REPLIT_DOMAINS}`);

const getOidcConfig = memoize(
  async () => {
    try {
      return await client.discovery(
        new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
        process.env.REPL_ID!
      );
    } catch (error) {
      console.error("❌ Erro ao descobrir configuração OIDC:", error);
      throw new Error("Falha na configuração OAuth do Replit");
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

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
      failureMessage: true,
    }, (err, user, info) => {
      if (err) {
        console.error("❌ Erro no callback OAuth:", err);
        return res.status(500).send(`
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h1>❌ Erro de Autenticação</h1>
              <p><strong>Erro:</strong> ${err.message}</p>
              <p>Verifique se as variáveis de ambiente REPL_ID e REPLIT_DOMAINS estão configuradas corretamente.</p>
              <a href="/api/login">Tentar novamente</a>
            </body>
          </html>
        `);
      }
      if (!user) {
        console.error("❌ Falha na autenticação:", info);
        return res.redirect("/api/login");
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error("❌ Erro ao fazer login:", err);
          return next(err);
        }
        return res.redirect("/");
      });
    })(req, res, next);
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