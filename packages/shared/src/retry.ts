import { RetryStrategy } from './types';

/**
 * Calculate the retry delay in milliseconds for a given strategy and attempt number.
 *
 * - FIXED:       delay = baseDelayMs
 * - LINEAR:      delay = baseDelayMs * attemptCount
 * - EXPONENTIAL: delay = baseDelayMs * 2^attemptCount, capped at maxDelayMs
 *
 * @param strategy    - The retry back-off strategy
 * @param baseDelayMs - Base delay in milliseconds
 * @param attemptCount - Current attempt number (1-indexed)
 * @param maxDelayMs  - Optional ceiling for delay (mainly for EXPONENTIAL)
 * @returns Delay in milliseconds before next retry
 */
export function calculateRetryDelay(
  strategy: RetryStrategy,
  baseDelayMs: number,
  attemptCount: number,
  maxDelayMs?: number | null
): number {
  let delay: number;

  switch (strategy) {
    case RetryStrategy.FIXED:
      delay = baseDelayMs;
      break;

    case RetryStrategy.LINEAR:
      delay = baseDelayMs * attemptCount;
      break;

    case RetryStrategy.EXPONENTIAL:
      delay = baseDelayMs * Math.pow(2, attemptCount);
      break;

    default:
      delay = baseDelayMs;
  }

  // Apply max delay cap if specified
  if (maxDelayMs != null && maxDelayMs > 0) {
    delay = Math.min(delay, maxDelayMs);
  }

  return delay;
}
