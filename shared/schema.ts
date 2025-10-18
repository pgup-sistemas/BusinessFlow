import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  varchar,
  boolean,
  doublePrecision,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - Required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).default("admin"), // admin, moderator, viewer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Companies table - Multi-tenant support
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  settings: jsonb("settings").default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

// Google Profiles table - OAuth connections
export const googleProfiles = pgTable("google_profiles", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  profileName: varchar("profile_name", { length: 255 }).notNull(),
  googleAccountId: varchar("google_account_id", { length: 255 }).notNull(),
  googleLocationId: varchar("google_location_id", { length: 255 }).notNull(),
  oauthRefreshTokenEncrypted: text("oauth_refresh_token_encrypted"),
  oauthAccessTokenEncrypted: text("oauth_access_token_encrypted"),
  tokenExpiry: timestamp("token_expiry"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.googleAccountId, table.googleLocationId),
  index("idx_google_profiles_company_id").on(table.companyId),
]);

export const insertGoogleProfileSchema = createInsertSchema(googleProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GoogleProfile = typeof googleProfiles.$inferSelect;
export type InsertGoogleProfile = z.infer<typeof insertGoogleProfileSchema>;

// Templates table - Response templates with AI
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  body: text("body").notNull(),
  tone: varchar("tone", { length: 50 }).notNull(), // positivo, neutro, empatico, recuperacao
  minRating: smallint("min_rating").default(1).notNull(),
  maxRating: smallint("max_rating").default(5).notNull(),
  priority: integer("priority").default(0).notNull(),
  keywordsRequired: jsonb("keywords_required").default([]),
  keywordsExcluded: jsonb("keywords_excluded").default([]),
  cooldownHours: integer("cooldown_hours").default(24).notNull(),
  language: varchar("language", { length: 10 }).default("pt-BR").notNull(),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_templates_company_active").on(table.companyId, table.isActive),
  index("idx_templates_rating").on(table.minRating, table.maxRating),
]);

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  usageCount: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  minRating: z.number().min(1).max(5),
  maxRating: z.number().min(1).max(5),
  keywordsRequired: z.array(z.string()).default([]),
  keywordsExcluded: z.array(z.string()).default([]),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

// Reviews/Evaluations table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  googleReviewId: varchar("google_review_id", { length: 255 }).notNull().unique(),
  googleProfileId: integer("google_profile_id")
    .references(() => googleProfiles.id, { onDelete: "cascade" })
    .notNull(),
  companyId: integer("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  authorName: varchar("author_name", { length: 255 }),
  rating: smallint("rating").notNull(),
  text: text("text"),
  languageDetected: varchar("language_detected", { length: 10 }),
  sentimentScore: doublePrecision("sentiment_score"),
  priority: varchar("priority", { length: 20 }).notNull(), // URGENT, HIGH, NORMAL, LOW
  requiresHumanReview: boolean("requires_human_review").default(false),
  reviewCreatedAt: timestamp("review_created_at").notNull(),
  processedAt: timestamp("processed_at"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, processing, completed, failed
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reviews_profile_status").on(table.googleProfileId, table.status),
  index("idx_reviews_priority").on(table.priority, table.createdAt),
  index("idx_reviews_google_id").on(table.googleReviewId),
]);

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// Generated Responses table
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id")
    .references(() => reviews.id, { onDelete: "cascade" })
    .notNull(),
  templateId: integer("template_id")
    .references(() => templates.id, { onDelete: "set null" }),
  responseText: text("response_text").notNull(),
  modelUsed: varchar("model_used", { length: 50 }).default("gemini-2.5-flash"),
  confidenceScore: doublePrecision("confidence_score"),
  moderationFlags: jsonb("moderation_flags").default([]),
  moderationStatus: varchar("moderation_status", { length: 20 }).default("pending"), // pending, approved, blocked, rejected
  status: varchar("status", { length: 20 }).default("draft"), // draft, sent, failed
  publishedAt: timestamp("published_at"),
  sentAt: timestamp("sent_at"),
  userFeedback: varchar("user_feedback", { length: 20 }), // good, bad, edited
  editedVersion: text("edited_version"),
  engagementScore: doublePrecision("engagement_score"),
  retryCount: integer("retry_count").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_responses_review_id").on(table.reviewId),
  index("idx_responses_status").on(table.status, table.createdAt),
  index("idx_responses_moderation").on(table.moderationStatus),
]);

export type Response = typeof responses.$inferSelect;

// Template Cooldown table
export const templateCooldowns = pgTable("template_cooldowns", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id")
    .references(() => googleProfiles.id, { onDelete: "cascade" })
    .notNull(),
  templateId: integer("template_id")
    .references(() => templates.id, { onDelete: "cascade" })
    .notNull(),
  lastUsedAt: timestamp("last_used_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  unique().on(table.profileId, table.templateId),
  index("idx_cooldowns_profile_expires").on(table.profileId, table.expiresAt),
]);

// Audit Log table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  entity: varchar("entity", { length: 50 }).notNull(),
  entityId: integer("entity_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  payload: jsonb("payload"),
  userId: varchar("user_id"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_audit_entity").on(table.entity, table.entityId),
  index("idx_audit_created").on(table.createdAt),
]);

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  googleProfiles: many(googleProfiles),
  templates: many(templates),
}));

export const googleProfilesRelations = relations(googleProfiles, ({ one, many }) => ({
  company: one(companies, {
    fields: [googleProfiles.companyId],
    references: [companies.id],
  }),
  reviews: many(reviews),
  templateCooldowns: many(templateCooldowns),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  company: one(companies, {
    fields: [templates.companyId],
    references: [companies.id],
  }),
  responses: many(responses),
  cooldowns: many(templateCooldowns),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  profile: one(googleProfiles, {
    fields: [reviews.googleProfileId],
    references: [googleProfiles.id],
  }),
  company: one(companies, {
    fields: [reviews.companyId],
    references: [companies.id],
  }),
  responses: many(responses),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  review: one(reviews, {
    fields: [responses.reviewId],
    references: [reviews.id],
  }),
  template: one(templates, {
    fields: [responses.templateId],
    references: [templates.id],
  }),
}));
