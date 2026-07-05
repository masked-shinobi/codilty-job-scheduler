import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import os from 'os';
import { claimJobsFromAllQueues } from './claim';
import { executeJob } from './executor';
import { startHeartbeat, stopHeartbeat, sendHeartbeat } from './heartbeat';

const prisma = new PrismaClient();

// ─── Configuration ──────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || '1000', 10);
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.WORKER_HEARTBEAT_INTERVAL_MS || '5000', 10);
const MAX_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY_PER_INSTANCE || '5', 10);
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || '';

// ─── Worker state ───────────────────────────────────────────────────────────────

let workerId: string | null = null;
let isShuttingDown = false;
let pollIntervalId: NodeJS.Timeout | null = null;
const runningJobs = new Map<string, Promise<void>>();

/**
 * Get the current worker state for heartbeats.
 */
function getWorkerState(): { status: 'IDLE' | 'BUSY'; currentJobId: string | null } {
  const jobIds = Array.from(runningJobs.keys());
  return {
    status: jobIds.length > 0 ? 'BUSY' : 'IDLE',
    currentJobId: jobIds[0] || null,
  };
}

/**
 * Register this worker instance with the API server.
 */
async function registerWorker(): Promise<string> {
  const hostname = os.hostname();
  const pid = process.pid;

  const response = await fetch(`${API_BASE_URL}/api/internal/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': INTERNAL_API_TOKEN,
    },
    body: JSON.stringify({ hostname, pid }),
  });

  if (!response.ok) {
    throw new Error(`Worker registration failed: ${response.status}`);
  }

  const data = (await response.json()) as { data: { id: string } };
  return data.data.id;
}

/**
 * Deregister this worker on shutdown.
 */
async function deregisterWorker(): Promise<void> {
  if (!workerId) return;

  try {
    await fetch(`${API_BASE_URL}/api/internal/deregister`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': INTERNAL_API_TOKEN,
      },
      body: JSON.stringify({ workerId }),
    });
  } catch (error) {
    console.warn('[Worker] Failed to deregister:', (error as Error).message);
  }
}

/**
 * Main polling loop: claims and executes jobs.
 */
async function poll(): Promise<void> {
  if (isShuttingDown || !workerId) return;

  try {
    const currentRunning = runningJobs.size;
    const jobs = await claimJobsFromAllQueues(workerId, MAX_CONCURRENCY, currentRunning);

    for (const job of jobs) {
      console.log(`📋 Claimed job ${job.id} (${job.type}) from queue ${job.queueId}`);

      // Execute job in the background (non-blocking)
      const execution = executeJob(job, workerId!)
        .catch((err) => {
          console.error(`  ❌ Unhandled error executing job ${job.id}:`, err);
        })
        .finally(() => {
          runningJobs.delete(job.id);
        });

      runningJobs.set(job.id, execution);
    }
  } catch (error) {
    console.error('[Worker] Polling error:', error);
  }
}

/**
 * Graceful shutdown handler.
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🔄 Received ${signal}. Shutting down gracefully...`);

  // Stop polling for new jobs
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }

  // Stop heartbeat
  stopHeartbeat();

  // Wait for in-flight jobs to finish (with timeout)
  if (runningJobs.size > 0) {
    console.log(`⏳ Waiting for ${runningJobs.size} in-flight job(s) to complete...`);

    const SHUTDOWN_TIMEOUT_MS = 30_000;
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_TIMEOUT_MS));
    const allJobs = Promise.all(Array.from(runningJobs.values()));

    await Promise.race([allJobs, timeout]);

    if (runningJobs.size > 0) {
      console.warn(`⚠️  ${runningJobs.size} job(s) did not finish within timeout`);
    }
  }

  // Deregister worker
  await deregisterWorker();

  // Disconnect Prisma
  await prisma.$disconnect();

  console.log('✅ Worker shutdown complete');
  process.exit(0);
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  console.log('\n🔧 Job Scheduler Worker starting...');
  console.log(`   Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`   Heartbeat interval: ${HEARTBEAT_INTERVAL_MS}ms`);
  console.log(`   Max concurrency: ${MAX_CONCURRENCY}`);
  console.log(`   API base URL: ${API_BASE_URL}\n`);

  try {
    // Register worker
    workerId = await registerWorker();
    console.log(`✅ Worker registered: ${workerId} (${os.hostname()}, PID: ${process.pid})\n`);

    // Start heartbeat
    startHeartbeat(workerId, HEARTBEAT_INTERVAL_MS, getWorkerState);

    // Start polling loop
    pollIntervalId = setInterval(poll, POLL_INTERVAL_MS);

    // Run first poll immediately
    await poll();

    console.log('🚀 Worker is running. Polling for jobs...\n');
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// ─── Signal handlers ────────────────────────────────────────────────────────────

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the worker
main();
