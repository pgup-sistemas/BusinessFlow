// Database storage implementation - blueprint:javascript_database + blueprint:javascript_log_in_with_replit
import {
  users,
  companies,
  googleProfiles,
  templates,
  reviews,
  responses,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type GoogleProfile,
  type InsertGoogleProfile,
  type Template,
  type InsertTemplate,
  type Review,
  type Response,
  type InsertReview,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: number): Promise<void>;

  // Google Profiles
  getGoogleProfiles(): Promise<GoogleProfile[]>;
  getGoogleProfile(id: number): Promise<GoogleProfile | undefined>;
  getGoogleProfileById(id: number): Promise<GoogleProfile | undefined>;
  createGoogleProfile(profile: InsertGoogleProfile): Promise<GoogleProfile>;
  updateGoogleProfile(id: number, data: Partial<GoogleProfile>): Promise<GoogleProfile>;
  deleteGoogleProfile(id: number): Promise<void>;

  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, data: Partial<Template>): Promise<Template>;
  deleteTemplate(id: number): Promise<void>;

  // Reviews
  getReviews(filters?: { status?: string; priority?: string }): Promise<Review[]>;
  getReview(id: number): Promise<Review | undefined>;
  getReviewByGoogleId(googleReviewId: string): Promise<Review | undefined>;
  getReviewByExternalId(externalId: string): Promise<Review | undefined>;
  getReviewsByCompany(companyId: number): Promise<Review[]>;
  createReview(review: Partial<Review>): Promise<Review>;
  updateReview(id: number, data: Partial<Review>): Promise<Review>;

  // Responses
  getResponses(filters?: { status?: string; moderationStatus?: string }): Promise<Response[]>;
  getResponse(id: number): Promise<Response | undefined>;
  createResponse(response: Partial<Response>): Promise<Response>;
  updateResponse(id: number, data: Partial<Response>): Promise<Response>;
  getPendingModerationResponses(): Promise<Response[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (Required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(companyData).returning();
    return company;
  }

  async updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company> {
    const [updated] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  async deleteCompany(id: number): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  // Google Profiles
  async getGoogleProfiles(): Promise<any[]> {
    const profiles = await db
      .select({
        id: googleProfiles.id,
        companyId: googleProfiles.companyId,
        googleLocationId: googleProfiles.googleLocationId,
        googleAccountId: googleProfiles.googleAccountId,
        profileName: googleProfiles.profileName,
        oauthAccessTokenEncrypted: googleProfiles.oauthAccessTokenEncrypted,
        oauthRefreshTokenEncrypted: googleProfiles.oauthRefreshTokenEncrypted,
        tokenExpiry: googleProfiles.tokenExpiry,
        isActive: googleProfiles.isActive,
        lastSyncAt: googleProfiles.lastSyncAt,
        createdAt: googleProfiles.createdAt,
        updatedAt: googleProfiles.updatedAt,
        company: companies,
      })
      .from(googleProfiles)
      .leftJoin(companies, eq(googleProfiles.companyId, companies.id))
      .orderBy(desc(googleProfiles.createdAt));

    return profiles;
  }

  async getGoogleProfile(id: number): Promise<GoogleProfile | undefined> {
    const [profile] = await db.select().from(googleProfiles).where(eq(googleProfiles.id, id));
    return profile;
  }

  async getGoogleProfileById(id: number): Promise<GoogleProfile | undefined> {
    const [profile] = await db.select()
      .from(googleProfiles)
      .where(eq(googleProfiles.id, id))
      .limit(1);
    return profile;
  }

  async createGoogleProfile(profileData: InsertGoogleProfile): Promise<GoogleProfile> {
    const [profile] = await db.insert(googleProfiles).values(profileData).returning();
    return profile;
  }

  async updateGoogleProfile(id: number, data: Partial<GoogleProfile>): Promise<GoogleProfile> {
    const [profile] = await db
      .update(googleProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(googleProfiles.id, id))
      .returning();
    return profile;
  }

  async deleteGoogleProfile(id: number): Promise<void> {
    await db.delete(googleProfiles).where(eq(googleProfiles.id, id));
  }

  // Templates
  async getTemplates(): Promise<any[]> {
    const result = await db
      .select({
        id: templates.id,
        name: templates.name,
        body: templates.body,
        companyId: templates.companyId,
        tone: templates.tone,
        minRating: templates.minRating,
        maxRating: templates.maxRating,
        keywordsRequired: templates.keywordsRequired,
        keywordsExcluded: templates.keywordsExcluded,
        priority: templates.priority,
        cooldownHours: templates.cooldownHours,
        language: templates.language,
        isActive: templates.isActive,
        usageCount: templates.usageCount,
        lastUsedAt: templates.lastUsedAt,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        company: companies,
      })
      .from(templates)
      .leftJoin(companies, eq(templates.companyId, companies.id))
      .orderBy(desc(templates.createdAt));

    return result;
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async createTemplate(templateData: InsertTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(templateData).returning();
    return template;
  }

  async updateTemplate(id: number, data: Partial<Template>): Promise<Template> {
    const [template] = await db
      .update(templates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return template;
  }

  async deleteTemplate(id: number): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Reviews
  async getReviews(filters?: { status?: string; priority?: string }): Promise<any[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(reviews.status, filters.status));
    }
    if (filters?.priority) {
      conditions.push(eq(reviews.priority, filters.priority));
    }

    let query = db
      .select({
        id: reviews.id,
        googleProfileId: reviews.googleProfileId,
        companyId: reviews.companyId,
        googleReviewId: reviews.googleReviewId,
        authorName: reviews.authorName,
        rating: reviews.rating,
        text: reviews.text,
        reviewCreatedAt: reviews.reviewCreatedAt,
        sentimentScore: reviews.sentimentScore,
        languageDetected: reviews.languageDetected,
        priority: reviews.priority,
        status: reviews.status,
        errorMessage: reviews.errorMessage,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
        profile: {
          id: googleProfiles.id,
          profileName: googleProfiles.profileName,
          company: companies,
        },
      })
      .from(reviews)
      .leftJoin(googleProfiles, eq(reviews.googleProfileId, googleProfiles.id))
      .leftJoin(companies, eq(reviews.companyId, companies.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(reviews.createdAt)).limit(100);
  }

  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review;
  }

  async getReviewByGoogleId(googleReviewId: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.googleReviewId, googleReviewId));
    return review;
  }

  async createReview(data: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(data).returning();
    return review;
  }

  async getReviewByExternalId(externalId: string): Promise<Review | undefined> {
    const [review] = await db.select()
      .from(reviews)
      .where(eq(reviews.externalId, externalId))
      .limit(1);
    return review;
  }

  async getReviewsByCompany(companyId: number): Promise<Review[]> {
    return await db.select()
      .from(reviews)
      .where(eq(reviews.companyId, companyId))
      .orderBy(desc(reviews.reviewDate));
  }

  async updateReview(id: number, data: Partial<Review>): Promise<Review> {
    const [review] = await db
      .update(reviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return review;
  }

  // Responses
  async getResponses(filters?: { status?: string; moderationStatus?: string }): Promise<Response[]> {
    let query = db.select().from(responses);

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(responses.status, filters.status));
    }
    if (filters?.moderationStatus) {
      conditions.push(eq(responses.moderationStatus, filters.moderationStatus));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(responses.createdAt)).limit(100);
  }

  async getResponse(id: number): Promise<Response | undefined> {
    const [response] = await db.select().from(responses).where(eq(responses.id, id));
    return response;
  }

  async createResponse(responseData: Partial<Response>): Promise<Response> {
    const [response] = await db.insert(responses).values(responseData as any).returning();
    return response;
  }

  async updateResponse(id: number, data: Partial<Response>): Promise<Response> {
    const [response] = await db
      .update(responses)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(responses.id, id))
      .returning();
    return response;
  }

  async getPendingModerationResponses(): Promise<any[]> {
    const result = await db
      .select({
        id: responses.id,
        reviewId: responses.reviewId,
        templateId: responses.templateId,
        responseText: responses.responseText,
        moderationStatus: responses.moderationStatus,
        moderationFlags: responses.moderationFlags,
        confidenceScore: responses.confidenceScore,
        status: responses.status,
        editedVersion: responses.editedVersion,
        sentAt: responses.sentAt,
        createdAt: responses.createdAt,
        updatedAt: responses.updatedAt,
        review: {
          id: reviews.id,
          authorName: reviews.authorName,
          rating: reviews.rating,
          text: reviews.text,
          reviewCreatedAt: reviews.reviewCreatedAt,
          profile: {
            id: googleProfiles.id,
            profileName: googleProfiles.profileName,
            company: companies,
          },
        },
      })
      .from(responses)
      .leftJoin(reviews, eq(responses.reviewId, reviews.id))
      .leftJoin(googleProfiles, eq(reviews.googleProfileId, googleProfiles.id))
      .leftJoin(companies, eq(reviews.companyId, companies.id))
      .where(eq(responses.moderationStatus, "blocked"))
      .orderBy(desc(responses.createdAt))
      .limit(50);

    return result;
  }
}

export const storage = new DatabaseStorage();