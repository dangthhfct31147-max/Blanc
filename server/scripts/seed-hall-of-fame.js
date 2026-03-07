import 'dotenv/config';
import { connectToDatabase, disconnectFromDatabase } from '../lib/db.js';
import { seedHallOfFame } from './hall-of-fame-data.js';

async function main() {
  try {
    await connectToDatabase();
    await seedHallOfFame();
    console.log('✅ Hall of Fame seed completed.');
  } catch (error) {
    console.error('❌ Hall of Fame seed failed:', error);
    process.exitCode = 1;
  } finally {
    try {
      await disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Failed to disconnect from PostgreSQL/CockroachDB:', disconnectError);
      process.exitCode = process.exitCode || 1;
    }
  }
}

main();
