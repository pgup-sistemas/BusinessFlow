
import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("🔄 Starting database migration...");

  try {
    // Drop the old columns if they exist
    await db.execute(sql`
      ALTER TABLE google_profiles 
      DROP COLUMN IF EXISTS access_token,
      DROP COLUMN IF EXISTS refresh_token;
    `);

    console.log("✅ Removed old token columns from google_profiles");

    // Ensure reviews table has all required columns
    await db.execute(sql`
      ALTER TABLE reviews 
      ADD COLUMN IF NOT EXISTS google_profile_id INTEGER REFERENCES google_profiles(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
    `);

    console.log("✅ Added missing columns to reviews table");

    // Ensure responses table has sentAt column
    await db.execute(sql`
      ALTER TABLE responses 
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;
    `);

    console.log("✅ Added sent_at column to responses table");

    // Update existing reviews to have company_id and google_profile_id from profile_id
    await db.execute(sql`
      UPDATE reviews r
      SET 
        google_profile_id = COALESCE(r.profile_id, r.google_profile_id),
        company_id = COALESCE(
          (SELECT gp.company_id FROM google_profiles gp WHERE gp.id = r.profile_id),
          r.company_id
        )
      WHERE r.google_profile_id IS NULL OR r.company_id IS NULL;
    `);

    console.log("✅ Updated existing reviews with company_id and google_profile_id");

    // Drop old profile_id column if it exists
    await db.execute(sql`
      ALTER TABLE reviews 
      DROP COLUMN IF EXISTS profile_id;
    `);

    console.log("✅ Removed old profile_id column from reviews");

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
