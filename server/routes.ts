import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { insertCompanySchema, insertTemplateSchema, insertGoogleProfileSchema } from "@shared/schema";
import { generateResponse, detectSentiment, detectLanguage } from "./services/geminiService";
import { moderateResponse, calculatePriority } from "./services/moderationService";
import { findBestTemplate, replacePlaceholders } from "./services/templateMatcher";
import googleOAuthRouter from "./googleOAuth";
import { getGoogleAuthUrl, exchangeCodeForTokens, getUserInfo, getBusinessAccounts, getLocations, syncReviews } from "./googleOAuth";

export function registerRoutes(app: Express) {
  // Registra rotas OAuth2 do Google
  app.use("/api", googleOAuthRouter);

  // Google OAuth routes
  app.get("/api/connect/google", async (req, res) => {
    const companyId = req.query.company_id as string;

    if (!companyId) {
      return res.status(400).json({ error: "company_id is required" });
    }

    const authUrl = getGoogleAuthUrl(companyId);
    res.redirect(authUrl);
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code || !state) {
        return res.redirect("/companies?error=missing_params");
      }

      const companyId = parseInt(state);
      if (isNaN(companyId)) {
        return res.redirect("/companies?error=invalid_company");
      }

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code);

      // Get user info and business profile
      const userInfo = await getUserInfo(tokens.access_token);
      const accounts = await getBusinessAccounts(tokens.access_token);

      if (!accounts || accounts.length === 0) {
        return res.redirect(`/companies/${companyId}/settings?error=no_accounts`);
      }

      // For now, use the first account and location
      const account = accounts[0];
      const locations = await getLocations(tokens.access_token, account.name);

      if (!locations || locations.length === 0) {
        return res.redirect(`/companies/${companyId}/settings?error=no_locations`);
      }

      const location = locations[0];

      // Save to database
      await storage.createGoogleProfile({
        companyId,
        googleAccountId: userInfo.id,
        googleLocationId: location.name,
        profileName: location.title || userInfo.name,
        oauthAccessTokenEncrypted: tokens.access_token,
        oauthRefreshTokenEncrypted: tokens.refresh_token || "",
        tokenExpiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
        isActive: true,
        lastSyncAt: null,
      });

      res.redirect(`/companies/${companyId}/settings?success=connected`);
    } catch (error) {
      console.error("Error in Google OAuth callback:", error);
      res.redirect("/companies?error=auth_failed");
    }
  });


  app.get("/api/user", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (!user || !user.claims) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(dbUser);
  });

  app.get("/api/companies", isAuthenticated, async (_req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/companies/:id", isAuthenticated, async (req, res) => {
    try {
      const company = await storage.getCompany(parseInt(req.params.id));
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/companies", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validatedData);
      res.status(201).json(company);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/companies/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(parseInt(req.params.id), validatedData);
      res.json(company);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/companies/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCompany(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Google Profile routes
  app.get("/api/google-profiles", isAuthenticated, async (req, res) => {
    const profiles = await storage.getGoogleProfiles();
    res.json(profiles);
  });

  app.delete("/api/google-profiles/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteGoogleProfile(id);
    res.json({ success: true });
  });

  app.post("/api/google-profiles/:id/sync", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const profile = await storage.getGoogleProfileById(id);

      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const reviewCount = await syncReviews(profile);
      res.json({ success: true, reviewCount });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Failed to sync reviews" });
    }
  });

  app.get("/api/google-profiles/:id", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getGoogleProfile(parseInt(req.params.id));
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/google-profiles/:id/refresh", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getGoogleProfile(parseInt(req.params.id));
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json({ message: "Token refresh will be implemented with Google OAuth2" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/templates", isAuthenticated, async (_req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getTemplate(parseInt(req.params.id));
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/templates", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(validatedData);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.updateTemplate(parseInt(req.params.id), req.body);
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/templates/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTemplate(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reviews", isAuthenticated, async (req, res) => {
    try {
      const { status, priority } = req.query;
      const reviews = await storage.getReviews({
        status: status as string,
        priority: priority as string,
      });
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reviews/:id", isAuthenticated, async (req, res) => {
    try {
      const review = await storage.getReview(parseInt(req.params.id));
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      res.json(review);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reviews/batch-process", isAuthenticated, async (req, res) => {
    try {
      const { reviewIds } = req.body;
      
      if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
        return res.status(400).json({ error: "reviewIds array is required" });
      }

      const results = [];
      
      for (const reviewId of reviewIds) {
        try {
          const review = await storage.getReview(reviewId);
          if (!review) continue;

          await storage.updateReview(review.id, { status: "processing" });

          const language = review.languageDetected || "pt-BR";
          const templates = await storage.getTemplates();
          const companyTemplates = templates.filter(
            (t) => t.companyId === review.companyId && t.isActive
          );

          const matchedTemplate = findBestTemplate(companyTemplates, {
            rating: review.rating,
            reviewText: review.text || undefined,
            language,
          });

          if (matchedTemplate) {
            const company = await storage.getCompany(review.companyId);
            if (!company) continue;

            const processedTemplate = replacePlaceholders(matchedTemplate.template.body, {
              authorName: review.authorName || undefined,
              companyName: company.name,
              rating: review.rating,
            });

            let responseText = processedTemplate;
            let confidenceScore = 0.9;

            try {
              const aiResult = await generateResponse({
                template: processedTemplate,
                reviewText: review.text || "",
                rating: review.rating,
                authorName: review.authorName || undefined,
                companyName: company.name,
                tone: matchedTemplate.template.tone,
              });
              responseText = aiResult.responseText;
              confidenceScore = aiResult.confidenceScore;
            } catch (error) {
              console.error("AI generation failed:", error);
            }

            const moderation = moderateResponse(responseText, review.rating, confidenceScore);

            const response = await storage.createResponse({
              reviewId: review.id,
              templateId: matchedTemplate.template.id,
              responseText,
              moderationStatus: moderation.action === "BLOCK" ? "blocked" : "approved",
              moderationFlags: moderation.flags,
              confidenceScore,
              status: moderation.action === "BLOCK" ? "pending_approval" : "pending_send",
            });

            await storage.updateTemplate(matchedTemplate.template.id, {
              usageCount: (matchedTemplate.template.usageCount || 0) + 1,
              lastUsedAt: new Date(),
            });

            if (moderation.action !== "BLOCK") {
              await storage.updateReview(review.id, { status: "completed" });
            }

            results.push({ reviewId, success: true, responseId: response.id });
          } else {
            await storage.updateReview(review.id, {
              status: "failed",
              errorMessage: "No matching template found",
            });
            results.push({ reviewId, success: false, error: "No matching template" });
          }
        } catch (error: any) {
          results.push({ reviewId, success: false, error: error.message });
        }
      }

      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reviews/:id/process", isAuthenticated, async (req, res) => {
    try {
      const review = await storage.getReview(parseInt(req.params.id));
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      await storage.updateReview(review.id, { status: "processing" });

      const language = review.languageDetected || "pt-BR";

      const templates = await storage.getTemplates();
      const companyTemplates = templates.filter(
        (t) => t.companyId === review.companyId && t.isActive
      );

      const matchedTemplate = findBestTemplate(companyTemplates, {
        rating: review.rating,
        reviewText: review.text || undefined,
        language,
      });

      if (!matchedTemplate) {
        await storage.updateReview(review.id, {
          status: "failed",
          errorMessage: "No matching template found",
        });
        return res.status(400).json({ error: "No matching template found" });
      }

      const company = await storage.getCompany(review.companyId);
      if (!company) {
        return res.status(400).json({ error: "Company not found" });
      }

      const processedTemplate = replacePlaceholders(matchedTemplate.template.body, {
        authorName: review.authorName || undefined,
        companyName: company.name,
        rating: review.rating,
      });

      let responseText = processedTemplate;
      let confidenceScore = 0.9;

      try {
        const aiResult = await generateResponse({
          template: processedTemplate,
          reviewText: review.text || "",
          rating: review.rating,
          authorName: review.authorName || undefined,
          companyName: company.name,
          tone: matchedTemplate.template.tone,
        });
        responseText = aiResult.responseText;
        confidenceScore = aiResult.confidenceScore;
      } catch (error: any) {
        console.error("AI generation failed, using template:", error);
      }

      const moderation = moderateResponse(responseText, review.rating, confidenceScore);

      const response = await storage.createResponse({
        reviewId: review.id,
        templateId: matchedTemplate.template.id,
        responseText,
        moderationStatus: moderation.action === "BLOCK" ? "blocked" : "approved",
        moderationFlags: moderation.flags,
        confidenceScore,
        status: moderation.action === "BLOCK" ? "pending_approval" : "pending_send",
      });

      await storage.updateTemplate(matchedTemplate.template.id, {
        usageCount: (matchedTemplate.template.usageCount || 0) + 1,
        lastUsedAt: new Date(),
      });

      if (moderation.action !== "BLOCK") {
        await storage.updateReview(review.id, { status: "completed" });
      }

      res.json({ review, response, moderation });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/responses", isAuthenticated, async (req, res) => {
    try {
      const { status, moderationStatus } = req.query;
      const responses = await storage.getResponses({
        status: status as string,
        moderationStatus: moderationStatus as string,
      });
      res.json(responses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/moderation/pending", isAuthenticated, async (_req, res) => {
    try {
      const responses = await storage.getPendingModerationResponses();
      res.json(responses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/responses/:id/approve", isAuthenticated, async (req, res) => {
    try {
      const response = await storage.updateResponse(parseInt(req.params.id), {
        moderationStatus: "approved",
        status: "sent",
        sentAt: new Date(),
      });

      const review = await storage.getReview(response.reviewId);
      if (review) {
        await storage.updateReview(review.id, { status: "completed" });
      }

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/responses/:id/reject", isAuthenticated, async (req, res) => {
    try {
      const response = await storage.updateResponse(parseInt(req.params.id), {
        moderationStatus: "rejected",
        status: "failed",
      });

      const review = await storage.getReview(response.reviewId);
      if (review) {
        await storage.updateReview(review.id, { status: "pending" });
      }

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/responses/:id/edit", isAuthenticated, async (req, res) => {
    try {
      const { editedVersion } = req.body;
      if (!editedVersion) {
        return res.status(400).json({ error: "editedVersion is required" });
      }

      const response = await storage.updateResponse(parseInt(req.params.id), {
        editedVersion,
        moderationStatus: "approved",
        status: "sent",
        sentAt: new Date(),
      });

      const review = await storage.getReview(response.reviewId);
      if (review) {
        await storage.updateReview(review.id, { status: "completed" });
      }

      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dashboard/stats", isAuthenticated, async (_req, res) => {
    try {
      const reviews = await storage.getReviews({}).catch(() => []);
      const responses = await storage.getResponses({}).catch(() => []);
      const companies = await storage.getCompanies().catch(() => []);

      const totalReviews = reviews.length;
      const completedResponses = responses.filter((r) => r.status === "sent").length;
      const pendingReviews = reviews.filter((r) => r.status === "pending").length;
      const activeCompanies = companies.filter((c) => c.isActive).length;

      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      res.json({
        totalReviews,
        completedResponses,
        pendingReviews,
        activeCompanies,
        avgRating: parseFloat(avgRating.toFixed(2)),
      });
    } catch (error: any) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dashboard/recent-reviews", isAuthenticated, async (_req, res) => {
    try {
      const reviews = await storage.getReviews({}).catch(() => []);
      const recent = reviews.slice(0, 10);
      res.json(recent);
    } catch (error: any) {
      console.error("Recent reviews error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics/dashboard", isAuthenticated, async (_req, res) => {
    try {
      const reviews = await storage.getReviews({});
      const responses = await storage.getResponses({});

      const totalReviews = reviews.length;
      const completedResponses = responses.filter((r) => r.status === "sent").length;
      const responseRate = totalReviews > 0 ? (completedResponses / totalReviews) * 100 : 0;

      const avgRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => {
        const count = reviews.filter((r) => r.rating === rating).length;
        return {
          rating,
          count,
          percentage: totalReviews > 0 ? (count / totalReviews) * 100 : 0,
        };
      });

      const templates = await storage.getTemplates();
      const topTemplates = templates
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          name: t.name,
          usageCount: t.usageCount || 0,
          avgConfidence: 0.85,
        }));

      res.json({
        overview: {
          totalReviews,
          avgRating: parseFloat(avgRating.toFixed(2)),
          responseRate: parseFloat(responseRate.toFixed(1)),
          avgResponseTime: "2h 15min",
        },
        ratingDistribution,
        topTemplates,
        trends: {
          reviewsGrowth: 12.5,
          ratingImprovement: 3.2,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}