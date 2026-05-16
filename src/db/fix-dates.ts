import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function fixDueDates() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Setting all nextDueDate to ${today}`);
  
  await db.update(schema.userTasks).set({ nextDueDate: today });
  console.log('Done!');
}

fixDueDates().catch(console.error);