import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const leaders = sqliteTable('leaders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  role: text('role'),
  avatar: text('avatar').notNull().default('https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/96c226f6-c7a6-4eb3-bbf0-aa79c41cf636/generated_images/professional-business-avatar-silhouette--4321d5e4-20251223140551.jpg'),
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
  status: text('status').notNull().default('pending'),
  leaderId: integer('leader_id').references(() => leaders.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});