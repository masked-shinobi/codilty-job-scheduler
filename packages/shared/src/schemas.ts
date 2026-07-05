import { z } from 'zod';

// ─── Pagination & Filters ───────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const JobFilterSchema = z.object({
  status: z.string().optional(),
  queueId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  type: z.string().optional(),
});

// ─── Organization ───────────────────────────────────────────────────────────────

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// ─── Project ────────────────────────────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  orgId: z.string().uuid(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// ─── Queue ──────────────────────────────────────────────────────────────────────

export const CreateQueueSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  priority: z.number().int().default(0),
  concurrencyLimit: z.number().int().min(1).default(5),
});

export const UpdateQueueSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  priority: z.number().int().optional(),
  concurrencyLimit: z.number().int().min(1).optional(),
});

// ─── Retry Policy ───────────────────────────────────────────────────────────────

export const RetryPolicySchema = z.object({
  strategy: z.enum(['FIXED', 'LINEAR', 'EXPONENTIAL']).default('EXPONENTIAL'),
  baseDelayMs: z.number().int().min(100).default(1000),
  maxRetries: z.number().int().min(0).default(3),
  maxDelayMs: z.number().int().min(100).nullable().optional(),
});

// ─── Job Creation (discriminated union by type) ─────────────────────────────────

const BaseJobFields = {
  queueId: z.string().uuid(),
  type: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  priority: z.number().int().default(0),
  maxAttempts: z.number().int().min(1).default(3),
};

export const CreateImmediateJobSchema = z.object({
  ...BaseJobFields,
  jobType: z.literal('immediate'),
});

export const CreateDelayedJobSchema = z.object({
  ...BaseJobFields,
  jobType: z.literal('delayed'),
  delayMs: z.number().int().min(1),
});

export const CreateScheduledJobSchema = z.object({
  ...BaseJobFields,
  jobType: z.literal('scheduled'),
  runAt: z.string().datetime(),
});

export const CreateRecurringJobSchema = z.object({
  queueId: z.string().uuid(),
  projectId: z.string().uuid(),
  type: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  maxAttempts: z.number().int().min(1).default(3),
  jobType: z.literal('recurring'),
  cronExpr: z.string().min(1),
});

export const CreateBatchJobSchema = z.object({
  jobType: z.literal('batch'),
  jobs: z.array(
    z.object({
      queueId: z.string().uuid(),
      type: z.string().min(1),
      payload: z.record(z.unknown()).default({}),
      priority: z.number().int().default(0),
      maxAttempts: z.number().int().min(1).default(3),
    })
  ).min(1).max(100),
});

export const CreateJobSchema = z.discriminatedUnion('jobType', [
  CreateImmediateJobSchema,
  CreateDelayedJobSchema,
  CreateScheduledJobSchema,
  CreateRecurringJobSchema,
  CreateBatchJobSchema,
]);

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

// ─── OrgMember ──────────────────────────────────────────────────────────────────

export const AddOrgMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

export const UpdateOrgMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

// ─── Heartbeat (internal) ───────────────────────────────────────────────────────

export const HeartbeatSchema = z.object({
  workerId: z.string().uuid(),
  status: z.enum(['IDLE', 'BUSY']),
  currentJobId: z.string().uuid().nullable().optional(),
});

// ─── ScheduledJob ───────────────────────────────────────────────────────────────

export const CreateScheduledJobDefSchema = z.object({
  projectId: z.string().uuid(),
  queueId: z.string().uuid(),
  cronExpr: z.string().min(1),
  jobTemplate: z.object({
    type: z.string().min(1),
    payload: z.record(z.unknown()).default({}),
    maxAttempts: z.number().int().min(1).default(3),
  }),
});
