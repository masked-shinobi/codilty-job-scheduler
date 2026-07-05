import { calculateQueueHealth } from '../../packages/shared/src/health';

describe('calculateQueueHealth', () => {
  describe('HEALTHY', () => {
    it('should return HEALTHY when success rate >= 90% and backlog < 50', () => {
      expect(calculateQueueHealth(100, 0)).toBe('HEALTHY');
      expect(calculateQueueHealth(95, 10)).toBe('HEALTHY');
      expect(calculateQueueHealth(90, 49)).toBe('HEALTHY');
      expect(calculateQueueHealth(100, 49)).toBe('HEALTHY');
    });

    it('should return HEALTHY when no jobs have run (100% default)', () => {
      expect(calculateQueueHealth(100, 0)).toBe('HEALTHY');
    });
  });

  describe('DEGRADED', () => {
    it('should return DEGRADED when success rate is between 70-90%', () => {
      expect(calculateQueueHealth(89, 0)).toBe('DEGRADED');
      expect(calculateQueueHealth(80, 10)).toBe('DEGRADED');
      expect(calculateQueueHealth(70, 0)).toBe('DEGRADED');
    });

    it('should return DEGRADED when backlog is between 50-200', () => {
      expect(calculateQueueHealth(95, 50)).toBe('DEGRADED');
      expect(calculateQueueHealth(100, 100)).toBe('DEGRADED');
      expect(calculateQueueHealth(95, 200)).toBe('DEGRADED');
    });

    it('should return DEGRADED when both conditions are borderline', () => {
      expect(calculateQueueHealth(85, 100)).toBe('DEGRADED');
    });
  });

  describe('UNHEALTHY', () => {
    it('should return UNHEALTHY when success rate < 70%', () => {
      expect(calculateQueueHealth(69, 0)).toBe('UNHEALTHY');
      expect(calculateQueueHealth(50, 10)).toBe('UNHEALTHY');
      expect(calculateQueueHealth(0, 0)).toBe('UNHEALTHY');
    });

    it('should return UNHEALTHY when backlog > 200', () => {
      expect(calculateQueueHealth(100, 201)).toBe('UNHEALTHY');
      expect(calculateQueueHealth(95, 500)).toBe('UNHEALTHY');
    });

    it('should return UNHEALTHY when both conditions are bad', () => {
      expect(calculateQueueHealth(50, 300)).toBe('UNHEALTHY');
    });

    it('UNHEALTHY takes priority over DEGRADED', () => {
      // Success rate < 70% even though backlog is fine
      expect(calculateQueueHealth(60, 10)).toBe('UNHEALTHY');
      // Backlog > 200 even though success rate is fine
      expect(calculateQueueHealth(95, 250)).toBe('UNHEALTHY');
    });
  });

  describe('boundary conditions', () => {
    it('should handle exact boundaries correctly', () => {
      // Exactly 90% and exactly 49 backlog = HEALTHY
      expect(calculateQueueHealth(90, 49)).toBe('HEALTHY');
      // Exactly 90% and exactly 50 backlog = DEGRADED (backlog >= 50)
      expect(calculateQueueHealth(90, 50)).toBe('DEGRADED');
      // Exactly 70% and 0 backlog = DEGRADED (success rate < 90%)
      expect(calculateQueueHealth(70, 0)).toBe('DEGRADED');
      // Exactly 69.9% = UNHEALTHY
      expect(calculateQueueHealth(69.9, 0)).toBe('UNHEALTHY');
    });
  });
});
