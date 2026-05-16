import { pgTable, uuid, text, integer, timestamp, boolean, date, primaryKey } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(), // Clerk User ID
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  userId: text('user_id').references(() => profiles.id).primaryKey(),
  isPremium: boolean('is_premium').default(false).notNull(),
  productId: text('product_id'),
  expiresAt: timestamp('expires_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskTemplates = pgTable('task_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  defaultFrequencyType: text('default_frequency_type').notNull(), // 'daily', 'weekly', 'interval', 'seasonal', etc.
  defaultIntervalDays: integer('default_interval_days').default(7),
  isPremium: boolean('is_premium').default(false).notNull(),
  icon: text('icon'),
});

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').unique(),
  inviteExpiresAt: timestamp('invite_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const householdMembers = pgTable('household_members', {
  householdId: uuid('household_id').references(() => households.id).notNull(),
  userId: text('user_id').references(() => profiles.id).notNull(),
  role: text('role').default('member').notNull(), // 'owner' | 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.householdId, t.userId] }),
}));

export const userTasks = pgTable('user_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => profiles.id),
  householdId: uuid('household_id').references(() => households.id),
  templateId: uuid('template_id').references(() => taskTemplates.id),
  isCustom: boolean('is_custom').default(false).notNull(),
  customName: text('custom_name'),
  customIcon: text('custom_icon'),
  frequencyType: text('frequency_type').notNull(),
  intervalDays: integer('interval_days').default(7),
  notes: text('notes'),
  nextDueDate: date('next_due_date').notNull(),
  streakCount: integer('streak_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const taskCompletions = pgTable('task_completions', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => userTasks.id),
  completedBy: text('completed_by').references(() => profiles.id),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
});

export const pushTokens = pgTable('push_tokens', {
  userId: text('user_id').references(() => profiles.id).notNull(),
  platform: text('platform').notNull(), // 'ios' | 'android'
  token: text('token').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.platform] }),
}));
