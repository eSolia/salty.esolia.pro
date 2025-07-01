/**
 * @fileoverview Enhanced structured logging system for Salty
 * @description Provides comprehensive logging with categories, levels, and monitoring hooks
 */

import { VERSION } from "./version.ts";

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SECURITY = 4,
  CRITICAL = 5,
}

/**
 * Log categories for better organization
 */
export enum LogCategory {
  SYSTEM = "SYSTEM",
  API = "API",
  AUTH = "AUTH",
  RATE_LIMIT = "RATE_LIMIT",
  CRYPTO = "CRYPTO",
  SECURITY = "SECURITY",
  PERFORMANCE = "PERFORMANCE",
  VALIDATION = "VALIDATION",
  HEALTH = "HEALTH",
}

/**
 * Structured log entry interface
 */
export interface LogEntry {
  /** Timestamp in ISO format */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Log level name */
  levelName: string;
  /** Log category */
  category: LogCategory;
  /** Primary log message */
  message: string;
  /** Additional structured data */
  data?: Record<string, any>;
  /** Request ID for tracing */
  requestId?: string;
  /** Client IP address */
  clientIP?: string;
  /** HTTP method and path */
  endpoint?: string;
  /** Response time in milliseconds */
  responseTime?: number;
  /** Application version */
  version: string;
  /** Error stack trace if applicable */
  stack?: string;
}

/**
 * Security event types for specialized logging
 */
export enum SecurityEvent {
  API_KEY_MISSING = "API_KEY_MISSING",
  API_KEY_INVALID = "API_KEY_INVALID",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  INVALID_REQUEST = "INVALID_REQUEST",
  CRYPTO_FAILURE = "CRYPTO_FAILURE",
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  MALFORMED_INPUT = "MALFORMED_INPUT",
  UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  CSP_VIOLATION = "CSP_VIOLATION",
  // New audit events
  ENCRYPTION_SUCCESS = "ENCRYPTION_SUCCESS",
  DECRYPTION_SUCCESS = "DECRYPTION_SUCCESS",
  DECRYPTION_FAILURE = "DECRYPTION_FAILURE",
  KEY_DERIVATION = "KEY_DERIVATION",
  PATTERN_VIOLATION = "PATTERN_VIOLATION",
  PATH_TRAVERSAL_ATTEMPT = "PATH_TRAVERSAL_ATTEMPT",
  SQL_INJECTION_ATTEMPT = "SQL_INJECTION_ATTEMPT",
  XSS_ATTEMPT = "XSS_ATTEMPT",
  AUDIT_LOG_ACCESS = "AUDIT_LOG_ACCESS",
}

/**
 * Performance metrics tracking
 */
interface PerformanceMetrics {
  /** Total requests processed */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average response time */
  averageResponseTime: number;
  /** Requests per endpoint */
  endpointStats: Map<string, number>;
  /** Security events count */
  securityEvents: Map<SecurityEvent, number>;
  /** Last reset time */
  resetTime: string;
}

/**
 * Security audit entry for compliance tracking
 */
export interface SecurityAuditEntry {
  /** Unique audit ID */
  auditId: string;
  /** Timestamp of the event */
  timestamp: string;
  /** Type of security event */
  eventType: SecurityEvent;
  /** User or client associated with event */
  actor: string;
  /** Resource being accessed */
  resource?: string;
  /** Action performed */
  action: string;
  /** Result of the action */
  result: "success" | "failure" | "blocked";
  /** Additional context */
  context?: Record<string, any>;
  /** Risk score (0-100) */
  riskScore?: number;
}

/**
 * Configuration for the logger
 */
interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Enable JSON formatting */
  jsonFormat: boolean;
  /** Enable console colors */
  enableColors: boolean;
  /** Include stack traces in errors */
  includeStackTrace: boolean;
  /** Performance metrics collection */
  collectMetrics: boolean;
  /** Webhook URL for critical alerts */
  webhookUrl?: string;
  /** Maximum log entries to keep in memory */
  maxLogEntries: number;
}

/**
 * Enhanced logger class with structured logging and monitoring
 */
