import { QueueHealth } from './types';

/**
 * Calculate queue health status based on success rate and backlog.
 *
 * - HEALTHY:   success rate ≥ 90% AND backlog < 50
 * - DEGRADED:  success rate 70–90% OR backlog 50–200
 * - UNHEALTHY: success rate < 70% OR backlog > 200
 *
 * @param successRate  - Success rate as a percentage (0–100)
 * @param backlog      - Number of QUEUED jobs currently waiting
 * @returns QueueHealth status
 */
export function calculateQueueHealth(
  successRate: number,
  backlog: number
): QueueHealth {
  // UNHEALTHY takes priority
  if (successRate < 70 || backlog > 200) {
    return 'UNHEALTHY';
  }

  // DEGRADED: success rate between 70-90% OR backlog between 50-200
  if (successRate < 90 || backlog >= 50) {
    return 'DEGRADED';
  }

  return 'HEALTHY';
}
