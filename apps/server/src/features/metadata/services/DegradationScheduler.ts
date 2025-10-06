/**
 * Degradation Scheduler - Manages automatic cleanup jobs
 */

import { TagDegradationService, type DegradationConfig, type DegradationStats } from './TagDegradationService.js';
import type { DatabaseManager } from '../../storage/DatabaseManager.js';
import { logger } from '../../../shared/logger.js';

export interface SchedulerConfig {
  enabled: boolean;
  intervalHours: number;
  runOnStartup: boolean;
  maxRetries: number;
  retryDelayMinutes: number;
}

export interface SchedulerStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRun?: Date;
  lastSuccess?: Date;
  nextScheduledRun?: Date;
  averageRunTime: number;
}

export class DegradationScheduler {
  private degradationService: TagDegradationService;
  private config: SchedulerConfig;
  private timer: NodeJS.Timeout | null = null;
  private pendingTimeouts: Set<NodeJS.Timeout> = new Set();
  private stats: SchedulerStats;
  private isRunning = false;

  constructor(
    dbManager: DatabaseManager, 
    schedulerConfig: Partial<SchedulerConfig> = {},
    degradationConfig: Partial<DegradationConfig> = {}
  ) {
    this.degradationService = new TagDegradationService(dbManager, degradationConfig);
    this.config = {
      enabled: true,
      intervalHours: 24,        // Run daily by default
      runOnStartup: false,      // Don't run immediately on startup
      maxRetries: 3,
      retryDelayMinutes: 60,    // Wait 1 hour between retries
      ...schedulerConfig
    };

    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      averageRunTime: 0
    };
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.timer) {
      logger.info('⏰ Degradation scheduler already running');
      return;
    }

    if (!this.config.enabled) {
      logger.info('⏰ Degradation scheduler disabled');
      return;
    }

    logger.info(`⏰ Starting degradation scheduler (every ${this.config.intervalHours}h)`);

    // Run immediately on startup if configured
    if (this.config.runOnStartup) {
      // Don't use setTimeout - just run it directly or not at all
      logger.info('⏰ Skipping startup run - use runNow() if needed');
    }

    // Schedule periodic runs
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    this.timer = setInterval(() => this.runWithRetry(), intervalMs);

    // Calculate next run time
    this.stats.nextScheduledRun = new Date(Date.now() + intervalMs);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('⏰ Degradation scheduler stopped');
    }
  }

  /**
   * Run degradation manually
   */
  async runNow(): Promise<DegradationStats> {
    if (this.isRunning) {
      throw new Error('Degradation cleanup already in progress');
    }

    return this.runDegradation();
  }

  /**
   * Get scheduler statistics
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart if interval changed
    if (this.timer && newConfig.intervalHours) {
      this.stop();
      this.start();
    }
  }

  /**
   * Run degradation with retry logic
   */
  private async runWithRetry(retryCount = 0): Promise<void> {
    try {
      await this.runDegradation();
    } catch (error) {
      logger.error(`❌ Degradation run failed (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < this.config.maxRetries) {
        logger.warn(`❌ Degradation failed. Retry ${retryCount + 1}/${this.config.maxRetries} on next scheduled run`);
        this.stats.failedRuns++;
        // Don't use setTimeout for retries - just wait for next scheduled run
      } else {
        logger.error(`❌ Degradation failed after ${this.config.maxRetries} attempts`);
        this.stats.failedRuns++;
      }
    }
  }

  /**
   * Execute degradation cleanup
   */
  private async runDegradation(): Promise<DegradationStats> {
    if (this.isRunning) {
      throw new Error('Degradation already running');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('🧹 Starting scheduled degradation cleanup...');
      
      const result = await this.degradationService.runDegradation();
      
      // Update statistics
      this.stats.totalRuns++;
      this.stats.successfulRuns++;
      this.stats.lastRun = new Date();
      this.stats.lastSuccess = new Date();
      
      const runTime = Date.now() - startTime;
      this.stats.averageRunTime = 
        (this.stats.averageRunTime * (this.stats.totalRuns - 1) + runTime) / this.stats.totalRuns;

      // Schedule next run
      const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
      this.stats.nextScheduledRun = new Date(Date.now() + intervalMs);

      logger.info(`✅ Scheduled degradation completed in ${runTime}ms`);
      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if cleanup is needed based on heuristics
   */
  async shouldRunCleanup(): Promise<boolean> {
    try {
      // Simple heuristic: run if last run was more than interval ago
      if (!this.stats.lastSuccess) {
        return true;
      }

      const hoursSinceLastRun = 
        (Date.now() - this.stats.lastSuccess.getTime()) / (1000 * 60 * 60);
      
      return hoursSinceLastRun >= this.config.intervalHours;

    } catch (error) {
      logger.warn('Error checking if cleanup needed:', error);
      return false;
    }
  }

  /**
   * Get health status of the scheduler
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    details: any;
  } {
    const now = Date.now();
    const stats = this.getStats();

    // Check if scheduler is running when it should be
    if (this.config.enabled && !this.timer) {
      return {
        status: 'error',
        message: 'Scheduler is enabled but not running',
        details: { config: this.config, stats }
      };
    }

    // Check for recent failures
    const failureRate = stats.totalRuns > 0 ? stats.failedRuns / stats.totalRuns : 0;
    if (failureRate > 0.2) { // More than 20% failure rate
      return {
        status: 'warning',
        message: `High failure rate: ${(failureRate * 100).toFixed(1)}%`,
        details: { failureRate, stats }
      };
    }

    // Check if overdue for cleanup
    if (stats.lastSuccess) {
      const hoursSinceLastSuccess = (now - stats.lastSuccess.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSuccess > this.config.intervalHours * 2) {
        return {
          status: 'warning',
          message: `Cleanup overdue by ${(hoursSinceLastSuccess - this.config.intervalHours).toFixed(1)} hours`,
          details: { hoursSinceLastSuccess, stats }
        };
      }
    }

    return {
      status: 'healthy',
      message: 'Scheduler running normally',
      details: { stats }
    };
  }
}