export class Logger {
  private config: LoggerConfig;
  private requestCounter = 0;
  private recentLogs: LogEntry[] = [];
  private metrics: PerformanceMetrics;
  private securityAuditLog: SecurityAuditEntry[] = [];
  private auditCounter = 0;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: LogLevel.INFO,
      jsonFormat: true,
      enableColors: false,
      includeStackTrace: true,
      collectMetrics: true,
      maxLogEntries: 1000,
      ...config,
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      endpointStats: new Map(),
      securityEvents: new Map(),
      resetTime: new Date().toISOString(),
    };
  }

  /**
   * Generate a unique request ID
   */
  generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`;
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, any>,
    error?: Error,
  ): void {
    if (level < this.config.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LogLevel[level],
      category,
      message,
      data,
      version: VERSION,
      stack: error?.stack && this.config.includeStackTrace
        ? error.stack
        : undefined,
    };

    // Add to recent logs
    this.recentLogs.push(entry);
    if (this.recentLogs.length > this.config.maxLogEntries) {
      this.recentLogs.shift();
    }

    // Output the log
    this.output(entry);

    // Send webhook for critical events
    if (level >= LogLevel.CRITICAL && this.config.webhookUrl) {
      this.sendWebhook(entry);
    }
  }

  /**
   * Output log entry to console
   */
  private output(entry: LogEntry): void {
    if (this.config.jsonFormat) {
      console.log(JSON.stringify(entry));
    } else {
      const color = this.getLogColor(entry.level);
      const prefix = this.config.enableColors ? color : "";
      const suffix = this.config.enableColors ? "\x1b[0m" : "";

      console.log(
        `${prefix}[${entry.timestamp}] ${entry.levelName} [${entry.category}] ${entry.message}${suffix}`,
        entry.data ? JSON.stringify(entry.data) : "",
      );
    }
  }

  /**
   * Get ANSI color code for log level
   */
  private getLogColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return "\x1b[36m"; // Cyan
      case LogLevel.INFO:
        return "\x1b[32m"; // Green
      case LogLevel.WARN:
        return "\x1b[33m"; // Yellow
      case LogLevel.ERROR:
        return "\x1b[31m"; // Red
      case LogLevel.SECURITY:
        return "\x1b[35m"; // Magenta
      case LogLevel.CRITICAL:
        return "\x1b[41m"; // Red background
      default:
        return "";
    }
  }

  /**
   * Send webhook notification for critical events
   */
  private async sendWebhook(entry: LogEntry): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 Salty Critical Alert`,
          attachments: [{
            color: "danger",
            fields: [
              { title: "Level", value: entry.levelName, short: true },
              { title: "Category", value: entry.category, short: true },
              { title: "Message", value: entry.message, short: false },
              { title: "Timestamp", value: entry.timestamp, short: true },
              { title: "Version", value: entry.version, short: true },
            ],
          }],
        }),
      });
    } catch (error) {
      console.error("Failed to send webhook:", error);
    }
  }

  /**
   * Log debug information
   */
  debug(
    message: string,
    data?: Record<string, any>,
    category = LogCategory.SYSTEM,
  ): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  /**
   * Log general information
   */
  info(
    message: string,
    data?: Record<string, any>,
    category = LogCategory.SYSTEM,
  ): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  /**
   * Log warnings
   */
  warn(
    message: string,
    data?: Record<string, any>,
    category = LogCategory.SYSTEM,
  ): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  /**
   * Log errors
   */
  error(
    message: string,
    error?: Error,
    data?: Record<string, any>,
    category = LogCategory.SYSTEM,
  ): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  /**
   * Log security events
   */
  security(
    event: SecurityEvent,
    message: string,
    data?: Record<string, any>,
  ): void {
    const enhancedData = {
      securityEvent: event,
      ...data,
    };

    this.log(LogLevel.SECURITY, LogCategory.SECURITY, message, enhancedData);

    // Track security event metrics
    if (this.config.collectMetrics) {
      const count = this.metrics.securityEvents.get(event) || 0;
      this.metrics.securityEvents.set(event, count + 1);
    }
  }

  /**
   * Log critical system events
   */
  critical(
    message: string,
    data?: Record<string, any>,
    category = LogCategory.SYSTEM,
  ): void {
    this.log(LogLevel.CRITICAL, category, message, data);
  }

  /**
   * Log API request with performance tracking
   */
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    clientIP: string,
    requestId: string,
    data?: Record<string, any>,
  ): void {
    const endpoint = `${method} ${path}`;
    const isSuccess = statusCode >= 200 && statusCode < 400;

    const logData = {
      method,
      path,
      statusCode,
      responseTime,
      clientIP,
      requestId,
      success: isSuccess,
      ...data,
    };

    // Update metrics
    if (this.config.collectMetrics) {
      this.metrics.totalRequests++;
      if (isSuccess) {
        this.metrics.successfulRequests++;
      } else {
        this.metrics.failedRequests++;
      }

      // Update average response time
      const total = this.metrics.totalRequests;
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * (total - 1) + responseTime) / total;

      // Track endpoint usage
      const endpointCount = this.metrics.endpointStats.get(endpoint) || 0;
      this.metrics.endpointStats.set(endpoint, endpointCount + 1);
    }

    const level = isSuccess ? LogLevel.INFO : LogLevel.WARN;
    const message = `${method} ${path} - ${statusCode} (${responseTime}ms)`;

    this.log(level, LogCategory.API, message, logData);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics & { uptime: number } {
    return {
      ...this.metrics,
      uptime: Math.floor(performance.now() / 1000),
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      endpointStats: new Map(),
      securityEvents: new Map(),
      resetTime: new Date().toISOString(),
    };
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(limit = 100): LogEntry[] {
    return this.recentLogs.slice(-limit);
  }

  /**
   * Get security event summary
   */
  getSecuritySummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const [event, count] of this.metrics.securityEvents.entries()) {
      summary[event] = count;
    }
    return summary;
  }

  /**
   * Check for suspicious activity patterns
   */
  detectSuspiciousActivity(clientIP: string): boolean {
    const recentLogs = this.recentLogs
      .filter((log) =>
        log.clientIP === clientIP &&
        log.level >= LogLevel.WARN &&
        Date.now() - new Date(log.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
      );

    // Suspicious if more than 10 warnings/errors in 5 minutes
    if (recentLogs.length > 10) {
      this.security(
        SecurityEvent.SUSPICIOUS_ACTIVITY,
        `Suspicious activity detected from IP: ${clientIP}`,
        {
          recentWarnings: recentLogs.length,
          timeWindow: "5 minutes",
        },
      );
      return true;
    }

    return false;
  }

  /**
   * Create a security audit entry
   */
  audit(
    eventType: SecurityEvent,
    actor: string,
    action: string,
    result: "success" | "failure" | "blocked",
    context?: Record<string, any>,
  ): void {
    const auditEntry: SecurityAuditEntry = {
      auditId: `audit_${++this.auditCounter}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType,
      actor,
      action,
      result,
      context,
      riskScore: this.calculateRiskScore(eventType, result),
    };

    // Add to audit log
    this.securityAuditLog.push(auditEntry);
    if (this.securityAuditLog.length > this.config.maxLogEntries) {
      this.securityAuditLog.shift();
    }

    // Also log as security event for real-time monitoring
    this.security(
      eventType,
      `Security audit: ${action}`,
      {
        auditId: auditEntry.auditId,
        actor,
        result,
        riskScore: auditEntry.riskScore,
        ...context,
      },
    );
  }

  /**
   * Calculate risk score based on event type and result
   */
  private calculateRiskScore(
    eventType: SecurityEvent,
    result: "success" | "failure" | "blocked",
  ): number {
    // Base scores by event type
    const baseScores: Partial<Record<SecurityEvent, number>> = {
      [SecurityEvent.PATH_TRAVERSAL_ATTEMPT]: 90,
      [SecurityEvent.SQL_INJECTION_ATTEMPT]: 95,
      [SecurityEvent.XSS_ATTEMPT]: 85,
      [SecurityEvent.UNAUTHORIZED_ACCESS]: 80,
      [SecurityEvent.API_KEY_INVALID]: 70,
      [SecurityEvent.CRYPTO_FAILURE]: 75,
      [SecurityEvent.MALFORMED_INPUT]: 60,
      [SecurityEvent.SUSPICIOUS_ACTIVITY]: 85,
      [SecurityEvent.CSP_VIOLATION]: 50,
      [SecurityEvent.RATE_LIMIT_EXCEEDED]: 40,
    };

    let score = baseScores[eventType] || 30;

    // Adjust based on result
    if (result === "blocked") {
      score = Math.max(score - 20, 0);
    } else if (result === "failure") {
      score = Math.min(score + 10, 100);
    }

    return score;
  }

  /**
   * Get security audit trail
   */
  getAuditTrail(
    filter?: {
      eventType?: SecurityEvent;
      actor?: string;
      startTime?: Date;
      endTime?: Date;
      minRiskScore?: number;
    },
  ): SecurityAuditEntry[] {
    let entries = [...this.securityAuditLog];

    if (filter) {
      if (filter.eventType) {
        entries = entries.filter((e) => e.eventType === filter.eventType);
      }
      if (filter.actor) {
        entries = entries.filter((e) => e.actor === filter.actor);
      }
      if (filter.startTime) {
        entries = entries.filter(
          (e) => new Date(e.timestamp) >= filter.startTime!,
        );
      }
      if (filter.endTime) {
        entries = entries.filter(
          (e) => new Date(e.timestamp) <= filter.endTime!,
        );
      }
      if (filter.minRiskScore !== undefined) {
        entries = entries.filter(
          (e) => (e.riskScore || 0) >= filter.minRiskScore!,
        );
      }
    }

    // Log audit trail access
    this.audit(
      SecurityEvent.AUDIT_LOG_ACCESS,
      "system",
      "Audit trail accessed",
      "success",
      { filterCriteria: filter },
    );

    return entries;
  }

  /**
   * Get security audit summary
   */
  getAuditSummary(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByResult: Record<string, number>;
    highRiskEvents: number;
    averageRiskScore: number;
  } {
    const summary = {
      totalEvents: this.securityAuditLog.length,
      eventsByType: {} as Record<string, number>,
      eventsByResult: {
        success: 0,
        failure: 0,
        blocked: 0,
      },
      highRiskEvents: 0,
      averageRiskScore: 0,
    };

    let totalRiskScore = 0;

    for (const entry of this.securityAuditLog) {
      // Count by type
      summary.eventsByType[entry.eventType] =
        (summary.eventsByType[entry.eventType] || 0) + 1;

      // Count by result
      summary.eventsByResult[entry.result]++;

      // Count high risk (score >= 70)
      if ((entry.riskScore || 0) >= 70) {
        summary.highRiskEvents++;
      }

      totalRiskScore += entry.riskScore || 0;
    }

    summary.averageRiskScore =
      summary.totalEvents > 0 ? totalRiskScore / summary.totalEvents : 0;

    return summary;
  }

  /**
   * Export audit log for compliance
   */
  exportAuditLog(
    format: "json" | "csv" = "json",
  ): string {
    if (format === "csv") {
      const headers = [
        "auditId",
        "timestamp",
        "eventType",
        "actor",
        "action",
        "result",
        "riskScore",
        "context",
      ];
      const rows = this.securityAuditLog.map((entry) => [
        entry.auditId,
        entry.timestamp,
        entry.eventType,
        entry.actor,
        entry.action,
        entry.result,
        entry.riskScore?.toString() || "",
        JSON.stringify(entry.context || {}),
      ]);
      return [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");
    }

    return JSON.stringify(this.securityAuditLog, null, 2);
  }
}

/**
 * Create and export a default logger instance
 */
export const logger = new Logger({
  minLevel: Deno.env.get("LOG_LEVEL")
    ? LogLevel[Deno.env.get("LOG_LEVEL") as keyof typeof LogLevel]
    : LogLevel.INFO,
  jsonFormat: Deno.env.get("LOG_FORMAT") === "json",
  webhookUrl: Deno.env.get("WEBHOOK_URL"),
});
