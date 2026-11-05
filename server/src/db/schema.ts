/**
 * Database schema definitions using Drizzle ORM.
 * 
 * Tables:
 * - users: User accounts
 * - organizations: Teams/companies
 * - memberships: User-organization relationships
 * - devices: Managed devices
 * - device_identities: Cryptographic device identity
 * - device_groups: Logical device groupings
 * - sessions: User sessions
 * - connection_sessions: Remote connection sessions
 * - audit_events: Security audit trail
 * - automations: Automation workflow definitions
 * - automation_runs: Automation execution history
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'member', 'viewer']);
export const deviceStatusEnum = pgEnum('device_status', ['online', 'offline', 'revoked', 'pending']);
export const sessionTypeEnum = pgEnum('session_type', ['remote_desktop', 'terminal', 'file_transfer', 'ai_assistant']);
export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high', 'critical']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: userRoleEnum('role').notNull().default('owner'),
  emailVerified: boolean('email_verified').notNull().default(false),
  active: boolean('active').notNull().default(true),
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  mfaSecret: text('mfa_secret'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Organizations table
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  plan: varchar('plan', { length: 50 }).notNull().default('personal'),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Memberships (users <-> organizations)
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Devices table
export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: varchar('device_id', { length: 64 }).notNull().unique(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id),
  name: varchar('name', { length: 100 }).notNull(),
  publicKey: text('public_key').notNull(),
  osType: varchar('os_type', { length: 20 }).notNull(),
  osVersion: varchar('os_version', { length: 50 }).default(''),
  agentVersion: varchar('agent_version', { length: 20 }).default('0.1.0'),
  status: deviceStatusEnum('status').notNull().default('offline'),
  approved: boolean('approved').notNull().default(false),
  lastSeenAt: timestamp('last_seen_at'),
  lastMetricsAt: timestamp('last_metrics_at'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Device identities (key rotation support)
export const deviceIdentities = pgTable('device_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  keyType: varchar('key_type', { length: 20 }).notNull().default('ed25519'),
  active: boolean('active').notNull().default(true),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Device groups
export const deviceGroups = pgTable('device_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// User sessions (authentication)
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Connection sessions (remote access)
export const connectionSessions = pgTable('connection_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  deviceId: uuid('device_id').notNull().references(() => devices.id),
  type: sessionTypeEnum('type').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  duration: integer('duration'), // seconds
  metadata: jsonb('metadata').default({}),
});

// Audit events (immutable log)
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  actorId: uuid('actor_id'), // user or device
  actorType: varchar('actor_type', { length: 20 }).notNull(), // 'user' or 'device'
  targetType: varchar('target_type', { length: 50 }),
  targetId: uuid('target_id'),
  action: varchar('action', { length: 50 }).notNull(),
  result: varchar('result', { length: 20 }).notNull(), // 'success' or 'failure'
  details: jsonb('details').default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  sessionId: uuid('session_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Automations
export const automations = pgTable('automations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').default(''),
  triggerConfig: jsonb('trigger_config').notNull(),
  actions: jsonb('actions').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  lastRunAt: timestamp('last_run_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Automation runs
export const automationRuns = pgTable('automation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  automationId: uuid('automation_id').notNull().references(() => automations.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull(), // 'running', 'completed', 'failed'
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  result: jsonb('result').default({}),
  error: text('error'),
});

// Governed feature operations (requests are not executed until an agent executor is available)
export const featureOperations = pgTable('feature_operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  requesterId: uuid('requester_id').notNull().references(() => users.id),
  approverId: uuid('approver_id').references(() => users.id),
  featureKey: varchar('feature_key', { length: 64 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(),
  parameters: jsonb('parameters').notNull().default({}),
  reason: text('reason').notNull(),
  riskLevel: riskLevelEnum('risk_level').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('awaiting_approval'),
  requiresSecondApprover: boolean('requires_second_approver').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  devices: many(devices),
  sessions: many(sessions),
  memberships: many(memberships),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  owner: one(users, { fields: [devices.ownerId], references: [users.id] }),
  organization: one(organizations, { fields: [devices.organizationId], references: [organizations.id] }),
  identities: many(deviceIdentities),
  connectionSessions: many(connectionSessions),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(memberships),
  devices: many(devices),
  automations: many(automations),
}));
