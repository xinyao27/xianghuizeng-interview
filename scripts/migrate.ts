import { db } from '../src/db/drizzle';
import { runMigrations } from '../src/db/migrate';

async function runAllMigrations() {
  try {
    // 运行drizzle原生迁移
    console.log('Running Drizzle migrations...');
    if (!db) {
      console.error('Database connection not available');
      process.exit(1);
    }
    console.log('Database connection available.');

    // 运行我们的自定义迁移
    console.log('\nRunning SQL migrations...');
    await runMigrations();
    console.log('Migrations completed successfully.');

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// 直接运行
runAllMigrations().catch(console.error); 