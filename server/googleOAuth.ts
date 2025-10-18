import { Router } from "express";
import { storage } from "./storage";
import type { Request, Response } from "express";

const router = Router();

const SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
];

// Default fallback credentials
const DEFAULT_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "37890042726-6qv6v1bkkpfjg19jj5fgquodu0rojbrv.apps.googleusercontent.com";
const DEFAULT_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "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";
const DEFAULT_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "https://591e496f-c30b-4cb8-876f-8d6553abdc19-00-2qu6m3hoow55.worf.replit.dev/api/oauth2/callback";

// Inicia o fluxo OAuth2
router.get("/connect/google", async (req: Request, res: Response) => {
  const companyId = req.query.company_id as string;

  if (!companyId) {
    return res.status(400).json({ error: "company_id is required" });
  }

  // Get company-specific OAuth credentials
  const company = await storage.getCompany(parseInt(companyId));
  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }

  const clientId = company.googleClientId || DEFAULT_CLIENT_ID;
  const redirectUri = company.googleRedirectUri || DEFAULT_REDIRECT_URI;

  if (!clientId) {
    return res.status(400).json({ 
      error: "Google OAuth credentials not configured for this company. Please configure them in Company Settings." 
    });
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", companyId);

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
    // Get company-specific credentials
    const company = await storage.getCompany(companyId);
    if (!company) {
      return res.status(404).send("Company not found");
    }

    const clientId = company.googleClientId || DEFAULT_CLIENT_ID;
    const clientSecret = company.googleClientSecret || DEFAULT_CLIENT_SECRET;
    const redirectUri = company.googleRedirectUri || DEFAULT_REDIRECT_URI;

    // Troca o code pelos tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
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

// Adicionar funções auxiliares para OAuth
export function getGoogleAuthUrl(companyId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: companyId,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return await response.json();
}

export async function getUserInfo(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.statusText}`);
  }

  return await response.json();
}

export async function getBusinessAccounts(accessToken: string) {
  const response = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get business accounts: ${response.statusText}`);
  }

  const data = await response.json();
  return data.accounts || [];
}

export async function getLocations(accessToken: string, accountName: string) {
  const response = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get locations: ${response.statusText}`);
  }

  const data = await response.json();
  return data.locations || [];
}

export async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  return await response.json();
}

export async function syncReviews(googleProfile: any) {
  try {
    // Refresh token if needed
    let accessToken = googleProfile.oauthAccessTokenEncrypted;
    if (new Date(googleProfile.tokenExpiry) < new Date()) {
      const tokens = await refreshAccessToken(googleProfile.oauthRefreshTokenEncrypted);
      accessToken = tokens.access_token;

      // Update token in database
      await storage.updateGoogleProfile(googleProfile.id, {
        oauthAccessTokenEncrypted: tokens.access_token,
        tokenExpiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
      });
    }

    // Fetch reviews from Google
    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${googleProfile.googleLocationId}/reviews`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch reviews: ${response.statusText}`);
    }

    const data = await response.json();
    const reviews = data.reviews || [];

    // Process each review
    for (const review of reviews) {
      // Check if review already exists
      const existingReview = await storage.getReviewByExternalId(review.reviewId);

      if (!existingReview) {
        // Create new review
        await storage.createReview({
          companyId: googleProfile.companyId,
          googleProfileId: googleProfile.id,
          externalId: review.reviewId,
          authorName: review.reviewer?.displayName || "Anônimo",
          rating: review.starRating === "FIVE" ? 5 :
                  review.starRating === "FOUR" ? 4 :
                  review.starRating === "THREE" ? 3 :
                  review.starRating === "TWO" ? 2 : 1,
          comment: review.comment || "",
          reviewDate: new Date(review.updateTime),
          status: "pending",
          priority: review.starRating === "ONE" || review.starRating === "TWO" ? "high" : "medium",
        });
      }
    }

    // Update last sync time
    await storage.updateGoogleProfile(googleProfile.id, {
      lastSyncAt: new Date(),
    });

    return reviews.length;
  } catch (error) {
    console.error("Error syncing reviews:", error);
    throw error;
  }
}

export default router;