
import { Router } from "express";
import { storage } from "./storage";
import type { Request, Response } from "express";

const router = Router();

// Configuração OAuth2 do Google
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "37890042726-6qv6v1bkkpfjg19jj5fgquodu0rojbrv.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "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";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://591e496f-c30b-4cb8-876f-8d6553abdc19-00-2qu6m3hoow55.worf.replit.dev/api/oauth2/callback";

const SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
];

// Inicia o fluxo OAuth2
router.get("/connect/google", (req: Request, res: Response) => {
  const companyId = req.query.company_id as string;
  
  if (!companyId) {
    return res.status(400).json({ error: "company_id is required" });
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", companyId); // Passa companyId no state

  res.redirect(authUrl.toString());
});

// Callback OAuth2
router.get("/oauth2/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const companyId = parseInt(state as string);

  if (!code || !companyId) {
    return res.status(400).send("Missing authorization code or company ID");
  }

  try {
    // Troca o code pelos tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Busca informações do usuário
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const userInfo = await userInfoResponse.json();

    // Busca as locations do Google Business Profile
    const accountsResponse = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    let googleAccountId = "";
    let googleLocationId = "";
    
    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      if (accountsData.accounts && accountsData.accounts.length > 0) {
        const account = accountsData.accounts[0];
        googleAccountId = account.name.split("/")[1]; // Extrai o ID da string "accounts/123456"
        
        // Busca locations desta conta
        const locationsResponse = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );
        
        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          if (locationsData.locations && locationsData.locations.length > 0) {
            const location = locationsData.locations[0];
            googleLocationId = location.name.split("/")[3]; // Extrai ID de "accounts/123/locations/456"
          }
        }
      }
    }

    // Calcula quando o token expira
    const tokenExpiry = new Date(Date.now() + expires_in * 1000);

    // Cria ou atualiza o GoogleProfile
    const profileData = {
      companyId,
      profileName: userInfo.email || "Google Business Profile",
      googleAccountId: googleAccountId || "unknown",
      googleLocationId: googleLocationId || "unknown",
      oauthRefreshTokenEncrypted: refresh_token || "",
      oauthAccessTokenEncrypted: access_token,
      tokenExpiry,
      isActive: true,
      lastSyncAt: new Date(),
    };

    await storage.createGoogleProfile(profileData);

    // Redireciona para a página de perfis do Google
    res.redirect("/google-profiles");
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    res.status(500).send(`Error connecting to Google: ${error.message}`);
  }
});

export default router;
