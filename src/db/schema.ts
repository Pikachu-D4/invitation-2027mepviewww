import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const leaders = sqliteTable('leaders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  role: text('role'),
  avatar: text('avatar')
    .notNull()
    .default('https://api.dicebear.com/7.x/avataaars/svg?seed=default'),
  status: text('status').notNull().default('open'),
  position: integer('position').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  whatsapp: text('whatsapp').notNull(),
  bio: text('bio'),
  profileImage: text('profile_image').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  leaderId: integer('leader_id').references(() => leaders.id),
  requestedRole: text('requested_role'), // 'Leader' | 'Co-Leader'
  requestedPosition: integer('requested_position'), // 1-6, or 0/null for any
  instagramUsername: text('instagram_username'),
  adminNotes: text('admin_notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const siteContent = sqliteTable('site_content', {
  id: text('id').primaryKey(), // 'main'
  data: text('data').notNull(), // JSON payload string
  version: integer('version').notNull().default(1),
  updatedBy: text('updated_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const contentRevisions = sqliteTable('content_revisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  contentId: text('content_id').notNull(),
  data: text('data').notNull(),
  action: text('action').notNull().default('update'), // 'initial' | 'update' | 'reset'
  createdBy: text('created_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type Leader = typeof leaders.$inferSelect;
export type NewLeader = typeof leaders.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type SiteContentRecord = typeof siteContent.$inferSelect;
export type ContentRevisionRecord = typeof contentRevisions.$inferSelect;