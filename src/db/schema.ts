import { pgSchema, uuid, varchar, timestamp, boolean, integer, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const fieldReqSchema = pgSchema('field_req');

// 1. organizations
export const organizations = fieldReqSchema.table('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. projects
export const projects = fieldReqSchema.table('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. workers
export const workers = fieldReqSchema.table('workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }), // Might just be a phone number initially
  phone: varchar('phone', { length: 20 }).notNull(),
  optedIn: boolean('opted_in').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. assignments
export const assignments = fieldReqSchema.table('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  workerId: uuid('worker_id').references(() => workers.id).notNull(),
});

// 5. categories
export const categories = fieldReqSchema.table('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

// 6. requests
export const requests = fieldReqSchema.table('requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  workerId: uuid('worker_id').references(() => workers.id).notNull(),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  status: varchar('status', { length: 50 }).notNull(), // 'pending', 'submitted', 'approved', 'ordered'
});

// 7. request_items
export const requestItems = fieldReqSchema.table('request_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id').references(() => requests.id).notNull(),
  categoryId: uuid('category_id').references(() => categories.id), // Optional if not categorized
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. outreach_log
export const outreachLog = fieldReqSchema.table('outreach_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  workerId: uuid('worker_id').references(() => workers.id).notNull(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  repliedAt: timestamp('replied_at'),
  status: varchar('status', { length: 50 }).notNull(), // 'sent', 'nudged', 'replied'
});


// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  projects: many(projects),
  workers: many(workers),
  categories: many(categories),
  outreachLogs: many(outreachLog),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  assignments: many(assignments),
  requests: many(requests),
  outreachLogs: many(outreachLog),
}));

export const workersRelations = relations(workers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workers.orgId],
    references: [organizations.id],
  }),
  assignments: many(assignments),
  requests: many(requests),
  outreachLogs: many(outreachLog),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  project: one(projects, {
    fields: [assignments.projectId],
    references: [projects.id],
  }),
  worker: one(workers, {
    fields: [assignments.workerId],
    references: [workers.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [categories.orgId],
    references: [organizations.id],
  }),
  requestItems: many(requestItems),
}));

export const requestsRelations = relations(requests, ({ one, many }) => ({
  project: one(projects, {
    fields: [requests.projectId],
    references: [projects.id],
  }),
  worker: one(workers, {
    fields: [requests.workerId],
    references: [workers.id],
  }),
  items: many(requestItems),
}));

export const requestItemsRelations = relations(requestItems, ({ one }) => ({
  request: one(requests, {
    fields: [requestItems.requestId],
    references: [requests.id],
  }),
  category: one(categories, {
    fields: [requestItems.categoryId],
    references: [categories.id],
  }),
}));

export const outreachLogRelations = relations(outreachLog, ({ one }) => ({
  organization: one(organizations, {
    fields: [outreachLog.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [outreachLog.projectId],
    references: [projects.id],
  }),
  worker: one(workers, {
    fields: [outreachLog.workerId],
    references: [workers.id],
  }),
}));
