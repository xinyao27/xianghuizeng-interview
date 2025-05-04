import fs from 'fs';
import path from 'path';

import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
config();

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in the environment variables.');
  process.exit(1);
}

// Create a PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Runs database migrations from the standard migrations directory
 */
export async function runMigrations() {
  try {
    // Connect to the database
    const client = await pool.connect();
    console.log('Connected to the database.');

    try {
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Get list of executed migrations
      const { rows: executedMigrations } = await client.query('SELECT name FROM migrations');
      const executedMigrationNames = executedMigrations.map((row: { name: string }) => row.name);

      // Get list of migration files from the standard migrations directory
      const migrationsDir = path.resolve(process.cwd(), 'migrations');

      // Check if the directory exists
      if (!fs.existsSync(migrationsDir)) {
        console.error(`Migrations directory ${migrationsDir} does not exist.`);
        process.exit(1);
      }

      // Get all SQL files in the migrations directory
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql') && !file.includes('_meta'))
        .sort(); // Sort to ensure they run in order

      console.log(`Found ${migrationFiles.length} migration files in ${migrationsDir}`);

      // Run migrations that haven't been executed yet
      for (const file of migrationFiles) {
        if (!executedMigrationNames.includes(file)) {
          console.log(`Running migration: ${file}`);
          const migrationPath = path.join(migrationsDir, file);
          const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

          // Begin transaction
          await client.query('BEGIN');

          try {
            // Run the migration
            await client.query(migrationSQL);

            // Record the migration
            await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);

            // Commit the transaction
            await client.query('COMMIT');
            console.log(`Migration ${file} completed successfully.`);
          } catch (err) {
            // Rollback the transaction if there's an error
            await client.query('ROLLBACK');
            console.error(`Error running migration ${file}:`, err);
            throw err;
          }
        } else {
          console.log(`Migration ${file} already executed.`);
        }
      }

      console.log('All migrations completed.');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run migrations when script is executed directly
if (require.main === module) {
  runMigrations().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
