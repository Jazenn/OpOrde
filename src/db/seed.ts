import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log('Seeding task templates...');

  const templates = [
    // Gratis taken
    { name: 'Stofzuigen', category: 'reinigen', defaultFrequencyType: 'weekly', defaultIntervalDays: 7, isPremium: false, icon: 'vacuum' },
    { name: 'Badkamer schoonmaken', category: 'reinigen', defaultFrequencyType: 'weekly', defaultIntervalDays: 7, isPremium: false, icon: 'shower' },
    { name: 'WC schoonmaken', category: 'reinigen', defaultFrequencyType: 'weekly', defaultIntervalDays: 7, isPremium: false, icon: 'toilet' },
    { name: 'Aanrecht schoonmaken', category: 'reinigen', defaultFrequencyType: 'daily', defaultIntervalDays: 1, isPremium: false, icon: 'chef-hat' },
    { name: 'Vloer dweilen', category: 'reinigen', defaultFrequencyType: 'biweekly', defaultIntervalDays: 14, isPremium: false, icon: 'droplets' },
    { name: 'Stof afnemen', category: 'reinigen', defaultFrequencyType: 'biweekly', defaultIntervalDays: 14, isPremium: false, icon: 'feather' },
    { name: 'Was doen', category: 'huishouden', defaultFrequencyType: 'weekly', defaultIntervalDays: 7, isPremium: false, icon: 'shirt' },
    { name: 'Vaatwasser uitruimen', category: 'huishouden', defaultFrequencyType: 'daily', defaultIntervalDays: 1, isPremium: false, icon: 'utensils' },

    // Premium taken
    { name: 'Kliko buiten zetten', category: 'buiten', defaultFrequencyType: 'weekly', defaultIntervalDays: 7, isPremium: true, icon: 'trash-2' },
    { name: 'Planten water geven', category: 'tuin', defaultFrequencyType: 'interval', defaultIntervalDays: 4, isPremium: true, icon: 'flower-2' },
    { name: 'Ramen zemen', category: 'reinigen', defaultFrequencyType: 'seasonal', defaultIntervalDays: 90, isPremium: true, icon: 'layout' },
    { name: 'Verwarmingsfilter', category: 'onderhoud', defaultFrequencyType: 'biannual', defaultIntervalDays: 180, isPremium: true, icon: 'thermometer' },
    { name: 'Auto APK', category: 'administratie', defaultFrequencyType: 'annual', defaultIntervalDays: 365, isPremium: true, icon: 'car' },
    { name: 'Koelkast schoonmaken', category: 'reinigen', defaultFrequencyType: 'monthly', defaultIntervalDays: 30, isPremium: true, icon: 'package' },
    { name: 'Planten verpotten', category: 'tuin', defaultFrequencyType: 'annual', defaultIntervalDays: 365, isPremium: true, icon: 'shovel' },
    { name: 'Grofvuil aanmelden', category: 'administratie', defaultFrequencyType: 'monthly', defaultIntervalDays: 30, isPremium: true, icon: 'calendar' }
  ];

  for (const t of templates) {
    await db.insert(schema.taskTemplates).values(t).onConflictDoNothing(); // assuming no conflict rule yet, but wait, there is no unique constraint on name.
    // let's just insert if empty.
  }

  console.log('Done!');
}

async function main() {
  const existing = await db.select().from(schema.taskTemplates);
  if (existing.length === 0) {
    await seed();
  } else {
    console.log('Templates already seeded.');
  }
}

main().catch(console.error);
