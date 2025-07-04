/**
 * @fileoverview Coverage tracking utilities for Deno 2.4+
 * @description Tracks code coverage metrics when running with --coverage flag
 */

import { VERSION } from "./version.ts";

/**
 * Coverage metrics interface
 */
export interface CoverageMetrics {
  enabled: boolean;
  coverageDir?: string;
  functionsCovered: number;
  functionsTotal: number;
  linesCovered: number;
  linesTotal: number;
  branchesCovered: number;
  branchesTotal: number;
  lastUpdated: string;
}

/**
 * Tracks which endpoints have been hit during runtime
 */
export class EndpointCoverageTracker {
  private static instance: EndpointCoverageTracker;
  private endpointsHit: Map<string, number> = new Map();
  private functionsExecuted: Set<string> = new Set();
  private startTime: number = Date.now();

  private constructor() {}

  static getInstance(): EndpointCoverageTracker {
    if (!EndpointCoverageTracker.instance) {
      EndpointCoverageTracker.instance = new EndpointCoverageTracker();
    }
    return EndpointCoverageTracker.instance;
  }

  /**
   * Track an endpoint being hit
   */
  trackEndpoint(method: string, path: string): void {
    const key = `${method} ${path}`;
    const count = this.endpointsHit.get(key) || 0;
    this.endpointsHit.set(key, count + 1);
  }

  /**
   * Track a function being executed
   */
  trackFunction(functionName: string): void {
    this.functionsExecuted.add(functionName);
  }

  /**
   * Get endpoint coverage statistics
   */
  getEndpointCoverage(): Record<string, unknown> {
    const totalEndpoints = [
      "GET /",
      "GET /en/",
      "GET /health",
      "GET /api/health",
      "POST /api/encrypt",
      "POST /api/decrypt",
      "GET /salty.js",
      "GET /img/*",
    ];

    const coveredEndpoints = Array.from(this.endpointsHit.keys());
    const coverage = (coveredEndpoints.length / totalEndpoints.length) * 100;

    return {
      totalEndpoints: totalEndpoints.length,
      coveredEndpoints: coveredEndpoints.length,
      coveragePercentage: Math.round(coverage),
      endpointsHit: Object.fromEntries(this.endpointsHit),
      uncoveredEndpoints: totalEndpoints.filter(
        (endpoint) =>
          !coveredEndpoints.some((covered) =>
            covered.includes(endpoint.split(" ")[1])
          ),
      ),
    };
  }

  /**
   * Get function coverage statistics
   */
  getFunctionCoverage(): Record<string, unknown> {
    // These are the main functions we track
    const trackedFunctions = [
      "salty_encrypt",
      "salty_decrypt",
      "salty_derive_key",
      "validateEnvironment",
      "handleRequest",
      "handleEncrypt",
      "handleDecrypt",
      "validateApiKey",
      "checkRateLimit",
      "handleCORS",
    ];

    const coverage = (this.functionsExecuted.size / trackedFunctions.length) *
      100;

    return {
      totalFunctions: trackedFunctions.length,
      executedFunctions: this.functionsExecuted.size,
      coveragePercentage: Math.round(coverage),
      functionsExecuted: Array.from(this.functionsExecuted),
      unexecutedFunctions: trackedFunctions.filter(
        (fn) => !this.functionsExecuted.has(fn),
      ),
    };
  }

  /**
   * Get overall coverage metrics
   */
  getCoverageMetrics(): CoverageMetrics {
    const endpointCoverage = this.getEndpointCoverage();
    const functionCoverage = this.getFunctionCoverage();

    // Check if running with coverage flag
    const coverageEnabled = Deno.env.get("DENO_COVERAGE_DIR") !== undefined ||
      Deno.args.some((arg) => arg.startsWith("--coverage"));

    return {
      enabled: coverageEnabled,
      coverageDir: Deno.env.get("DENO_COVERAGE_DIR"),
      functionsCovered: functionCoverage.executedFunctions as number,
      functionsTotal: functionCoverage.totalFunctions as number,
      // For lines and branches, we'll use endpoint coverage as a proxy
      // Real line coverage would require parsing V8 coverage data
      linesCovered: endpointCoverage.coveredEndpoints as number,
      linesTotal: endpointCoverage.totalEndpoints as number,
      branchesCovered: endpointCoverage.coveredEndpoints as number,
      branchesTotal: endpointCoverage.totalEndpoints as number,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get runtime coverage summary
   */
  getRuntimeCoverage(): Record<string, unknown> {
    const uptime = Math.round((Date.now() - this.startTime) / 1000);
    const endpointCoverage = this.getEndpointCoverage();
    const functionCoverage = this.getFunctionCoverage();

    return {
      version: VERSION,
      uptime: `${uptime}s`,
      coverage: {
        endpoints: endpointCoverage,
        functions: functionCoverage,
        overall: {
          percentage: Math.round(
            ((endpointCoverage.coveragePercentage as number) +
              (functionCoverage.coveragePercentage as number)) / 2,
          ),
        },
      },
      coverageEnabled: this.getCoverageMetrics().enabled,
      tip:
        "Run with 'deno run --coverage=coverage_dir' to generate detailed coverage reports",
    };
  }

  /**
   * Reset coverage tracking
   */
  reset(): void {
    this.endpointsHit.clear();
    this.functionsExecuted.clear();
    this.startTime = Date.now();
  }
}

/**
 * Export singleton instance
 */
export const coverageTracker = EndpointCoverageTracker.getInstance();

/**
 * Helper decorator to track function execution
 */
export function trackCoverage(functionName: string) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      coverageTracker.trackFunction(functionName);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
