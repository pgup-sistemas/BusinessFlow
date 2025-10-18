
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("🔄 Starting complete database migration...");

  try {
    // 1. Drop old columns from google_profiles
    await db.execute(sql`
      ALTER TABLE google_profiles 
      DROP COLUMN IF EXISTS access_token,
      DROP COLUMN IF EXISTS refresh_token;
    `);
    console.log("✅ Removed old token columns from google_profiles");

    // 2. Ensure google_profiles has all required columns
    await db.execute(sql`
      ALTER TABLE google_profiles 
      ADD COLUMN IF NOT EXISTS oauth_access_token_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS oauth_refresh_token_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP;
    `);
    console.log("✅ Added OAuth token columns to google_profiles");

    // 3. Ensure reviews table has correct columns
    await db.execute(sql`
      ALTER TABLE reviews 
      DROP COLUMN IF EXISTS profile_id;
    `);
    
    await db.execute(sql`
      ALTER TABLE reviews 
      ADD COLUMN IF NOT EXISTS google_profile_id INTEGER REFERENCES google_profiles(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
    `);
    console.log("✅ Fixed reviews table columns");

    // 4. Ensure responses table has sent_at column
    await db.execute(sql`
      ALTER TABLE responses 
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;
    `);
    console.log("✅ Added sent_at column to responses table");

    // 5. Add Google OAuth credentials to companies
    await db.execute(sql`
      ALTER TABLE companies 
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS google_client_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS google_client_secret VARCHAR(255),
      ADD COLUMN IF NOT EXISTS google_redirect_uri VARCHAR(500);
    `);
    console.log("✅ Added Google OAuth credentials columns to companies table");

    // 6. Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_reviews_google_profile_id ON reviews(google_profile_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_reviews_company_id ON reviews(company_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
    `);
    console.log("✅ Created performance indexes");

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
