const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || '';

let intervalId: NodeJS.Timeout | null = null;

/**
 * Send a heartbeat to the API server.
 * Includes worker ID, current status, and the ID of the currently executing job.
 */
export async function sendHeartbeat(
  workerId: string,
  status: 'IDLE' | 'BUSY',
  currentJobId: string | null
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/internal/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': INTERNAL_API_TOKEN,
      },
      body: JSON.stringify({
        workerId,
        status,
        currentJobId,
      }),
    });

    if (!response.ok) {
      console.warn(`[Heartbeat] Failed with status ${response.status}`);
    }
  } catch (error) {
    console.warn(`[Heartbeat] Error:`, (error as Error).message);
  }
}

/**
 * Start the heartbeat loop.
 * @param getState Function that returns the current worker state
 */
export function startHeartbeat(
  workerId: string,
  intervalMs: number,
  getState: () => { status: 'IDLE' | 'BUSY'; currentJobId: string | null }
): void {
  console.log(`[Heartbeat] Starting (interval: ${intervalMs}ms)`);

  intervalId = setInterval(() => {
    const state = getState();
    sendHeartbeat(workerId, state.status, state.currentJobId);
  }, intervalMs);

  // Send initial heartbeat immediately
  const state = getState();
  sendHeartbeat(workerId, state.status, state.currentJobId);
}

/**
 * Stop the heartbeat loop.
 */
export function stopHeartbeat(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Heartbeat] Stopped');
  }
}
