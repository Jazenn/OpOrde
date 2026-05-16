import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function dedupe() {
  console.log('Deduping tasks...');
  const tasks = await db.select().from(schema.userTasks);
  
  // Group by templateId
  const groups: Record<string, typeof tasks> = {};
  for (const t of tasks) {
    if (t.templateId) {
      if (!groups[t.templateId]) groups[t.templateId] = [];
      groups[t.templateId].push(t);
    }
  }

  // Find duplicates and delete
  let deletedCount = 0;
  for (const templateId in groups) {
    const groupedTasks = groups[templateId];
    if (groupedTasks.length > 1) {
      // Sort tasks to keep the one with the newest nextDueDate (which is likely the one they interacted with)
      groupedTasks.sort((a, b) => new Date(b.nextDueDate).getTime() - new Date(a.nextDueDate).getTime());
      
      // Keep the first one, delete the rest
      for (let i = 1; i < groupedTasks.length; i++) {
        // Eerst completions weggooien
        await db.delete(schema.taskCompletions).where(eq(schema.taskCompletions.taskId, groupedTasks[i].id));
        // Dan de taak weggooien
        await db.delete(schema.userTasks).where(eq(schema.userTasks.id, groupedTasks[i].id));
        deletedCount++;
      }
    }
  }

  console.log(`Deduping complete. Deleted ${deletedCount} duplicate tasks.`);
}

dedupe().catch(console.error);