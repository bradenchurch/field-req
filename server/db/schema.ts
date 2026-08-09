import { pgSchema, uuid, text, timestamp, boolean, integer, date } from 'drizzle-orm/pg-core';

export const fieldReqSchema = pgSchema('field_req');

export const organizations = fieldReqSchema.table('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workers = fieldReqSchema.table('workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  optedIn: boolean('opted_in').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projects = fieldReqSchema.table('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const assignments = fieldReqSchema.table('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  workerId: uuid('worker_id').references(() => workers.id).notNull(),
});

export const categories = fieldReqSchema.table('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').notNull(),
});

export const requests = fieldReqSchema.table('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  workerId: uuid('worker_id').references(() => workers.id).notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  status: text('status', { enum: ['pending', 'replied', 'approved', 'completed'] }).default('pending').notNull(),
});

export const requestItems = fieldReqSchema.table('request_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').references(() => requests.id).notNull(),
  categoryId: uuid('category_id').references(() => categories.id).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const outreachLog = fieldReqSchema.table('outreach_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  workerId: uuid('worker_id').references(() => workers.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  repliedAt: timestamp('replied_at', { withTimezone: true }),
  status: text('status', { enum: ['sent', 'replied', 'nudged', 'failed'] }).default('sent').notNull(),
});