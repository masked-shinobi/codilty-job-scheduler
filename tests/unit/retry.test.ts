import { calculateRetryDelay } from '../../packages/shared/src/retry';
import { RetryStrategy } from '../../packages/shared/src/types';

describe('calculateRetryDelay', () => {
  describe('FIXED strategy', () => {
    it('should return baseDelayMs regardless of attempt count', () => {
      expect(calculateRetryDelay(RetryStrategy.FIXED, 1000, 1)).toBe(1000);
      expect(calculateRetryDelay(RetryStrategy.FIXED, 1000, 2)).toBe(1000);
      expect(calculateRetryDelay(RetryStrategy.FIXED, 1000, 5)).toBe(1000);
      expect(calculateRetryDelay(RetryStrategy.FIXED, 1000, 100)).toBe(1000);
    });

    it('should respect maxDelayMs cap', () => {
      expect(calculateRetryDelay(RetryStrategy.FIXED, 5000, 1, 3000)).toBe(3000);
    });

    it('should not cap when maxDelayMs is null', () => {
      expect(calculateRetryDelay(RetryStrategy.FIXED, 5000, 1, null)).toBe(5000);
    });
  });

  describe('LINEAR strategy', () => {
    it('should return baseDelayMs * attemptCount', () => {
      expect(calculateRetryDelay(RetryStrategy.LINEAR, 1000, 1)).toBe(1000);
      expect(calculateRetryDelay(RetryStrategy.LINEAR, 1000, 2)).toBe(2000);
      expect(calculateRetryDelay(RetryStrategy.LINEAR, 1000, 3)).toBe(3000);
      expect(calculateRetryDelay(RetryStrategy.LINEAR, 500, 5)).toBe(2500);
    });

    it('should respect maxDelayMs cap', () => {
      expect(calculateRetryDelay(RetryStrategy.LINEAR, 1000, 10, 5000)).toBe(5000);
    });

    it('should not cap when delay is under maxDelayMs', () => {
      expect(calculateRetryDelay(RetryStrategy.LINEAR, 1000, 3, 5000)).toBe(3000);
    });
  });

  describe('EXPONENTIAL strategy', () => {
    it('should return baseDelayMs * 2^attemptCount', () => {
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 1000, 1)).toBe(2000);   // 1000 * 2^1
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 1000, 2)).toBe(4000);   // 1000 * 2^2
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 1000, 3)).toBe(8000);   // 1000 * 2^3
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 1000, 4)).toBe(16000);  // 1000 * 2^4
    });

    it('should respect maxDelayMs cap', () => {
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 1000, 10, 60000)).toBe(60000);
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 1000, 5, 30000)).toBe(30000);
    });

    it('should not cap when delay is under maxDelayMs', () => {
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 1000, 2, 60000)).toBe(4000);
    });

    it('should handle large attempt numbers with cap', () => {
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 1000, 20, 60000)).toBe(60000);
    });
  });

  describe('edge cases', () => {
    it('should handle attemptCount of 0', () => {
      expect(calculateRetryDelay(RetryStrategy.LINEAR, 1000, 0)).toBe(0);
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 1000, 0)).toBe(1000); // 1000 * 2^0 = 1000
    });

    it('should handle very small baseDelayMs', () => {
      expect(calculateRetryDelay(RetryStrategy.FIXED, 100, 1)).toBe(100);
      expect(calculateRetryDelay(RetryStrategy.LINEAR, 100, 5)).toBe(500);
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 100, 3)).toBe(800);
    });

    it('should handle maxDelayMs of 0 (no cap applied because condition checks > 0)', () => {
      // maxDelayMs = 0 means no cap (the condition checks > 0)
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 1000, 5, 0)).toBe(32000);
    });
  });
});
